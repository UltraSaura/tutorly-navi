import { describe, expect, it } from 'vitest';
import { getStepperExpression } from './stepperExpression';

describe('getStepperExpression', () => {
  it('uses the exact arithmetic displayed in the exercise', () => {
    expect(getStepperExpression('33*3')).toBe('33 * 3');
    expect(getStepperExpression('22*4', '33 × 4')).toBe('22 * 4');
  });

  it('normalizes supported division symbols for the long-division animator', () => {
    expect(getStepperExpression('Pose la division 33:3')).toBe('33 ÷ 3');
  });

  it('extracts an operation from exercise text before using a generated example', () => {
    expect(getStepperExpression('Calculate 18 + 7', '24 + 9')).toBe('18 + 7');
  });

  it('uses the supplied worked example when the exercise has no explicit operation', () => {
    expect(getStepperExpression('Find the total', '14 × 3 = 42')).toBe('14 × 3');
  });
});
