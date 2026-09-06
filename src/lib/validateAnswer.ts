import type { TrainingQuestion } from "@/types/training";

function normalizeText(value: string): string {
  return value.trim();
}

export function validateAnswer(
  question: TrainingQuestion,
  userAnswer: string
): { correct: boolean | null } {
  if (!question.validation) return { correct: null };

  const value = question.validation.value;

  switch (question.validation.type) {
    case "exact": {
      if (value === null || value === undefined) return { correct: null };
      return { correct: normalizeText(userAnswer) === normalizeText(String(value)) };
    }

    case "range": {
      if (!Array.isArray(value) || value.length < 2) return { correct: null };
      const [minRaw, maxRaw] = value as unknown[];
      const min = typeof minRaw === "number" ? minRaw : Number(minRaw);
      const max = typeof maxRaw === "number" ? maxRaw : Number(maxRaw);
      const num = Number(normalizeText(userAnswer).replace(",", "."));
      if (!Number.isFinite(min) || !Number.isFinite(max) || !Number.isFinite(num)) return { correct: null };
      return { correct: num >= min && num <= max };
    }

    case "regex": {
      if (typeof value !== "string") return { correct: null };
      try {
        const re = new RegExp(value);
        return { correct: re.test(userAnswer) };
      } catch {
        return { correct: null };
      }
    }

    default:
      return { correct: null };
  }
}

