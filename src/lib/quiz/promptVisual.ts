export type PromptFigureSpec =
  | { kind: "rect"; total: number; colored: number }
  | { kind: "pie"; total: number; colored: number }
  | {
      kind: "geometry_figure";
      shape:
        | "triangle"
        | "rectangle"
        | "square"
        | "circle"
        | "rhombus"
        | "parallelogram"
        | "trapezoid"
        | "pentagon"
        | "hexagon"
        | "polygon"
        | "cube"
        | "cuboid"
        | "cylinder"
        | "cone"
        | "sphere";
      label?: string;
    }
  | {
      kind: "triangle";
      labels: [string, string, string];
      rightAngleAt?: string;
      angleLabel?: { vertex: string; degrees: number };
      sideLabels?: Record<string, string>;
      targetSide?: string;
    };

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
  return /\b(figure|image|schema|dessin|forme|triangle|rectangle|carre|cercle|disque|losange|parallelogramme|trapeze|pentagone|hexagone|polygone|cube|pave droit|pave|cylindre|cone|sphere|boule|solide|gateau|tarte|pizza|camembert|barre|bande|segment|bar model|barmodel)\b/.test(normalized)
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
  const prompt = question?.prompt || "";
  const triangle = inferTriangleFigure(prompt);
  if (triangle) return triangle;

  const normalized = normalizePromptText(prompt);
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

  if (!hasColoredReference) {
    return inferGeometryFigure(prompt);
  }

  const fraction = getRecoverableFraction(question);
  if (!fraction) return null;

  if (pieLike) {
    return { kind: "pie", total: fraction.denominator, colored: fraction.numerator };
  }

  if (rectLike || genericLike) {
    return { kind: "rect", total: fraction.denominator, colored: fraction.numerator };
  }

  return inferGeometryFigure(prompt);
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

  if (spec.kind === "triangle") {
    return {
      subtype: "triangle",
      labels: spec.labels,
      rightAngleAt: spec.rightAngleAt,
      angleLabel: spec.angleLabel,
      sideLabels: spec.sideLabels,
      targetSide: spec.targetSide,
    };
  }

  if (spec.kind === "geometry_figure") {
    return {
      subtype: "geometry_figure",
      shape: spec.shape,
      label: spec.label,
    };
  }

  return {
    subtype: "bar",
    totalParts: spec.total,
    coloredParts: spec.colored,
    orientation: "horizontal",
  };
}

function inferGeometryFigure(prompt: string): PromptFigureSpec | null {
  const normalized = normalizePromptText(prompt);
  if (!normalized) return null;

  const shapes: Array<{ shape: Extract<PromptFigureSpec, { kind: "geometry_figure" }>["shape"]; pattern: RegExp; label: string }> = [
    { shape: "square", pattern: /\bcarre\b/, label: "Carré" },
    { shape: "rectangle", pattern: /\brectangle\b/, label: "Rectangle" },
    { shape: "circle", pattern: /\b(cercle|disque)\b/, label: "Cercle" },
    { shape: "rhombus", pattern: /\blosange\b/, label: "Losange" },
    { shape: "parallelogram", pattern: /\bparallelogramme\b/, label: "Parallélogramme" },
    { shape: "trapezoid", pattern: /\btrapeze\b/, label: "Trapèze" },
    { shape: "pentagon", pattern: /\bpentagone\b/, label: "Pentagone" },
    { shape: "hexagon", pattern: /\bhexagone\b/, label: "Hexagone" },
    { shape: "cube", pattern: /\bcube\b/, label: "Cube" },
    { shape: "cuboid", pattern: /\b(pave droit|pave|parallelepipede)\b/, label: "Pavé droit" },
    { shape: "cylinder", pattern: /\bcylindre\b/, label: "Cylindre" },
    { shape: "cone", pattern: /\bcone\b/, label: "Cône" },
    { shape: "sphere", pattern: /\b(sphere|boule)\b/, label: "Sphère" },
    { shape: "polygon", pattern: /\bpolygone\b/, label: "Polygone" },
  ];

  const match = shapes.find((candidate) => candidate.pattern.test(normalized));
  if (!match) return null;
  return { kind: "geometry_figure", shape: match.shape, label: match.label };
}

function canonicalSide(a: string, b: string): string {
  return [a.toUpperCase(), b.toUpperCase()].sort().join("");
}

function inferTriangleFigure(prompt: string): PromptFigureSpec | null {
  if (!prompt) return null;
  const normalized = normalizePromptText(prompt);
  if (!/\btriangle\b/.test(normalized)) return null;

  const triangleMatch = prompt.match(/\btriangle\s+([A-Z])([A-Z])([A-Z])\b/i);
  const labels = triangleMatch
    ? (triangleMatch.slice(1, 4).map((label) => label.toUpperCase()) as [string, string, string])
    : (["A", "B", "C"] as [string, string, string]);

  const rightAngleMatch = prompt.match(/\brectangle\s+en\s+([A-Z])\b/i);
  const rightAngleAt = rightAngleMatch?.[1]?.toUpperCase();

  const angleMatch = prompt.match(/\bangle\s+([A-Z])([A-Z])([A-Z])\s+(?:mesure|=|vaut)\s*(\d+(?:[,.]\d+)?)\s*°?/i);
  const angleLabel = angleMatch
    ? {
        vertex: angleMatch[2].toUpperCase(),
        degrees: Number(angleMatch[4].replace(",", ".")),
      }
    : undefined;

  const sideLabels: Record<string, string> = {};
  const sidePattern = /\b(?:c[oô]t[eé]|segment|longueur)\s+([A-Z])([A-Z])\s+(?:mesure|=|vaut|de)?\s*(\d+(?:[,.]\d+)?)\s*(cm|mm|m|km)?/gi;
  for (const match of prompt.matchAll(sidePattern)) {
    const value = match[3].replace(",", ".");
    const unit = match[4] ? ` ${match[4]}` : "";
    sideLabels[canonicalSide(match[1], match[2])] = `${value}${unit}`;
  }

  const targetMatch = prompt.match(/\b(?:calculez|calculer|trouver|determinez|déterminez)\s+(?:la\s+)?(?:longueur\s+du\s+)?c[oô]t[eé]\s+([A-Z])([A-Z])\b/i);
  const targetSide = targetMatch ? canonicalSide(targetMatch[1], targetMatch[2]) : undefined;

  return {
    kind: "triangle",
    labels,
    rightAngleAt,
    angleLabel: Number.isFinite(angleLabel?.degrees) ? angleLabel : undefined,
    sideLabels: Object.keys(sideLabels).length ? sideLabels : undefined,
    targetSide,
  };
}
