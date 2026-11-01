export type MathTaskIntent =
  | 'division'
  | 'fraction_encadrement'
  | 'fraction_comparison'
  | 'fraction_simplification'
  | 'ambiguous_fraction'
  | 'other';

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const FRACTION = /\b\d+\s*\/\s*\d+\b|\\frac\s*\{/i;

/**
 * Detects the requested mathematical task before interpreting punctuation.
 * A slash in a fraction is deliberately ambiguous until the surrounding
 * instruction says that the learner wants a division.
 */
export function detectMathTaskIntent(source: string): MathTaskIntent {
  const value = normalize(source);
  const hasFraction = FRACTION.test(value);
  if (!hasFraction) {
    return /[÷]/.test(value) || /\b(?:divis\w*|quotient|reste|partag\w*|groupes? de)\b/.test(value)
      ? 'division'
      : 'other';
  }

  if (/\b(?:encadr\w*|encadrement|entre deux entiers|borne\w*|compris entre)\b/.test(value)) {
    return 'fraction_encadrement';
  }
  if (/\b(?:compar\w*|plus grand|plus petit|superieur|inferieur|ordre croissant|ordre decroissant|ranger\w*)\b/.test(value)) {
    return 'fraction_comparison';
  }
  if (/\b(?:simplif\w*|redui\w*|irreductible|irred\w*|mettre sous forme)\b/.test(value)) {
    return 'fraction_simplification';
  }
  if (
    /[÷]/.test(value) ||
    /\b(?:divis\w*|quotient|division euclidienne|effectu\w*|calcul\w*|pos\w*)\b/.test(value)
  ) {
    return 'division';
  }

  return /^\s*\d+\s*\/\s*\d+\s*$/.test(value) ? 'ambiguous_fraction' : 'other';
}

export function isExplicitDivisionTask(source: string): boolean {
  return detectMathTaskIntent(source) === 'division';
}
