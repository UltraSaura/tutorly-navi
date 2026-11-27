import { describe, expect, it } from 'vitest';
import { addRationals, bestDiscreteLineFit, clampGrid, equivalentNumerator, expectedFractionSteps, gradePartCount, graphToPixel, isPointCorrect, parseRationalAnswer, pixelToGraph, rational, linearRegression, residuals, sumSquaredError } from './math';
import { InteractiveActivitySchema } from './activityContract';
describe('exact fraction arithmetic', () => {
  it('normalizes and rejects zero denominator', () => {
    expect(rational(2, 4)).toEqual({ numerator: 1n, denominator: 2n });
    expect(rational(-1, -2)).toEqual({ numerator: 1n, denominator: 2n });
    expect(() => rational(1, 0)).toThrow();
  });
  it('accepts equivalent exact answers and rejects malformed or zero-denominator answers', () => {
    for (const answer of ['3/4', '6/8', '0.75', '0,75']) expect(parseRationalAnswer(answer)).toEqual(rational(3, 4));
    expect(parseRationalAnswer('-2/4')).toEqual(rational(-1, 2));
    for (const answer of ['', '3/', '1/0', 'abc', '1/2/3', '0,7.5']) expect(parseRationalAnswer(answer)).toBeNull();
  });
  it('adds without denominator addition', () => {
    expect(addRationals(rational(3, 4), rational(1, 2))).toEqual({ numerator: 5n, denominator: 4n });
    expect(addRationals(rational(1, 2), rational(1, 4))).toEqual({ numerator: 3n, denominator: 4n });
    expect(expectedFractionSteps({ n: 3, d: 4 }, { n: 1, d: 2 }, 4).rightParts).toBe(2);
    expect(expectedFractionSteps({ n: 3, d: 4 }, { n: 1, d: 2 }, 4).totalParts).toBe(5);
    expect(() => equivalentNumerator(1, 3, 4)).toThrow();
  });
});
describe('coordinate transform', () => {
  it('inverts the y axis exactly', () => {
    expect(graphToPixel(2, 3)).toEqual({ x: 230, y: 105 });
    expect(pixelToGraph(230, 105)).toEqual({ x: 2, y: 3 });
    expect(clampGrid(9, -5, 5)).toBe(5);
    expect(isPointCorrect(2, 3, { x: 2, y: 3 })).toBe(true);
    expect(isPointCorrect(2, -3, { x: 2, y: 3 })).toBe(false);
  });
});
describe('strict answer grading', () => {
  it('rejects partial numeric matches and grades only whole numbers', () => {
    expect(gradePartCount('2', 2)).toBe('correct');
    expect(gradePartCount('3', 2)).toBe('incorrect');
    expect(gradePartCount('2/4', 2)).toBe('invalid');
    expect(gradePartCount('answer 2', 2)).toBe('invalid');
  });
});
describe('activity contract', () => {
  it('accepts valid fraction and rejects fabricated/inconsistent diagram', () => {
    const base = { schemaVersion: 1, id: 'a', title: 'Fraction', prompt: 'Convertis' };
    expect(InteractiveActivitySchema.safeParse({ ...base, kind: 'fraction-bar', left: { n: 3, d: 4 }, right: { n: 1, d: 2 }, targetDenominator: 4 }).success).toBe(true);
    expect(InteractiveActivitySchema.safeParse({ ...base, kind: 'fraction-bar', left: { n: 3, d: 4 }, right: { n: 1, d: 3 }, targetDenominator: 4 }).success).toBe(false);
    expect(InteractiveActivitySchema.safeParse({ ...base, kind: 'coordinate-plane', target: { x: 8, y: 2 } }).success).toBe(false);
  });
});

describe('selectable fraction-bar contract', () => {
  const base = { schemaVersion: 1, id: 'select-3-quarters', title: 'Construire 3/4', prompt: 'Colorie les cases', schoolLevel: 'CM2', kind: 'fraction-select' };
  it('accepts 3/4 and rejects impossible selections', () => {
    expect(InteractiveActivitySchema.safeParse({ ...base, target: { n: 3, d: 4 } }).success).toBe(true);
    expect(InteractiveActivitySchema.safeParse({ ...base, target: { n: 5, d: 4 } }).success).toBe(false);
    expect(InteractiveActivitySchema.safeParse({ ...base, target: { n: 3, d: 0 } }).success).toBe(false);
    expect(InteractiveActivitySchema.safeParse({ ...base, target: { n: 1.5, d: 4 } }).success).toBe(false);
  });
});

describe('interactive algebra, functions and line fitting', () => {
  const base = { schemaVersion: 1, id: 'test', title: 'Test', prompt: 'Essaye', schoolLevel: '4e' };
  it('validates bounded algebra tiles and rejects impossible targets', () => {
    expect(InteractiveActivitySchema.safeParse({ ...base, kind: 'algebra-tiles', target: { x: 2, units: 3 } }).success).toBe(true);
    expect(InteractiveActivitySchema.safeParse({ ...base, kind: 'algebra-tiles', target: { x: -1, units: 3 } }).success).toBe(false);
    expect(InteractiveActivitySchema.safeParse({ ...base, kind: 'algebra-tiles', target: { x: 0, units: 0 } }).success).toBe(false);
  });
  it('validates graph handle positions', () => {
    expect(InteractiveActivitySchema.safeParse({ ...base, kind: 'linear-function', target: { m: 2, b: 1 } }).success).toBe(true);
    expect(InteractiveActivitySchema.safeParse({ ...base, kind: 'linear-function', target: { m: 3, b: 3 } }).success).toBe(false);
  });
  it('computes least-squares optimum and detects worse fits', () => {
    const points = [{ x: -2, y: -2 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 3 }, { x: 2, y: 5 }];
    const fit = linearRegression(points);
    expect(fit.slope).toBeCloseTo(1.7);
    expect(fit.intercept).toBeCloseTo(1.4);
    expect(sumSquaredError(points, 1.7, 1.4)).toBeCloseTo(0.3);
    expect(sumSquaredError(points, 1, 1)).toBeGreaterThan(sumSquaredError(points, fit.slope, fit.intercept));
    expect(InteractiveActivitySchema.safeParse({ ...base, kind: 'line-fit', points }).success).toBe(true);
    expect(InteractiveActivitySchema.safeParse({ ...base, kind: 'line-fit', points: [{ x: 0, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 3 }] }).success).toBe(false);
  });
  it('computes observed-minus-predicted residuals and the best reachable slider fit', () => {
    const points = [{ x: -2, y: -2 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 3 }, { x: 2, y: 5 }];
    const rows = residuals(points, 1.7, 1.4);
    expect(rows[1].residual).toBeCloseTo(0.3);
    expect(rows[2].residual).toBeCloseTo(-0.4);
    expect(rows.reduce((sum, row) => sum + row.squaredResidual, 0)).toBeCloseTo(0.3);
    const best = bestDiscreteLineFit(points);
    expect(best.slope).toBe(1.7);
    expect(best.intercept).toBe(1.4);
    expect(best.error).toBeCloseTo(0.3);
    expect(() => residuals([{ x: Number.NaN, y: 0 }], 1, 0)).toThrow();
    expect(() => sumSquaredError([], 1, 0)).toThrow();
  });
  it('validates transfer data and remains compatible with older activity schemas', () => {
    const base = { schemaVersion: 1, id: 'transfer', title: 'Transfert', prompt: 'Essaie', schoolLevel: 'CM2' };
    expect(InteractiveActivitySchema.safeParse({ ...base, kind: 'fraction-bar', left: { n: 3, d: 4 }, right: { n: 1, d: 2 }, targetDenominator: 4, transfer: { left: { n: 1, d: 4 }, right: { n: 1, d: 2 }, targetDenominator: 4 } }).success).toBe(true);
    expect(InteractiveActivitySchema.safeParse({ ...base, kind: 'fraction-bar', left: { n: 3, d: 4 }, right: { n: 1, d: 2 }, targetDenominator: 4 }).success).toBe(true);
    expect(InteractiveActivitySchema.safeParse({ ...base, kind: 'line-fit', points: [{ x: -1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 2 }], interpretation: { examplePointIndex: 1, questionPointIndex: 1 } }).success).toBe(false);
  });
});
