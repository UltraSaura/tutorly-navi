import { describe, expect, it } from 'vitest';
import { createSubtractionWithDotsExercise, isValidSubtractionWithDotsExercise, makeSubtractionWithDotsChoices, makeSubtractionWithDotsEquationChoices, subtractionWithDotsTotal } from './subtractionWithDots';

describe('subtraction with bubbles', () => {
  it('creates a valid within-ten subtraction and four unique answers', () => {
    const exercise = createSubtractionWithDotsExercise(() => 0);
    expect(exercise.targetCount).toBe(6);
    expect(subtractionWithDotsTotal(exercise)).toBe(5);
    expect(exercise.answerChoices).toHaveLength(4);
    expect(new Set(exercise.answerChoices).size).toBe(4);
    expect(isValidSubtractionWithDotsExercise(exercise)).toBe(true);
  });

  it('rejects an impossible take-away amount', () => {
    expect(isValidSubtractionWithDotsExercise({ id: 'bad', targetCount: 6, takeAway: 6, answerChoices: [0, 1, 2, 3] })).toBe(false);
  });

  it('keeps answer options in the count-to-ten range', () => {
    for (const answer of [1, 2, 5, 9]) {
      const choices = makeSubtractionWithDotsChoices(answer, () => 0.5);
      expect(choices).toHaveLength(4);
      expect(choices).toContain(answer);
      expect(new Set(choices).size).toBe(4);
      expect(choices.every((choice) => choice >= 0 && choice <= 10)).toBe(true);
    }
  });

  it('offers the matching subtraction expression first', () => {
    expect(makeSubtractionWithDotsEquationChoices(8, 5)[0]).toBe('8 − 5');
  });
});
