import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Payload = {
  item_id?: string;
  question_id?: string;
  user_answer?: string;
};

function normalizeText(value: string): string {
  return value.trim();
}

function validateAgainstRule(rule: { type: string; value: unknown } | null, userAnswer: string): boolean | null {
  if (!rule) return null;

  const value = rule.value;

  if (rule.type === "exact") {
    if (value === null || value === undefined) return null;
    return normalizeText(userAnswer) === normalizeText(String(value));
  }

  if (rule.type === "range") {
    if (!Array.isArray(value) || value.length < 2) return null;
    const min = Number((value as unknown[])[0]);
    const max = Number((value as unknown[])[1]);
    const num = Number(normalizeText(userAnswer).replace(",", "."));
    if (!Number.isFinite(min) || !Number.isFinite(max) || !Number.isFinite(num)) return null;
    return num >= min && num <= max;
  }

  if (rule.type === "regex") {
    if (typeof value !== "string") return null;
    try {
      return new RegExp(value).test(userAnswer);
    } catch {
      return null;
    }
  }

  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceKey);

    const payload = (await req.json()) as Payload;
    const itemId = payload.item_id?.trim();
    const questionId = payload.question_id?.trim();
    const userAnswer = payload.user_answer ?? "";

    if (!itemId || !questionId) {
      return new Response(JSON.stringify({ is_correct: null, feedback: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const { data: item, error: itemError } = await supabase
      .from("exam_training_items")
      .select("paper_id, source_exercise_id, item_type, questions")
      .eq("id", itemId)
      .maybeSingle();

    if (itemError) throw itemError;

    // Preferred source: backend/admin-only corrections.
    if (item?.paper_id) {
      // Training item question IDs use a "parent-child" format like "2-2a" or "4-4b",
      // while corrections may be stored with just the child part ("2a", "4b").
      // Build a list of candidates to try: exact first, then with the leading "{N}-" stripped.
      const qidCandidates: string[] = [questionId];
      const stripped = questionId.replace(/^\d+-/, "");
      if (stripped !== questionId) qidCandidates.push(stripped);

      let corr: { correct_answer: string; explanation_steps: unknown } | null = null;

      for (const qid of qidCandidates) {
        // Build the corrections query — filter by exercise when available to avoid
        // collisions when the same question_id (e.g. "1") exists in multiple exercises.
        let corrQuery = supabase
          .from("exam_question_corrections")
          .select("correct_answer, explanation_steps")
          .eq("exam_paper_id", item.paper_id)
          .eq("question_id", qid);

        if ((item as Record<string, unknown>).source_exercise_id) {
          corrQuery = corrQuery.eq("exercise_id", (item as Record<string, unknown>).source_exercise_id as string);
        }

        const { data: found, error: corrError } = await corrQuery
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (corrError) throw corrError;
        if (found?.correct_answer) {
          corr = found as { correct_answer: string; explanation_steps: unknown };
          break;
        }
      }

      if (corr?.correct_answer) {
        const corrAnswer = normalizeText(String(corr.correct_answer));

        // MCQ: correct_answer may be a letter (A/B/C/D) or a 0-based numeric index (0, 1, 2…)
        // while userAnswer is the actual choice text (e.g. "E_2 = (x + 2) × (x - 1)").
        // Translate letter/index back to the choice value using the question's choices array
        // so the comparison is apples-to-apples.
        let isCorrect: boolean;
        const isMcqLetter = /^[A-D]$/i.test(corrAnswer);
        // Numeric index (e.g. "1") only applies to multiple_choice items — for numeric/free
        // items the answer happens to be a number and should be compared as-is.
        const isMcqIndex = /^\d+$/.test(corrAnswer) &&
          (item as Record<string, unknown>).item_type === "multiple_choice";

        if (isMcqLetter || isMcqIndex) {
          const questions = Array.isArray(item.questions) ? (item.questions as unknown[]) : [];
          // Try matching on the original questionId and also the stripped version.
          const qMatch = questions.find(
            (q) =>
              typeof q === "object" &&
              q !== null &&
              (qidCandidates as string[]).includes((q as Record<string, unknown>).id as string),
          ) as Record<string, unknown> | undefined;
          const choices: string[] = Array.isArray(qMatch?.choices)
            ? (qMatch.choices as unknown[]).map(String)
            : [];
          const letterIndex = isMcqLetter
            ? corrAnswer.toUpperCase().charCodeAt(0) - 65 // A→0, B→1, C→2
            : Number(corrAnswer); // numeric index 0, 1, 2…
          const correctChoiceValue = choices[letterIndex];
          isCorrect =
            correctChoiceValue !== undefined
              ? normalizeText(userAnswer) === normalizeText(correctChoiceValue)
              : false;
        } else {
          isCorrect = normalizeText(userAnswer) === normalizeText(corrAnswer);
        }

        // Build human-readable feedback from explanation_steps
        const steps: string[] = Array.isArray(corr.explanation_steps)
          ? (corr.explanation_steps as unknown[]).map(String).filter((s) => s.trim().length > 0)
          : [];
        const explanationText = steps.length > 0 ? steps.join("\n") : null;

        let feedback: string;
        if (isCorrect) {
          feedback = explanationText
            ? `Bonne réponse !\n\n${explanationText}`
            : "Bonne réponse !";
        } else {
          feedback = "Ce n'est pas encore la bonne réponse. Regarde à nouveau l'énoncé, vérifie chaque étape, puis essaie une autre réponse.";
        }

        return new Response(JSON.stringify({ is_correct: isCorrect, feedback }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Fallback: validate against server-side rules in `exam_training_items.questions` if present.
    const questions = Array.isArray(item?.questions) ? (item?.questions as unknown[]) : [];
    const match = questions.find((q) => typeof q === "object" && q !== null && (q as any).id === questionId) as any;
    const rule = match?.validation && typeof match.validation === "object" ? (match.validation as any) : null;
    const isCorrect = validateAgainstRule(rule, userAnswer);

    return new Response(JSON.stringify({ is_correct: isCorrect, feedback: null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ is_correct: null, feedback: null, error: String(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
