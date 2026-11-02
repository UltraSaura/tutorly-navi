export type FractionValue = { numerator: number; denominator: number };

export type FractionBoundsResult = {
  target: FractionValue;
  lower: FractionValue | null;
  upper: FractionValue | null;
  isCorrect: boolean;
};

const FRACTION_PATTERN = /(-?\d+)\s*\/\s*(-?\d+)/g;
const RATIONAL_PATTERN = /-?\d+\s*\/\s*-?\d+|-?\d+/g;

function compareFractions(left: FractionValue, right: FractionValue): number {
  const difference = left.numerator * right.denominator - right.numerator * left.denominator;
  return difference === 0 ? 0 : difference < 0 ? -1 : 1;
}

function normalizeFraction(numerator: number, denominator: number): FractionValue | null {
  if (denominator === 0) return null;
  if (denominator < 0) return { numerator: -numerator, denominator: -denominator };
  return { numerator, denominator };
}

export function parseFractions(source: string): FractionValue[] {
  const fractions: FractionValue[] = [];
  for (const match of source.matchAll(FRACTION_PATTERN)) {
    const fraction = normalizeFraction(Number(match[1]), Number(match[2]));
    if (fraction) fractions.push(fraction);
  }
  return fractions;
}

/** Parses fraction or integer tokens used as bounds. Integers are valid rational bounds. */
export function parseRationalValues(source: string): FractionValue[] {
  const values: FractionValue[] = [];
  for (const match of source.matchAll(RATIONAL_PATTERN)) {
    const token = match[0].replace(/\s+/g, '');
    const [numerator, denominator = '1'] = token.split('/');
    const value = normalizeFraction(Number(numerator), Number(denominator));
    if (value) values.push(value);
  }
  return values;
}

export function formatFraction(fraction: FractionValue): string {
  return `${fraction.numerator}/${fraction.denominator}`;
}

export function evaluateFractionBounds(question: string, answer: string): FractionBoundsResult | null {
  const [target] = parseFractions(question);
  if (!target) return null;

  const answerFractions = parseRationalValues(answer);
  const lower = answerFractions
    .filter(fraction => compareFractions(fraction, target) < 0)
    .sort((a, b) => compareFractions(b, a))[0] ?? null;
  const upper = answerFractions
    .filter(fraction => compareFractions(fraction, target) > 0)
    .sort((a, b) => compareFractions(a, b))[0] ?? null;

  return {
    target,
    lower,
    upper,
    isCorrect: answerFractions.length === 2 && Boolean(lower && upper),
  };
}
