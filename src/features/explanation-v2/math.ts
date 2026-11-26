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
/** Exact grading for integer, fraction, or finite decimal student input. */
export function parseRationalAnswer(raw: string): Rational | null {
  const value = raw.trim().replace(/\u2212/g, '-').replace(',', '.');
  const fraction = value.match(/^([+-]?\d+)\s*\/\s*([+-]?\d+)$/);
  if (fraction) {
    try { return rational(BigInt(fraction[1]), BigInt(fraction[2])); } catch { return null; }
  }
  if (/^[+-]?\d+$/.test(value)) {
    try { return rational(BigInt(value), 1n); } catch { return null; }
  }
  const decimal = value.match(/^([+-]?)(\d*)\.(\d+)$/);
  if (!decimal) return null;
  const places = decimal[3].length;
  const denominator = 10n ** BigInt(places);
  const whole = BigInt((decimal[2] || '0') + decimal[3]);
  return rational(decimal[1] === '-' ? -whole : whole, denominator);
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

/** Explicit answer grading: never accept a matching numeric substring. */
export function gradePartCount(raw: string, expected: number): 'correct' | 'incorrect' | 'invalid' {
  const normalized = raw.trim();
  if (!/^\d+$/.test(normalized)) return 'invalid';
  return Number(normalized) === expected ? 'correct' : 'incorrect';
}
export function isPointCorrect(x: number, y: number, target: { x: number; y: number }): boolean {
  return Number.isInteger(x) && Number.isInteger(y) && x === target.x && y === target.y;
}

/** Least-squares linear regression, deterministic and independent of UI. */
export function linearRegression(points: ReadonlyArray<{ x: number; y: number }>) {
  if (points.length < 2 || points.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y))) throw new Error('Invalid points');
  const meanX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
  const meanY = points.reduce((sum, p) => sum + p.y, 0) / points.length;
  const variance = points.reduce((sum, p) => sum + (p.x - meanX) ** 2, 0);
  if (variance === 0) throw new Error('Cannot fit a vertical line');
  const slope = points.reduce((sum, p) => sum + (p.x - meanX) * (p.y - meanY), 0) / variance;
  return { slope, intercept: meanY - slope * meanX };
}
export function sumSquaredError(points: ReadonlyArray<{ x: number; y: number }>, slope: number, intercept: number) {
  if (points.length < 2 || points.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y))) throw new Error('Invalid points');
  if (!Number.isFinite(slope) || !Number.isFinite(intercept)) throw new Error('Invalid line');
  return points.reduce((sum, p) => sum + (p.y - (slope * p.x + intercept)) ** 2, 0);
}

export function residuals(points: ReadonlyArray<{ x: number; y: number }>, slope: number, intercept: number) {
  if (!Number.isFinite(slope) || !Number.isFinite(intercept) || points.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y))) throw new Error('Invalid data');
  return points.map(point => {
    const predicted = slope * point.x + intercept;
    const residual = point.y - predicted;
    return { ...point, predicted, residual, squaredResidual: residual ** 2 };
  });
}

/** Best score actually reachable with the activity's 0.1 slider increments. */
export function bestDiscreteLineFit(points: ReadonlyArray<{ x: number; y: number }>, step = 0.1, min = -3, max = 3) {
  if (!Number.isFinite(step) || step <= 0 || !Number.isFinite(min) || !Number.isFinite(max) || min > max) throw new Error('Invalid slider range');
  let best = { slope: min, intercept: min, error: Number.POSITIVE_INFINITY };
  const count = Math.round((max - min) / step);
  for (let mIndex = 0; mIndex <= count; mIndex++) {
    const slope = Math.round((min + mIndex * step) * 1e10) / 1e10;
    for (let bIndex = 0; bIndex <= count; bIndex++) {
      const intercept = Math.round((min + bIndex * step) * 1e10) / 1e10;
      const error = sumSquaredError(points, slope, intercept);
      if (error < best.error) best = { slope, intercept, error };
    }
  }
  return best;
}
