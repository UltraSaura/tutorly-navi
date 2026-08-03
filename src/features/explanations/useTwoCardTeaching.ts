import React from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/context/AdminContext";
import { toast } from "@/hooks/use-toast";
import { normalizeLearningStyle, type LearningStyle } from "@/types/learning-style";
import type { Step } from "./types";
import { getLearningMode } from "@/domain/learningMode";
import {
  analyzeExerciseProfile,
  countOperandDigits,
  detectOperationType as detectOperationTypeFromExpression,
  generateFallbackExampleWithDigits,
  generateProfileMatchedExample,
  type OperationType,
  validateExampleOperationType,
} from "@/utils/operationTypeDetector";

const ADAPTIVE_EXPLANATION_CACHE_VERSION = 6;

const ADAPTIVE_TWOCARD_PROMPT = `You are a patient math tutor. Your job is to TEACH the underlying mathematical concept, NOT to solve the student's exercise.

Learning Mode: {{learning_mode}} (If 'kid', use simpler language, more encouragement, and focus on visual/concrete examples).

Guidelines:
- NEVER use the numbers or data from the student's exercise.
- NEVER compute or state the final result of the student's exercise.
- Always start with the universal concept explanation. The learning style changes the support method and practice format, not the academic goal.
- If {{learning_mode}} is 'kid', use very simple words, shorter sentences, and a playful tone. Avoid technical jargon.
- Do not say "Because you are a visual learner" or label the child.
- Use this child-friendly flow:
  1. Quick idea / core concept.
  2. Learn it your way: learning-style support AND one guided example using DIFFERENT numbers but the SAME operation/concept.
  3. Auto-vérification / self-check: the student's own check, not the final answer.
  4. Method / how to solve it: reusable steps.
  5. Common mistake / watch out.

Output must ALWAYS be valid JSON like:
{"steps":[{"title":"","body":"","icon":"","kind":""}],"meta":{"mode":"concept","revealAnswer":false}}

Rules for steps:
- Use exactly these 5 steps in this order:
  1. Quick idea / Core concept: kind "concept", icon "lightbulb".
  2. Learn it your way: kind "strategy"; icon "magnifier" for visual, "lightbulb" or "checklist" for auditory, "checklist" for kinesthetic or mixed. This step MUST include learning-style support AND one guided example with different numbers but the same operation/concept.
  3. Auto-vérification / Self-check: kind "check", icon "target". This is fallback self-check text now and will later become runtime mini-practice.
  4. Method / How to solve it: kind "strategy", icon "checklist".
  5. Common mistake / Watch out: kind "pitfall", icon "warning".
- Each step:
  - "title": 2-5 words (short label)
  - "body": 1-3 simple sentences, clear and precise
  - "icon": one of ["lightbulb","magnifier","divide","checklist","warning","target"]
  - "kind": one of ["concept","example","strategy","pitfall","check"]
- In the "Learn it your way" step:
  - If {{learning_style}} is visual: use a title like "See it" or "Learn it your way". Use diagrams, arrays, number lines, tables, visual grouping, labels, shape descriptions, or spatial language. Use words like look, draw, mark, group, compare, line up, circle, point to.
  - If {{learning_style}} is auditory: use a title like "Say it" or "Learn it your way". Use spoken reasoning, repeatable phrases, verbal cues, or a memory sentence. Include one sentence the child can say out loud.
  - If {{learning_style}} is kinesthetic: use a title like "Try it" or "Learn it your way". Give hands-on actions: draw, move, tap, sort, count, fold, point, build, or act it out.
  - If {{learning_style}} is mixed: title it "Learn it your way" or "Try it three ways". Include one visual hint, one verbal cue, and one action idea.
  - Include ONE guided example inside this same step. The example MUST use different numbers but the SAME operation/concept as the student's exercise.
- If student exercise is division (÷ or /), show a division example.
- If student exercise is multiplication (× or *), show a multiplication example.
- If student exercise is addition (+), show an addition example.
- If student exercise is subtraction (-), show a subtraction example.
- The guided example MUST keep the same exercise family as the student's exercise:
  - decimal exercise → decimal example
  - fraction exercise → fraction example
  - percentage exercise → percentage example
  - division with remainder → division with remainder example
  - exact division → exact division example
- The guided example must also keep the same difficulty shape when possible:
  - same digit band: 1-digit, 2-digit, or 3+ digit
  - same decimal-place count for decimal exercises
  - if the student's addition needs a carry/retained 1, the guided example must also need a carry
  - if the student's subtraction needs a borrow/emprunt, the guided example must also need a borrow
- The self-check step should tell the student what to verify or try next without revealing the original answer.
- The method step should give reusable steps, not another full worked example.
- The common mistake step should warn about one likely trap.
- Do NOT output the student's numbers anywhere.
- No extra text, no markdown, no code fences.

Exercise (for context, DO NOT solve): {{exercise}}
Student answer: {{studentAnswer}}
Subject: {{subject}}
Language: {{language}}
Grade level: {{gradeLevel}}
Learning style: {{learning_style}}`;

export interface TeachingSections {
  exercise: string;
  steps?: Step[];
  concept: string;
  example: string;
  method: string;
  currentExercise: string;
  pitfall: string;
  check: string;
  practice: string;
  parentHelpHint: string;
  correctAnswer?: string;
}

type ExplanationFeedback = "like" | "dislike" | null;

type ExplanationReuseMeta = {
  operationType: OperationType;
  digitBand: "one_digit_example_required" | "two_digit_example_required" | "three_digit_example_required" | "non_arithmetic";
  responseLanguage: "French" | "English";
  subjectId: string;
};

function buildExerciseHash(
  exerciseContent: string,
  language: string,
  gradeLevel: string,
  learningStyle: LearningStyle,
) {
  const normalizedExercise = exerciseContent.trim().toLowerCase().replace(/\s+/g, " ");
  const normalizedLanguage = language.trim().toLowerCase();
  const normalizedGradeLevel = gradeLevel.trim().toLowerCase();
  const normalizedLearningStyle = learningStyle.trim().toLowerCase();

  return [
    normalizedExercise,
    normalizedLanguage,
    normalizedGradeLevel,
    normalizedLearningStyle,
    `adaptive-v${ADAPTIVE_EXPLANATION_CACHE_VERSION}`,
  ].join(":");
}

function detectOperationType(exercise: string): { type: OperationType; symbol: string } {
  const detection = detectOperationTypeFromExpression(exercise);
  return { type: detection.type, symbol: detection.operator };
}

function getDigitBandForExercise(exercise: string): ExplanationReuseMeta["digitBand"] {
  const operationType = detectOperationTypeFromExpression(exercise).type;
  if (operationType === "unknown") return "non_arithmetic";
  const { maxDigits } = countOperandDigits(exercise);
  if (maxDigits <= 1) return "one_digit_example_required";
  if (maxDigits === 2) return "two_digit_example_required";
  return "three_digit_example_required";
}

function buildReuseMeta(
  exerciseContent: string,
  responseLanguage: "French" | "English",
  subjectId: string,
): ExplanationReuseMeta {
  return {
    operationType: detectOperationTypeFromExpression(exerciseContent).type,
    digitBand: getDigitBandForExercise(exerciseContent),
    responseLanguage,
    subjectId,
  };
}

function getTargetExampleDigits(exerciseContent: string): number {
  const { digitBand } = analyzeExerciseProfile(exerciseContent);
  return digitBand;
}

function normalizeExampleForExercise(exerciseContent: string, example: string): string {
  const profile = analyzeExerciseProfile(exerciseContent);
  const validation = validateExampleOperationType(exerciseContent, example);
  const fallback = generateProfileMatchedExample(profile);

  if (!validation.isValid) {
    return fallback;
  }

  return example;
}

function normalizeStepsForExercise(exerciseContent: string, steps?: Step[] | null): Step[] | undefined {
  if (!Array.isArray(steps) || steps.length === 0) return steps ?? undefined;

  const expectedExample = generateProfileMatchedExample(analyzeExerciseProfile(exerciseContent));

  return steps.map((step) => {
    if ((step.kind !== "example" && step.kind !== "strategy") || !step.body?.trim()) {
      return step;
    }

    const body = step.body;
    const expressionMatch = body.match(/(\d+(?:[.,]\d+)?\s*[+\-×÷*/]\s*\d+(?:[.,]\d+)?(?:\s*=\s*\d+(?:[.,]\d+)?)?)/);
    if (!expressionMatch) return step;

    const currentExpression = expressionMatch[1];
    const safeExample = normalizeExampleForExercise(exerciseContent, currentExpression) || expectedExample;
    if (!safeExample || safeExample === currentExpression) return step;

    return {
      ...step,
      body: body.replace(currentExpression, safeExample),
    };
  });
}

function hasMatchingReuseMeta(candidate: any, expected: ExplanationReuseMeta) {
  const meta = candidate?.explanation_data?.reuseMeta;
  if (!meta || typeof meta !== "object") return false;

  return (
    meta.operationType === expected.operationType &&
    meta.digitBand === expected.digitBand &&
    meta.responseLanguage === expected.responseLanguage &&
    meta.subjectId === expected.subjectId &&
    candidate?.explanation_data?.adaptiveExplanationVersion === ADAPTIVE_EXPLANATION_CACHE_VERSION
  );
}

async function checkExplanationCache(
  hash: string,
): Promise<{ id: string; sections: TeachingSections } | null> {
  try {
    const { data: cacheEntry, error } = await supabase
      .from("exercise_explanations_cache")
      .select("id, explanation_data, usage_count, quality_score")
      .eq("exercise_hash", hash)
      .gte("quality_score", 0)
      .order("quality_score", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[TwoCardTeaching] Cache lookup failed:", error);
      return null;
    }

    if (!cacheEntry?.explanation_data || typeof cacheEntry.explanation_data !== "object") {
      return null;
    }

    void supabase
      .from("exercise_explanations_cache")
      .update({
        usage_count: (cacheEntry.usage_count ?? 0) + 1,
      })
      .eq("id", cacheEntry.id)
      .then(({ error: updateError }) => {
        if (updateError) {
          console.error("[TwoCardTeaching] Cache usage_count update failed:", updateError);
        }
      });

    console.log("[TwoCardTeaching] Cache hit:", cacheEntry.id);
    return {
      id: cacheEntry.id,
      sections: cacheEntry.explanation_data as unknown as TeachingSections,
    };
  } catch (err) {
    console.error("[TwoCardTeaching] Cache read error:", err);
    return null;
  }
}

async function saveExplanationToCache(
  hash: string,
  exerciseContent: string,
  subjectId: string | null,
  sections: TeachingSections,
  reuseMeta: ExplanationReuseMeta,
  correctAnswer?: string | null,
): Promise<string | null> {
  try {
    const { data: cacheEntry, error } = await supabase
      .from("exercise_explanations_cache")
      .upsert(
        {
          exercise_content: exerciseContent,
          exercise_hash: hash,
          subject_id: subjectId,
          explanation_data: {
            ...sections,
            adaptiveExplanationVersion: ADAPTIVE_EXPLANATION_CACHE_VERSION,
            reuseMeta,
          } as any,
          correct_answer: correctAnswer ?? null,
          quality_score: 0,
          usage_count: 1,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "exercise_hash" },
      )
      .select("id")
      .single();

    if (error) {
      console.error("[TwoCardTeaching] Failed to save to cache:", error);
      return null;
    }

    console.log("[TwoCardTeaching] Explanation saved to cache:", cacheEntry.id);
    return cacheEntry.id;
  } catch (err) {
    console.error("[TwoCardTeaching] Error saving explanation:", err);
    return null;
  }
}

function parseOpAndOperands(text: string): { symbol: string; a: string; b: string } | null {
  const cleaned = text.replace(/\s+/g, " ").trim();
  const m = cleaned.match(/(-?\d+(?:[.,]\d+)?)(?:\s*)([×*÷\/+\-])(?:\s*)(-?\d+(?:[.,]\d+)?)/);
  if (m) {
    return { a: m[1], symbol: m[2], b: m[3] };
  }
  return null;
}

const VALID_STEP_ICONS = new Set(["lightbulb", "magnifier", "divide", "checklist", "warning", "target"]);
const VALID_STEP_KINDS = new Set(["concept", "example", "method", "strategy", "pitfall", "check"]);

function normalizeSteps(rawSteps: any): Step[] | undefined {
  if (!Array.isArray(rawSteps)) return undefined;

  const steps = rawSteps
    .map((step): Step | null => {
      if (!step || typeof step !== "object") return null;
      const title = typeof step.title === "string" ? step.title.trim() : "";
      const body = typeof step.body === "string" ? step.body.trim() : "";
      const icon = VALID_STEP_ICONS.has(step.icon) ? step.icon : "lightbulb";
      const kind = VALID_STEP_KINDS.has(step.kind) ? step.kind : "strategy";

      if (!title || !body) return null;
      return { title, body, icon, kind } as Step;
    })
    .filter((step): step is Step => Boolean(step));

  return steps.length > 0 ? steps : undefined;
}

function learningSupportTitle(style: LearningStyle, responseLanguage: string) {
  const french = responseLanguage === "French";
  if (french) {
    if (style === "visual") return "Regarde";
    if (style === "auditory") return "Dis-le";
    if (style === "kinesthetic") return "Essaie";
    return "Apprends à ta façon";
  }
  if (style === "visual") return "See it";
  if (style === "auditory") return "Say it";
  if (style === "kinesthetic") return "Try it";
  return "Learn it your way";
}

function learningSupportIntro(style: LearningStyle, responseLanguage: string) {
  const french = responseLanguage === "French";
  if (french) {
    if (style === "visual") return "Regarde l'idée avec un exemple différent, puis compare les groupes ou les étapes.";
    if (style === "auditory") return "Dis l'idée à voix haute avec un exemple différent, puis répète la phrase clé.";
    if (style === "kinesthetic") return "Essaie avec tes doigts, des traits ou des objets, puis refais le geste avec l'exemple.";
    return "Utilise trois aides: regarde un exemple, dis la règle avec tes mots, puis essaie avec un petit geste.";
  }
  if (style === "visual") return "Look at the idea with a different example, then compare the groups or steps.";
  if (style === "auditory") return "Say the idea out loud with a different example, then repeat the key phrase.";
  if (style === "kinesthetic") return "Try it with fingers, marks, or objects, then repeat the action with the example.";
  return "Use three supports: look at an example, say the rule in your words, then try a small action.";
}

function synthesizeAdaptiveStepsFromLegacySections(
  sections: any,
  learningStyle: LearningStyle,
  responseLanguage: string,
): Step[] | undefined {
  if (!sections || typeof sections !== "object") return undefined;

  const concept = typeof sections.concept === "string" ? sections.concept.trim() : "";
  const example = typeof sections.example === "string" ? sections.example.trim() : "";
  const method = typeof (sections.method || sections.strategy) === "string"
    ? (sections.method || sections.strategy).trim()
    : "";
  const check = typeof sections.check === "string" ? sections.check.trim() : "";
  const pitfall = typeof sections.pitfall === "string" ? sections.pitfall.trim() : "";

  if (!concept && !example && !method && !check && !pitfall) return undefined;

  const french = responseLanguage === "French";
  const supportBody = [learningSupportIntro(learningStyle, responseLanguage), example].filter(Boolean).join("\n\n");

  return [
    {
      title: french ? "Idée rapide" : "Quick idea",
      body: concept || (french ? "Repère l'idée importante avant de calculer." : "Find the important idea before calculating."),
      icon: "lightbulb",
      kind: "concept",
    },
    {
      title: learningSupportTitle(learningStyle, responseLanguage),
      body: supportBody || (french ? "Prends un exemple différent et suis la même idée." : "Use a different example and follow the same idea."),
      icon: learningStyle === "visual" ? "magnifier" : "checklist",
      kind: "strategy",
    },
    {
      title: french ? "Auto-vérification" : "Self-check",
      body: check || (french ? "Vérifie que tu as utilisé la même idée avec des nombres différents." : "Check that you used the same idea with different numbers."),
      icon: "target",
      kind: "check",
    },
    {
      title: french ? "Méthode" : "Method",
      body: method || (french ? "Refais les étapes dans l'ordre et explique pourquoi tu les fais." : "Repeat the steps in order and explain why each one helps."),
      icon: "checklist",
      kind: "strategy",
    },
    {
      title: french ? "Piège" : "Watch out",
      body: pitfall || (french ? "Ne mélange pas l'exemple avec ton exercice." : "Do not mix the example with your own exercise."),
      icon: "warning",
      kind: "pitfall",
    },
  ];
}

export function useTwoCardTeaching() {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [sections, setSections] = React.useState<TeachingSections | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [cacheEntryId, setCacheEntryId] = React.useState<string | null>(null);
  const [feedback, setFeedback] = React.useState<ExplanationFeedback>(null);
  const [feedbackLoading, setFeedbackLoading] = React.useState(false);

  const { selectedModelId } = useAdmin();

  const resetFeedbackState = React.useCallback(() => {
    setCacheEntryId(null);
    setFeedback(null);
    setFeedbackLoading(false);
  }, []);

  const debugSetSections = (newSections: TeachingSections | null) => {
    console.log("[useTwoCardTeaching] setSections called with:", newSections);
    console.log("[useTwoCardTeaching] Current sections state before update:", sections);
    console.log("[useTwoCardTeaching] New sections type:", typeof newSections);
    console.log("[useTwoCardTeaching] New sections keys:", newSections ? Object.keys(newSections) : "null");
    setSections(newSections);
    setTimeout(() => {
      console.log("[useTwoCardTeaching] Sections state after update:", sections);
      console.log("[useTwoCardTeaching] Sections state type after update:", typeof sections);
    }, 100);
  };

  async function openFor(
    row: any,
    profile: { response_language?: string; grade_level?: string; learning_style?: string | LearningStyle | null },
  ) {
    console.log("[TwoCardTeaching] Opening explanation for:", { row, profile });
    setOpen(true);
    setError(null);
    setLoading(true);
    resetFeedbackState();

    try {
      const exercise_content = row?.prompt || row?.question || row?.exercise_content || "";
      const student_answer = row?.userAnswer || row?.student_answer || "";
      const subject = row?.subject || row?.subjectId || "math";
      const promptSubject = String(subject).toLowerCase() === "math" ? "Math" : subject;
      const rawLang = profile?.response_language || "English";
      const response_language = /^fr/i.test(rawLang) ? "French" : "English";
      const grade_level = profile?.grade_level ?? "High School";
      const learning_style = normalizeLearningStyle(profile?.learning_style);

      const location = typeof window !== "undefined" ? window.location.pathname : "";
      const isAcademicContext = location.includes("/practice") || location.includes("/exam") || location.includes("/annales");
      const learningMode = isAcademicContext ? "student" : getLearningMode(grade_level);

      const operationInfo = detectOperationType(exercise_content);
      console.log("[TwoCardTeaching] Detected operation:", operationInfo);

      const exerciseMessage = `${exercise_content}${student_answer ? `\nStudent's answer: ${student_answer}` : ""}`;

      const explanationContext = {
        exercise_content,
        student_answer: student_answer || "Not provided",
        correct_answer: "",
        exercise: exercise_content,
        studentAnswer: student_answer || "Not provided",
        language: response_language,
        gradeLevel: grade_level,
        first_name: "Student",
        grade_level,
        country: "your country",
        learning_style,
        learning_mode: learningMode,
        subject: promptSubject,
        user_type: "student",
        response_language,
      };

      console.log("[TwoCardTeaching] Using adaptive explanation prompt with context:", explanationContext);

      const cacheHash = buildExerciseHash(exercise_content, response_language, grade_level, learning_style);
      const reuseMeta = buildReuseMeta(exercise_content, response_language, subject.toLowerCase());

      const cachedResult = await checkExplanationCache(cacheHash);
      if (cachedResult) {
        const normalizedCachedSections = {
          ...cachedResult.sections,
          example: normalizeExampleForExercise(exercise_content, cachedResult.sections.example || ""),
          steps: normalizeStepsForExercise(exercise_content, cachedResult.sections.steps),
        };
        debugSetSections(normalizedCachedSections);
        setCacheEntryId(cachedResult.id);
        setLoading(false);
        return;
      }

      if (reuseMeta.operationType !== "unknown" && reuseMeta.digitBand !== "non_arithmetic") {
        try {
          const { data: similarExplanations, error: similarError } = await supabase
            .from("exercise_explanations_cache")
            .select("id, exercise_content, explanation_data, usage_count, quality_score, updated_at")
            .eq("subject_id", subject.toLowerCase())
            .gte("quality_score", 0)
            .order("quality_score", { ascending: false })
            .order("updated_at", { ascending: false })
            .limit(25);

          if (similarError) {
            console.error("[TwoCardTeaching] Similar cache lookup failed:", similarError);
          } else {
            const reusableCandidate = (similarExplanations ?? []).find(
              (candidate) => candidate.exercise_content !== exercise_content && hasMatchingReuseMeta(candidate, reuseMeta),
            );

            if (reusableCandidate?.explanation_data && typeof reusableCandidate.explanation_data === "object") {
              const similarSections = {
                ...(reusableCandidate.explanation_data as unknown as TeachingSections),
                exercise: exercise_content,
                example: normalizeExampleForExercise(
                  exercise_content,
                  ((reusableCandidate.explanation_data as unknown as TeachingSections).example || ""),
                ),
                steps: normalizeStepsForExercise(
                  exercise_content,
                  (reusableCandidate.explanation_data as unknown as TeachingSections).steps,
                ),
              } satisfies TeachingSections;

              debugSetSections(similarSections);
              setCacheEntryId(reusableCandidate.id);
              setLoading(false);

              void supabase
                .from("exercise_explanations_cache")
                .update({ usage_count: (reusableCandidate.usage_count ?? 0) + 1 })
                .eq("id", reusableCandidate.id);

              return;
            }
          }
        } catch (similarLookupError) {
          console.error("[TwoCardTeaching] Unexpected similar cache lookup error:", similarLookupError);
        }
      }

      console.log("[TwoCardTeaching] Sending explanation request to AI using database prompt");

      const { data, error: aiError } = await supabase.functions.invoke("ai-chat", {
        body: {
          message: exerciseMessage,
          modelId: selectedModelId || "gpt-5",
          isUnified: false,
          requestExplanation: false,
          usageType: "explanation",
          customPrompt: ADAPTIVE_TWOCARD_PROMPT,
          language: /^fr/i.test(rawLang) ? "fr" : "en",
          userContext: explanationContext,
          maxTokens: 1600,
        },
      });

      if (aiError) {
        console.error("[TwoCardTeaching] AI service error:", aiError);
        throw new Error("Failed to generate explanation");
      }

      console.log("[TwoCardTeaching] AI response received:", data);

      let result: any = null;

      if (data?.tool_calls?.[0]?.function?.arguments) {
        console.log("[TwoCardTeaching] Parsing from tool_calls");
        result = JSON.parse(data.tool_calls[0].function.arguments);
      } else if (data?.content) {
        console.log("[TwoCardTeaching] Parsing from content");
        const rawContent = data.content;

        try {
          const fenceMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/i);
          let jsonStr = "";

          if (fenceMatch) {
            jsonStr = fenceMatch[1].trim();
          } else {
            const firstBrace = rawContent.indexOf("{");
            const lastBrace = rawContent.lastIndexOf("}");
            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
              jsonStr = rawContent.substring(firstBrace, lastBrace + 1);
            } else {
              jsonStr = rawContent;
            }
          }

          result = JSON.parse(jsonStr);
          console.log("[TwoCardTeaching] Successfully parsed JSON from content");
        } catch (parseError) {
          console.error("[TwoCardTeaching] Failed to parse JSON from content:", parseError);
          console.error("[TwoCardTeaching] Raw content:", rawContent);
          throw new Error("The AI returned an unexpected format. Please try again.");
        }
      } else {
        console.error("[TwoCardTeaching] No tool calls or content in response");
        throw new Error("Invalid response format from AI");
      }

      if (result.isMath === false) {
        throw new Error("This does not appear to be a math problem");
      }

      const sections = result.sections || {};
      sections.steps = normalizeStepsForExercise(exercise_content, normalizeSteps(result.steps || sections.steps));
      const steps = sections.steps
        || synthesizeAdaptiveStepsFromLegacySections(sections, learning_style, response_language);
      const correctAnswer = result.correctAnswer || null;

      const studentOp = detectOperationType(exercise_content);
      sections.example = normalizeExampleForExercise(exercise_content, sections.example || "");
      const exampleOp = detectOperationType(sections.example || "");

      if (studentOp.type !== "unknown" && exampleOp.type !== studentOp.type) {
        console.warn(`⚠️ Operation mismatch - Expected: ${studentOp.type}, Got: ${exampleOp.type}`);
        console.warn("Database prompt may need refinement");
      }

      const exerciseParts = parseOpAndOperands(exercise_content);
      const exampleParts = parseOpAndOperands(sections.example || "");

      if (exerciseParts && exampleParts && exerciseParts.a === exampleParts.a && exerciseParts.b === exampleParts.b) {
        console.warn("⚠️ Example uses same numbers as exercise - prompt needs refinement");
      }

      const explanationSections: TeachingSections = {
        exercise: result.exercise || exercise_content,
        steps,
        concept: sections.concept || "No concept provided",
        example: sections.example || "No example provided",
        method: sections.method || sections.strategy || "No method provided",
        currentExercise: sections.currentExercise || "No solution provided",
        pitfall: sections.pitfall || "No common pitfalls identified",
        check: sections.check || "No verification method provided",
        practice: sections.practice || "Practice similar problems",
        parentHelpHint: sections.parentHelpHint || "Encourage your child to break down the problem step by step",
        correctAnswer,
      };

      console.log("[TwoCardTeaching] ✓ Explanation sections generated:", explanationSections);
      console.log("[TwoCardTeaching] ✓ Method field length:", explanationSections.method.length);
      debugSetSections(explanationSections);

      const savedCacheEntryId = await saveExplanationToCache(
        cacheHash,
        exercise_content,
        subject.toLowerCase(),
        explanationSections,
        reuseMeta,
        correctAnswer,
      );
      if (savedCacheEntryId) {
        setCacheEntryId(savedCacheEntryId);
      }

      setLoading(false);
    } catch (err) {
      console.error("[TwoCardTeaching] Error generating explanation:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setLoading(false);

      toast({
        title: "Error",
        description: "Failed to generate explanation. Please try again.",
        variant: "destructive",
      });
    }
  }

  async function submitFeedback(vote: Exclude<ExplanationFeedback, null>) {
    if (!cacheEntryId || feedbackLoading || feedback === vote) return;

    setFeedbackLoading(true);
    try {
      const { data: current, error: currentError } = await supabase
        .from("exercise_explanations_cache")
        .select("quality_score")
        .eq("id", cacheEntryId)
        .single();

      if (currentError) throw currentError;

      const currentScore = current?.quality_score ?? 0;
      const nextScore =
        vote === "like"
          ? feedback === "dislike"
            ? currentScore + 2
            : currentScore + 1
          : feedback === "like"
            ? currentScore - 2
            : currentScore - 1;

      const { error: updateError } = await supabase
        .from("exercise_explanations_cache")
        .update({ quality_score: nextScore })
        .eq("id", cacheEntryId);

      if (updateError) throw updateError;

      setFeedback(vote);
    } catch (feedbackError) {
      console.error("[TwoCardTeaching] Failed to save feedback:", feedbackError);
      toast({
        title: "Error",
        description: "Failed to save feedback.",
        variant: "destructive",
      });
    } finally {
      setFeedbackLoading(false);
    }
  }

  return {
    open,
    setOpen,
    loading,
    sections,
    error,
    openFor,
    setSections: debugSetSections,
    submitFeedback,
    feedback,
    feedbackLoading,
    cacheEntryId,
    resetFeedbackState,
  };
}
