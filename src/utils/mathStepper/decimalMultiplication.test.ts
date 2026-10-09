import { describe, expect, it } from 'vitest';
import { buildDecimalMultiplicationSteps } from './decimalMultiplication';

describe('decimal multiplication teaching steps', () => {
  it('explains the screenshot example without duplicate steps or multiplying by an unnecessary zero', () => {
    const { result, steps } = buildDecimalMultiplicationSteps('12.5', '2.0', 'en');
    expect(result).toBe('25');
    expect(steps.map(s => s.calculation)).toEqual([
      '12.5 × 2', '125 × 2', '125 × 2 = 250', '250 ÷ 10 = 25', '12.5 × 2 = 25',
    ]);
    expect(new Set(steps.map(s => s.explanation)).size).toBe(steps.length);
    expect(steps[3].explanation).toContain('10 times too big');
  });
  it.each([
    ['0.2', '0.3', '0.06'], ['0.02', '0.03', '0.0006'],
    ['12.4', '7', '86.8'], ['1.25', '1.2', '1.5'], ['0.0', '2.0', '0'],
    ['24.5', '100', '2450'],
  ])('keeps %s × %s exact', (a, b, expected) => {
    expect(buildDecimalMultiplicationSteps(a, b, 'en').result).toBe(expected);
  });
  it('adds partial products before restoring the decimal', () => {
    const { steps } = buildDecimalMultiplicationSteps('1.25', '1.2', 'en');
    expect(steps.map(s => s.calculation)).toContain('250 + 1250 = 1500');
    expect(steps.at(-2)?.calculation).toBe('1500 ÷ 1000 = 1.5');
  });
  it('uses French wording and decimal commas', () => {
    const { result, steps } = buildDecimalMultiplicationSteps('0,2', '0,3', 'fr');
    expect(result).toBe('0,06');
    expect(steps.at(-2)?.explanation).toContain('100 fois trop grand');
    expect(steps.at(-1)?.calculation).toBe('0,2 × 0,3 = 0,06');
  });
});
