export type PromptFigureSpec =
  | { kind: "rect"; total: number; colored: number }
  | { kind: "pie"; total: number; colored: number };

export function normalizePromptText(text: string | null | undefined): string {
  return (text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function parseFractionText(text: string | null | undefined): { numerator: number; denominator: number } | null {
  if (!text) return null;
  const normalized = text.trim().replace(",", ".");
  const fractionMatch = normalized.match(/\b(\d+)\s*\/\s*(\d+)\b/);
  if (fractionMatch) {
    const numerator = Number(fractionMatch[1]);
    const denominator = Number(fractionMatch[2]);
    if (
      Number.isFinite(numerator) &&
      Number.isFinite(denominator) &&
      denominator > 0 &&
      numerator >= 0 &&
      numerator <= denominator
    ) {
      return { numerator, denominator };
    }
  }

  const decimal = Number(normalized);
  if (!Number.isFinite(decimal) || decimal <= 0 || decimal > 1) return null;
  if (decimal === 0.25) return { numerator: 1, denominator: 4 };
  if (decimal === 0.5) return { numerator: 1, denominator: 2 };
  if (decimal === 0.75) return { numerator: 3, denominator: 4 };
  return null;
}

export function promptReferencesVisual(text: string | null | undefined): boolean {
  const normalized = normalizePromptText(text);
  return /\b(figure|image|schema|dessin|forme|rectangle|carre|cercle|disque|gateau|tarte|pizza|camembert|barre|bande|segment|bar model|barmodel)\b/.test(normalized)
    || /\b(partie|portion)\s+coloree\b/.test(normalized);
}

export function getRecoverableFraction(question: any): { numerator: number; denominator: number } | null {
  if (!question) return null;

  if (question.kind === "single" || question.kind === "multi") {
    const correctChoice = Array.isArray(question.choices)
      ? question.choices.find((choice: any) => choice.correct === true)
      : null;
    const correctFraction = parseFractionText(correctChoice?.label);
    if (correctFraction) return correctFraction;

    if (Array.isArray(question.choices)) {
      for (const choice of question.choices) {
        const fraction = parseFractionText(choice?.label);
        if (fraction) return fraction;
      }
    }
  }

  if (question.kind === "numeric" && question.answerFormat === "fraction") {
    const fractionAnswer = question.fractionAnswer;
    if (
      Number.isFinite(fractionAnswer?.numerator) &&
      Number.isFinite(fractionAnswer?.denominator) &&
      fractionAnswer.denominator > 0 &&
      fractionAnswer.numerator >= 0 &&
      fractionAnswer.numerator <= fractionAnswer.denominator
    ) {
      return { numerator: fractionAnswer.numerator, denominator: fractionAnswer.denominator };
    }
  }

  return null;
}

export function inferPromptFigure(question: any): PromptFigureSpec | null {
  const normalized = normalizePromptText(question?.prompt);
  if (!promptReferencesVisual(normalized)) return null;

  const pieLike = /\b(cercle|disque|gateau|tarte|pizza|camembert)\b/.test(normalized);
  const rectLike = /\b(rectangle|carre|barre|bande|segment|bar model|barmodel)\b/.test(normalized);
  const genericLike = /\b(figure|image|schema|dessin|forme)\b/.test(normalized);
  const hasColoredReference = /\b(partie\s+coloree|parties?\s+colorees?|portion\s+coloree|portions\s+colorees?|colore(?:e|es|s)?)\b/.test(normalized);

  const splitMatch = normalized.match(/(?:divis(?:e|ee|es|ees)?|decoup(?:e|ee|es|ees)?|partag(?:e|ee|es|ees)?|fractionn(?:e|ee|es|ees)?)\s+en\s+(\d+)\s+parties?\s+egales?/);
  const partsMatch = normalized.match(/\ben\s+(\d+)\s+parties?\s+egales?\b/);
  const coloredMatch = normalized.match(/dont\s+(\d+)\s+(?:est|sont)?\s*colore(?:e|es|s)?/);

  const total = Number(splitMatch?.[1] ?? partsMatch?.[1] ?? Number.NaN);
  const colored = Number(coloredMatch?.[1] ?? Number.NaN);
  if (Number.isFinite(total) && Number.isFinite(colored) && total > 0 && colored >= 0 && colored <= total) {
    return { kind: pieLike ? "pie" : "rect", total, colored };
  }

  if (!hasColoredReference) return null;

  const fraction = getRecoverableFraction(question);
  if (!fraction) return null;

  if (pieLike) {
    return { kind: "pie", total: fraction.denominator, colored: fraction.numerator };
  }

  if (rectLike || genericLike) {
    return { kind: "rect", total: fraction.denominator, colored: fraction.numerator };
  }

  return null;
}

export function buildReadonlyContextVisual(spec: PromptFigureSpec) {
  if (spec.kind === "pie") {
    return {
      subtype: "pie",
      correctColoredCount: spec.colored,
      segments: Array.from({ length: spec.total }, (_, index) => ({
        id: `s${index + 1}`,
        value: 1,
        colored: index < spec.colored,
      })),
    };
  }

  return {
    subtype: "bar",
    totalParts: spec.total,
    coloredParts: spec.colored,
    orientation: "horizontal",
  };
}
