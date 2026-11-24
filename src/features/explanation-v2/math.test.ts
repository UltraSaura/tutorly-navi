import { describe, expect, it } from 'vitest';
import { addRationals, clampGrid, equivalentNumerator, expectedFractionSteps, graphToPixel, pixelToGraph, rational } from './math';
import { InteractiveActivitySchema } from './activityContract';
describe('exact fraction arithmetic', () => {
  it('normalizes and rejects zero denominator', () => {
    expect(rational(2, 4)).toEqual({ numerator: 1n, denominator: 2n });
    expect(rational(-1, -2)).toEqual({ numerator: 1n, denominator: 2n });
    expect(() => rational(1, 0)).toThrow();
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
