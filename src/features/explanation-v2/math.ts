/** Pure deterministic math: no rendering or AI-based grading. */
export type Rational = { numerator: bigint; denominator: bigint };
const abs = (x: bigint) => x < 0n ? -x : x;
function gcd(a: bigint, b: bigint): bigint {
  a = abs(a); b = abs(b);
  while (b !== 0n) { const t = a % b; a = b; b = t; }
  return a || 1n;
}
export function rational(n: number | bigint, d: number | bigint): Rational {
  const a = BigInt(n), b = BigInt(d);
  if (b === 0n) throw new Error('Zero denominator');
  const sign = b < 0n ? -1n : 1n;
  const g = gcd(a, b);
  return { numerator: sign * a / g, denominator: sign * b / g };
}
export function addRationals(a: Rational, b: Rational): Rational {
  return rational(a.numerator * b.denominator + b.numerator * a.denominator, a.denominator * b.denominator);
}
export function equivalentNumerator(n: number, d: number, targetDenominator: number): number {
  if (!Number.isSafeInteger(n) || !Number.isSafeInteger(d) || !Number.isSafeInteger(targetDenominator)
    || d <= 0 || targetDenominator <= 0 || targetDenominator % d !== 0) {
    throw new Error('Invalid equivalent fraction');
  }
  return n * (targetDenominator / d);
}
export function expectedFractionSteps(left: { n: number; d: number }, right: { n: number; d: number }, targetDenominator: number) {
  const leftParts = equivalentNumerator(left.n, left.d, targetDenominator);
  const rightParts = equivalentNumerator(right.n, right.d, targetDenominator);
  const total = addRationals(rational(left.n, left.d), rational(right.n, right.d));
  return { leftParts, rightParts, totalParts: leftParts + rightParts, total };
}
export function clampGrid(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}
export function graphToPixel(x: number, y: number, origin = 180, scale = 25) {
  return { x: origin + x * scale, y: origin - y * scale };
}
export function pixelToGraph(px: number, py: number, origin = 180, scale = 25) {
  return { x: (px - origin) / scale, y: (origin - py) / scale };
}
