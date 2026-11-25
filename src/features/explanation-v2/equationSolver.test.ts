import { describe, expect, it } from 'vitest';
import { InteractiveActivitySchema } from './activityContract';
import { equationSteps, equationText, equivalentStates, parseRational, rational, rationalText, satisfiesEquation, solutionOf } from './equationSolver';

describe('IM-D02 exact equation decomposition', () => {
  it('solves 3x + 5 = 20 with subtract, divide and verified substitution', () => {
    const input = { a: 3, b: 5, c: 20 };
    const steps = equationSteps(input);
    expect(steps.map(s => s.id)).toEqual(['subtract-constant', 'divide', 'verify']);
    expect(steps[0].before).toBe('3x + 5 = 20');
    expect(steps[0].after).toBe('3x = 15');
    expect(steps[1].after).toBe('x = 5');
    expect(steps[2].after).toBe('20 = 20  ✓');
    expect(satisfiesEquation(input, solutionOf(input))).toBe(true);
  });
  it('regroups variables on both sides without losing equivalence', () => {
    const input = { a: 5, b: -4, d: 2, c: 8 };
    const steps = equationSteps(input);
    expect(steps.map(s => s.id)).toEqual(['subtract-variable', 'subtract-constant', 'divide', 'verify']);
    expect(steps[0].after).toBe('3x − 4 = 8');
    expect(steps[1].after).toBe('3x = 12');
    expect(steps[2].after).toBe('x = 4');
    expect(steps[3].after).toBe('16 = 16  ✓');
  });
  it('solves negative coefficient with an exact rational answer', () => {
    const input = { a: -2, b: 3, c: 8 };
    const steps = equationSteps(input);
    expect(steps[0].after).toBe('-2x = 5');
    expect(steps[1].after).toBe('x = -5/2');
    expect(steps[2].after).toBe('8 = 8  ✓');
    expect(solutionOf(input)).toEqual({ n: -5, d: 2 });
  });
  it('handles subtracting negative variables and constant, zero solution and coefficient one', () => {
    expect(equationSteps({ a: 2, b: -5, d: -1, c: 1 })[0].choice).toContain('Ajouter x');
    expect(equationSteps({ a: 1, b: 0, c: 0 }).map(s => s.id)).toEqual(['verify']);
    expect(solutionOf({ a: -3, b: 6, c: 6 })).toEqual({ n: 0, d: 1 });
  });
  it('normalizes rational input and rejects invalid formats and zero denominator', () => {
    expect(rational(-10, -4)).toEqual({ n: 5, d: 2 });
    expect(rationalText(rational(0, -8))).toBe('0');
    expect(parseRational(' -10 / 4 ')).toEqual({ n: -5, d: 2 });
    for (const value of ['1/0', '0/0', '1.25', '2/3/4', 'NaN', '1e3', '', '1234']) expect(parseRational(value)).toBeNull();
  });
  it('rejects equations with no unique solution in the schema and solver', () => {
    const base = { schemaVersion: 1, id: 'eq', kind: 'equation-decomposition', title: 'Équation', prompt: 'Trouve x', a: 2, b: 4, c: 8, d: 2 };
    expect(InteractiveActivitySchema.safeParse(base).success).toBe(false);
    expect(() => solutionOf(base)).toThrow(/unique solution/);
    expect(InteractiveActivitySchema.safeParse({ ...base, d: 0 }).success).toBe(true);
    expect(InteractiveActivitySchema.safeParse({ ...base, a: 20, d: 0 }).success).toBe(false);
  });
  it('checks all generated integer transformations preserve the solution for a broad bounded grid', () => {
    let tested = 0;
    for (let a = -8; a <= 8; a += 2) for (let d = -8; d <= 8; d += 3) {
      if (a === d) continue;
      for (let b = -20; b <= 20; b += 5) for (let c = -20; c <= 20; c += 7) {
        const input = { a, b, c, d };
        const solution = solutionOf(input);
        const steps = equationSteps(input);
        expect(satisfiesEquation(input, solution)).toBe(true);
        expect(steps[steps.length - 1]?.id).toBe('verify');
        for (const step of steps) {
          if (step.afterState) expect(equivalentStates(step.beforeState, step.afterState)).toBe(true);
        }
        tested++;
      }
    }
    expect(tested).toBeGreaterThan(2500);
  });
  it('formats zero variable coefficients as constants and preserves negative values', () => {
    expect(equationText({ a: 0, b: -3, d: -1, c: -4 })).toBe('-3 = −x − 4');
  });
});
