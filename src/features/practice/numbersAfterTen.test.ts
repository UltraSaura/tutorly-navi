import { describe, expect, it } from 'vitest';
import { isCorrectNumberAfterTen, NUMBERS_AFTER_TEN_STEPS } from './numbersAfterTen';

describe('Numbers after ten practice', () => {
  it('progresses from concrete ten-and-ones quantities toward a stated quantity', () => {
    expect(NUMBERS_AFTER_TEN_STEPS.map((step) => step.target)).toEqual([11, 12, 15]);
    expect(isCorrectNumberAfterTen(12, 12)).toBe(true);
    expect(isCorrectNumberAfterTen(12, 13)).toBe(false);
    expect(isCorrectNumberAfterTen(12, 12.5)).toBe(false);
  });
});
