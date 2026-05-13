import type { TrainingQuestion } from "@/types/training";

type ParsedContentWithQuestions = {
  questions?: Array<{ text?: unknown }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function migrateOldQuestions(parsedContent: unknown): TrainingQuestion[] {
  if (!isRecord(parsedContent)) return [];
  const maybe = parsedContent as ParsedContentWithQuestions;
  if (!Array.isArray(maybe.questions)) return [];

  return maybe.questions
    .map((q, index): TrainingQuestion | null => {
      const prompt = isRecord(q) && typeof q.text === "string" ? q.text : null;
      if (!prompt) return null;
      return {
        id: `q_${index}`,
        type: "text",
        prompt,
        guidance: {
          hints: [],
        },
      };
    })
    .filter((q): q is TrainingQuestion => q !== null);
}

