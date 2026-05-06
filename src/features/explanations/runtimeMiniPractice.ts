import { supabase } from "@/integrations/supabase/client";
import { normalizeLearningStyle, type LearningStyle } from "@/types/learning-style";

export type MiniPracticeQuestionType = "multiple_choice" | "short_answer" | "ordering";

export interface MiniPracticeChoice {
  id: string;
  label: string;
}

export interface RuntimeMiniPractice {
  id: string;
  concept: string;
  learningStyleUsed: LearningStyle;
  questionType: MiniPracticeQuestionType;
  prompt: string;
  visualText?: string;
  choices?: MiniPracticeChoice[];
  correctAnswer: string | string[];
  hint: string;
  feedback: {
    correct: string;
    incorrect: string;
  };
}

export interface RuntimeMiniPracticeContext {
  exercise: string;
  explanationContext?: string;
  gradeLevel?: string;
  language?: string;
  learningStyle?: string | LearningStyle | null;
  subject?: string;
  country?: string;
  modelId?: string | null;
  enabled?: boolean;
}

const MINI_PRACTICE_PROMPT = `You create ONE short runtime mini-practice question for a student.

Return ONLY valid JSON. No markdown fences. No prose outside JSON.

Goal:
- Check the same concept as the explanation.
- Use the student's response language.
- Match the grade level.
- Adapt the question format to learning_style.
- Do not solve the student's original exercise.
- Do not copy the original exercise numbers if possible.
- Do not reveal the answer in the hint.
- Do not label the child as a visual/auditory/kinesthetic learner.

Learning-style guidance:
- If learning_style is visual: prefer a simple array, number line, table, diagram, labels, or grouping. Use visualText when useful.
- If learning_style is auditory: prefer sentence completion, verbal reasoning, or choosing the correct explanation. Include a phrase or sentence the student can say.
- If learning_style is kinesthetic: prefer ordering, step-building, action-based, drawing, grouping, sorting, or "do this" style practice with short action language.
- If learning_style is mixed: use one simple balanced question.

Supported questionType values:
- multiple_choice
- short_answer
- ordering

Schema:
{
  "id": "short-id",
  "concept": "short concept name",
  "learningStyleUsed": "visual" | "auditory" | "kinesthetic" | "mixed",
  "questionType": "multiple_choice" | "short_answer" | "ordering",
  "prompt": "student-facing question",
  "visualText": "optional simple visual text",
  "choices": [{"id":"A","label":"choice text"}],
  "correctAnswer": "A or answer text, or array of ids for ordering",
  "hint": "helpful hint that does not reveal the answer",
  "feedback": {
    "correct": "short positive explanation",
    "incorrect": "short corrective explanation"
  }
}

Rules:
- multiple_choice needs 2-4 choices and correctAnswer should be the correct choice id.
- short_answer needs correctAnswer as a short string.
- ordering needs choices/items and correctAnswer as an ordered array of choice ids.
- visualText may contain line breaks for arrays, number lines, diagrams, or grouped objects.

Student exercise for context only: {{exercise}}
Explanation context: {{explanationContext}}
Subject: {{subject}}
Grade level: {{gradeLevel}}
Country/curriculum: {{country}}
Language: {{language}}
Learning style: {{learning_style}}`;

function extractJsonObject(raw: string): unknown {
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonText = fenceMatch
    ? fenceMatch[1].trim()
    : raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1).trim();

  if (!jsonText || !jsonText.startsWith("{")) {
    throw new Error("No JSON object found");
  }

  return JSON.parse(jsonText);
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeChoices(rawChoices: unknown): MiniPracticeChoice[] | undefined {
  if (!Array.isArray(rawChoices)) return undefined;

  const choices = rawChoices
    .map((choice, index): MiniPracticeChoice | null => {
      if (!choice || typeof choice !== "object") return null;
      const record = choice as Record<string, unknown>;
      const id = stringValue(record.id) || String.fromCharCode(65 + index);
      const label = stringValue(record.label);
      if (!label) return null;
      return { id, label };
    })
    .filter((choice): choice is MiniPracticeChoice => Boolean(choice));

  return choices.length > 0 ? choices : undefined;
}

export function validateRuntimeMiniPractice(raw: unknown): RuntimeMiniPractice | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;

  const questionType = stringValue(record.questionType) as MiniPracticeQuestionType;
  if (!["multiple_choice", "short_answer", "ordering"].includes(questionType)) return null;

  const prompt = stringValue(record.prompt);
  const hint = stringValue(record.hint);
  const feedbackRecord = record.feedback && typeof record.feedback === "object"
    ? record.feedback as Record<string, unknown>
    : {};
  const correctFeedback = stringValue(feedbackRecord.correct);
  const incorrectFeedback = stringValue(feedbackRecord.incorrect);
  const choices = normalizeChoices(record.choices);
  const rawCorrectAnswer = record.correctAnswer;

  if (!prompt || !hint || !correctFeedback || !incorrectFeedback) return null;

  let correctAnswer: string | string[];
  if (Array.isArray(rawCorrectAnswer)) {
    correctAnswer = rawCorrectAnswer.map(stringValue).filter(Boolean);
  } else {
    correctAnswer = stringValue(rawCorrectAnswer);
  }

  if (questionType === "multiple_choice") {
    if (!choices || choices.length < 2 || Array.isArray(correctAnswer) || !correctAnswer) return null;
    const normalizedAnswer = correctAnswer.toLowerCase();
    const hasMatchingChoice = choices.some(choice =>
      choice.id.toLowerCase() === normalizedAnswer || choice.label.trim().toLowerCase() === normalizedAnswer
    );
    if (!hasMatchingChoice) return null;
  }

  if (questionType === "short_answer") {
    if (Array.isArray(correctAnswer) || !correctAnswer) return null;
  }

  if (questionType === "ordering") {
    if (!choices || choices.length < 2 || !Array.isArray(correctAnswer) || correctAnswer.length < 2) return null;
    const choiceIds = new Set(choices.map(choice => choice.id));
    if (!correctAnswer.every(id => choiceIds.has(id))) return null;
  }

  return {
    id: stringValue(record.id) || `runtime-${Date.now()}`,
    concept: stringValue(record.concept) || "practice",
    learningStyleUsed: normalizeLearningStyle(stringValue(record.learningStyleUsed)),
    questionType,
    prompt,
    visualText: stringValue(record.visualText) || undefined,
    choices,
    correctAnswer,
    hint,
    feedback: {
      correct: correctFeedback,
      incorrect: incorrectFeedback,
    },
  };
}

export async function generateRuntimeMiniPractice(
  context: RuntimeMiniPracticeContext
): Promise<RuntimeMiniPractice | null> {
  if (context.enabled === false || !context.exercise?.trim()) return null;

  const learning_style = normalizeLearningStyle(context.learningStyle);
  const language = /^fr/i.test(context.language || "") ? "French" : "English";
  const userContext = {
    exercise: context.exercise,
    explanationContext: context.explanationContext || "Use the current explanation concept.",
    subject: context.subject || "Math",
    gradeLevel: context.gradeLevel || "student level",
    country: context.country || "not specified",
    language,
    learning_style,
  };

  const { data, error } = await supabase.functions.invoke("ai-chat", {
    body: {
      message: `Create one runtime mini-practice question for: ${context.exercise}`,
      modelId: context.modelId || "gpt-5",
      isUnified: false,
      requestExplanation: false,
      customPrompt: MINI_PRACTICE_PROMPT,
      language: language === "French" ? "fr" : "en",
      userContext,
      maxTokens: 900,
    },
  });

  if (error) {
    console.warn("[RuntimeMiniPractice] Generation failed:", error);
    return null;
  }

  try {
    const raw = data?.tool_calls?.[0]?.function?.arguments
      ? JSON.parse(data.tool_calls[0].function.arguments)
      : data?.content
        ? extractJsonObject(data.content)
        : data;

    return validateRuntimeMiniPractice(raw);
  } catch (err) {
    console.warn("[RuntimeMiniPractice] Invalid generated practice:", err);
    return null;
  }
}

export function isMiniPracticeAnswerCorrect(
  practice: RuntimeMiniPractice,
  answer: string | string[]
): boolean {
  if (practice.questionType === "ordering") {
    if (!Array.isArray(answer) || !Array.isArray(practice.correctAnswer)) return false;
    return answer.length === practice.correctAnswer.length
      && answer.every((value, index) => value === (practice.correctAnswer as string[])[index]);
  }

  if (Array.isArray(answer) || Array.isArray(practice.correctAnswer)) return false;

  const normalize = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/,/g, ".")
      .replace(/[.!?;:]$/g, "");

  const normalizedAnswer = normalize(answer);
  const normalizedCorrect = normalize(practice.correctAnswer);

  if (practice.questionType === "multiple_choice") {
    const matchingChoice = practice.choices?.find(choice =>
      normalize(choice.id) === normalizedCorrect || normalize(choice.label) === normalizedCorrect
    );
    return normalizedAnswer === normalizedCorrect
      || (!!matchingChoice && normalizedAnswer === normalize(matchingChoice.id));
  }

  return normalizedAnswer === normalizedCorrect;
}
