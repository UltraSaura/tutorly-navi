import { supabase } from "@/integrations/supabase/client";
import { normalizeLearningStyle, type LearningStyle } from "@/types/learning-style";
import { isUnder11YearsOld } from "@/utils/gradeLevelMapping";

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

type SimpleArithmeticOp = "+" | "-";

interface SimpleArithmeticExercise {
  a: number;
  b: number;
  op: SimpleArithmeticOp;
}

function normalizeGrade(level?: string | null): string {
  return (level || "").toLowerCase().trim();
}

function isEarlyPrimaryGrade(level?: string | null): boolean {
  const grade = normalizeGrade(level);
  return grade.includes("cp") || grade.includes("ce1");
}

function shouldUseDirectArithmeticPractice(
  parsed: SimpleArithmeticExercise,
  gradeLevel?: string | null,
): boolean {
  if (isEarlyPrimaryGrade(gradeLevel)) return false;
  return parsed.a >= 10 || parsed.b >= 10;
}

function shouldUseVisualManipulativePractice(
  parsed: SimpleArithmeticExercise,
  gradeLevel?: string | null,
): boolean {
  return isEarlyPrimaryGrade(gradeLevel) && parsed.a < 10 && parsed.b < 10;
}

function hasManipulativeLanguage(practice: RuntimeMiniPractice): boolean {
  const haystack = [
    practice.prompt,
    practice.visualText,
    practice.hint,
    practice.feedback.correct,
    practice.feedback.incorrect,
    ...(practice.choices || []).map(choice => choice.label),
  ].filter(Boolean).join(" ").toLowerCase();

  return /\b(barre|barres|cube|cubes|rod|rods|jeton|jetons)\b/.test(haystack);
}

export function shouldUseDirectArithmeticMiniPractice(
  parsed: SimpleArithmeticExercise,
  gradeLevel?: string | null,
): boolean {
  if (isEarlyPrimaryGrade(gradeLevel) && parsed.a < 10 && parsed.b < 10) {
    return false;
  }

  return parsed.a >= 10 || parsed.b >= 10 || !isEarlyPrimaryGrade(gradeLevel);
}

export function hasArithmeticManipulativeLanguage(practice: RuntimeMiniPractice): boolean {
  return hasManipulativeLanguage(practice);
}

export function isVerticalOperationVisualText(visualText?: string | null): boolean {
  if (!visualText) return false;

  const lines = visualText
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean);

  if (lines.length < 2 || lines.length > 5) return false;

  const hasOperationLine = lines.some(line => /^[-+−×*/÷]\s*\d+/.test(line));
  const hasSeparator = lines.some(line => /^[-−_—–]{2,}$/.test(line));
  const numericLineCount = lines.filter(line => /^\d+$/.test(line)).length;

  return hasOperationLine && (hasSeparator || numericLineCount >= 2);
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
- The result must fit on a single small mobile screen without scrolling.

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
- Keep the prompt very short: 1-2 short sentences maximum.
- Keep the hint very short: 1 short sentence maximum.
- Keep feedback very short: 1 short sentence maximum.
- If visualText is used, keep it compact and easy to read on mobile:
  - maximum 4 non-empty lines
  - each line should stay short
  - avoid large paragraphs or long legends inside visualText
- Prefer one question only.
- Do not include long explanatory text inside the question.
- If the same concept can be checked in several ways, choose the shortest version that still teaches the concept.

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

export function parseSimpleArithmeticExercise(exercise: string): SimpleArithmeticExercise | null {
  if (!exercise) return null;
  const match = exercise.replace(/,/g, ".").match(/(\d+)\s*([+\-])\s*(\d+)/);
  if (!match) return null;

  const a = Number.parseInt(match[1], 10);
  const op = match[2] as SimpleArithmeticOp;
  const b = Number.parseInt(match[3], 10);

  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  if (a < 0 || b < 0) return null;

  return { a, b, op };
}

function buildBaseTenTokens(value: number, language: "fr" | "en"): string {
  const tens = Math.floor(value / 10);
  const units = value % 10;
  const parts: string[] = [];

  if (tens > 0) {
    parts.push(
      language === "fr"
        ? `[${tens} ${tens > 1 ? "barres" : "barre"}]`
        : `[${tens} ${tens > 1 ? "rods" : "rod"}]`
    );
  }

  if (units > 0) {
    parts.push(
      language === "fr"
        ? `[${units} ${units > 1 ? "cubes" : "cube"}]`
        : `[${units} ${units > 1 ? "cubes" : "cube"}]`
    );
  }

  if (parts.length === 0) {
    parts.push(language === "fr" ? "[0 cube]" : "[0 cube]");
  }

  return parts.join(" ");
}

function uniqueChoices(labels: string[]): MiniPracticeChoice[] {
  return [...new Set(labels)].slice(0, 3).map((label, index) => ({
    id: String.fromCharCode(65 + index),
    label,
  }));
}

function deterministicChoiceId(choices: MiniPracticeChoice[], correctLabel: string): string {
  return choices.find((choice) => choice.label === correctLabel)?.id ?? "A";
}

function formatArithmeticVisual(parsed: SimpleArithmeticExercise): string {
  const top = String(parsed.a);
  const bottom = String(parsed.b);
  const width = Math.max(top.length, bottom.length) + 2;

  return [
    top.padStart(width, " "),
    `${parsed.op} ${bottom.padStart(width - 2, " ")}`,
    "-".repeat(width),
  ].join("\n");
}

function buildArithmeticResultChoices(
  parsed: SimpleArithmeticExercise,
): { labels: string[]; correctLabel: string } {
  const correctValue = parsed.op === "+" ? parsed.a + parsed.b : parsed.a - parsed.b;
  const distractors = new Set<number>();

  if (parsed.op === "+") {
    distractors.add(correctValue - 1);
    distractors.add(correctValue + 1);
    distractors.add(parsed.a + (parsed.b % 10));
    distractors.add((parsed.a - (parsed.a % 10)) + parsed.b);
  } else {
    distractors.add(correctValue - 1);
    distractors.add(correctValue + 1);
    distractors.add(parsed.a + parsed.b);
    distractors.add(Math.max(0, parsed.a - (parsed.b % 10)));
  }

  const labels = [correctValue, ...Array.from(distractors).filter((value) => value !== correctValue)]
    .filter((value) => Number.isFinite(value))
    .slice(0, 3)
    .map((value) => String(value));

  while (labels.length < 3) {
    labels.push(String(correctValue + labels.length));
  }

  return {
    labels,
    correctLabel: String(correctValue),
  };
}

function buildKidArithmeticDirectPractice(
  parsed: SimpleArithmeticExercise,
  learningStyle: LearningStyle,
  language: "fr" | "en"
): RuntimeMiniPractice {
  const { labels, correctLabel } = buildArithmeticResultChoices(parsed);
  const choices = uniqueChoices(labels);
  const correctAnswer = deterministicChoiceId(choices, correctLabel);
  const expression = `${parsed.a} ${parsed.op} ${parsed.b}`;

  if (language === "fr") {
    return {
      id: `kid-direct-${Date.now()}`,
      concept: parsed.op === "+" ? "addition" : "soustraction",
      learningStyleUsed: learningStyle,
      questionType: "multiple_choice",
      prompt: `Calcule : ${expression}`,
      visualText: formatArithmeticVisual(parsed),
      choices,
      correctAnswer,
      hint: parsed.op === "+"
        ? "Commence par les unités, puis ajoute les dizaines."
        : "Commence par les unités et pense à l'emprunt si besoin.",
      feedback: {
        correct: `${expression} = ${correctLabel}.`,
        incorrect: `Reprends la colonne des unités, puis termine le calcul : ${expression} = ${correctLabel}.`,
      },
    };
  }

  return {
    id: `kid-direct-${Date.now()}`,
    concept: parsed.op === "+" ? "addition" : "subtraction",
    learningStyleUsed: learningStyle,
    questionType: "multiple_choice",
    prompt: `Solve: ${expression}`,
    visualText: formatArithmeticVisual(parsed),
    choices,
    correctAnswer,
    hint: parsed.op === "+"
      ? "Start with the ones, then add the tens."
      : "Start with the ones and borrow if needed.",
    feedback: {
      correct: `${expression} = ${correctLabel}.`,
      incorrect: `Check the ones column first, then finish: ${expression} = ${correctLabel}.`,
    },
  };
}

export function buildDirectArithmeticMiniPracticeForContext(
  context: RuntimeMiniPracticeContext,
  learningStyle?: LearningStyle,
): RuntimeMiniPractice | null {
  const parsedExercise = parseSimpleArithmeticExercise(context.exercise);
  if (!parsedExercise || !shouldUseDirectArithmeticMiniPractice(parsedExercise, context.gradeLevel)) {
    return null;
  }

  const languageCode = /^fr/i.test(context.language || "") ? "fr" : "en";
  return buildKidArithmeticDirectPractice(
    parsedExercise,
    learningStyle || normalizeLearningStyle(context.learningStyle),
    languageCode,
  );
}

function buildKidArithmeticVisualPractice(
  parsed: SimpleArithmeticExercise,
  learningStyle: LearningStyle,
  language: "fr" | "en"
): RuntimeMiniPractice {
  const { a, b, op } = parsed;
  const concept = op === "+" ? (language === "fr" ? "addition" : "addition") : (language === "fr" ? "soustraction" : "subtraction");
  const firstLineLabel = `${a}`;
  const secondLineLabel = `${op} ${b}`;
  const visualText = [
    `${firstLineLabel}: ${buildBaseTenTokens(a, language)}`,
    `${secondLineLabel}: ${buildBaseTenTokens(b, language)}`,
  ].join("\n");

  const correctExpression = `${a} ${op} ${b}`;
  const firstDistractor =
    op === "+"
      ? `${a - (a % 10)} + ${b}`
      : `${a - (a % 10)} - ${b}`;
  const secondDistractor =
    op === "+"
      ? `${a} + ${Math.max(1, b + 1)}`
      : `${a} - ${Math.max(1, b + 1)}`;

  const choices = uniqueChoices([correctExpression, firstDistractor, secondDistractor]);
  const correctAnswer = deterministicChoiceId(choices, correctExpression);

  if (language === "fr") {
    return {
      id: `kid-${Date.now()}`,
      concept,
      learningStyleUsed: learningStyle,
      questionType: "multiple_choice",
      prompt: op === "+"
        ? "Quelle addition est représentée ?"
        : "Quelle soustraction est représentée ?",
      visualText,
      choices,
      correctAnswer,
      hint: "Regarde les dizaines, puis les unités.",
      feedback: {
        correct: op === "+"
          ? `Bien vu ! On voit ${a} puis ${b}. Cela représente ${a} + ${b}.`
          : `Bien vu ! On voit ${a} puis on enlève ${b}. Cela représente ${a} - ${b}.`,
        incorrect: op === "+"
          ? "Regarde le premier nombre, puis le nombre ajouté."
          : "Regarde le premier nombre, puis le nombre enlevé.",
      },
    };
  }

  return {
    id: `kid-${Date.now()}`,
    concept,
    learningStyleUsed: learningStyle,
    questionType: "multiple_choice",
    prompt: op === "+" ? "Which addition is shown?" : "Which subtraction is shown?",
    visualText,
    choices,
    correctAnswer,
    hint: "Look at the tens, then the ones.",
    feedback: {
      correct: op === "+"
        ? `Good. The picture shows ${a} and then ${b}, so it is ${a} + ${b}.`
        : `Good. The picture shows ${a} and then taking away ${b}, so it is ${a} - ${b}.`,
      incorrect: op === "+"
        ? "Look at the first number, then the number being added."
        : "Look at the first number, then the number being taken away.",
    },
  };
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
  const languageCode = /^fr/i.test(context.language || "") ? "fr" : "en";
  const language = languageCode === "fr" ? "French" : "English";
  const parsedExercise = parseSimpleArithmeticExercise(context.exercise);
  const isKidTemplateCandidate = Boolean(
    parsedExercise &&
    (!context.gradeLevel || isUnder11YearsOld(context.gradeLevel))
  );

  if (isKidTemplateCandidate && parsedExercise) {
    const directPractice = buildDirectArithmeticMiniPracticeForContext(context, learning_style);
    if (directPractice) return directPractice;

    if (
      shouldUseDirectArithmeticPractice(parsedExercise, context.gradeLevel) ||
      !shouldUseVisualManipulativePractice(parsedExercise, context.gradeLevel)
    ) {
      return buildKidArithmeticDirectPractice(parsedExercise, learning_style, languageCode);
    }

    return buildKidArithmeticVisualPractice(parsedExercise, learning_style, languageCode);
  }

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

    const practice = validateRuntimeMiniPractice(raw);
    if (practice && parsedExercise && hasManipulativeLanguage(practice)) {
      return buildKidArithmeticDirectPractice(parsedExercise, learning_style, languageCode);
    }

    return practice;
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
