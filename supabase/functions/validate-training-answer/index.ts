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
    const authHeader = req.headers.get("Authorization") ?? "";

    const supabase = createClient(supabaseUrl, serviceKey, {
      global: {
        headers: authHeader ? { Authorization: authHeader } : {},
      },
    });

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
      .select("paper_id, questions")
      .eq("id", itemId)
      .maybeSingle();

    if (itemError) throw itemError;

    // Preferred source: backend/admin-only corrections.
    if (item?.paper_id) {
      const { data: corr, error: corrError } = await supabase
        .from("exam_question_corrections")
        .select("correct_answer")
        .eq("exam_paper_id", item.paper_id)
        .eq("question_id", questionId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (corrError) throw corrError;

      if (corr?.correct_answer) {
        const isCorrect = normalizeText(userAnswer) === normalizeText(String(corr.correct_answer));
        return new Response(JSON.stringify({ is_correct: isCorrect, feedback: null }), {
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

