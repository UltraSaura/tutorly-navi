import { describe, expect, it } from 'vitest';
import { InteractiveActivitySchema } from './activityContract';
import { functionDemonstrationSteps } from './LinearFunctionActivity';
import { fractionDemonstrationSteps } from './MathDemonstration';

describe('step-by-step mathematical demonstrations', () => {
  it('derives function visual steps and explanations from target coefficients', () => {
    const steps = functionDemonstrationSteps({ m: 2, b: 1 });
    expect(steps).toHaveLength(4);
    expect(steps[0].equation).toBe('y = 0');
    expect(steps[1].equation).toBe('y = 1');
    expect(steps[2].equation).toBe('y = 2x + 1');
    expect(steps[2].visual).toEqual({ kind: 'graph', slope: 2, intercept: 1 });
    expect(steps[3].takeaway).toMatch(/b = départ, m = pente/);
  });
  it('explains negative and zero slopes without falsely saying they rise', () => {
    expect(functionDemonstrationSteps({ m: -2, b: 1 })[2].explanation).toContain('descend de 2');
    expect(functionDemonstrationSteps({ m: 0, b: -2 })[2].explanation).toContain('reste à la même hauteur');
    expect(functionDemonstrationSteps({ m: -1, b: -2 })[2].equation).toBe('y = -1x − 2');
  });
  it('shows 1/2 = 2/4, then 5/4 = 1 + 1/4 from actual values', () => {
    const spec = InteractiveActivitySchema.parse({
      schemaVersion: 1, id: 'f', title: 'Fractions', prompt: 'Additionne',
      kind: 'fraction-bar', schoolLevel: 'CM2',
      left: { n: 3, d: 4 }, right: { n: 1, d: 2 }, targetDenominator: 4,
    });
    if (spec.kind !== 'fraction-bar') throw new Error('Expected fraction');
    const steps = fractionDemonstrationSteps(spec);
    expect(steps).toHaveLength(4);
    expect(steps[1].equation).toBe('1/2 = 2/4');
    expect(steps[2].equation).toBe('3/4 + 2/4 = 5/4');
    expect(steps[3].equation).toBe('5/4 = 1 + 1/4');
  });
  it('does not invent a whole when the sum is smaller than one', () => {
    const spec = InteractiveActivitySchema.parse({
      schemaVersion: 1, id: 'f2', title: 'Fractions', prompt: 'Additionne',
      kind: 'fraction-bar', left: { n: 1, d: 4 }, right: { n: 0, d: 2 }, targetDenominator: 4,
    });
    if (spec.kind !== 'fraction-bar') throw new Error('Expected fraction');
    const steps = fractionDemonstrationSteps(spec);
    expect(steps[3].equation).toBe('1/4 = 1/4');
    expect(steps[3].explanation).toMatch(/moins d’une barre entière/);
  });
});
