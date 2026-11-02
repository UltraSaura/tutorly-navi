import { describe, expect, it } from 'vitest';
import { resolveExerciseEvaluation } from './AIResponse';

describe('AIResponse local exercise evaluation', () => {
  it.each([
    ['Encadrer 7/3 entre deux entiers consécutifs', '2 et 3', true],
    ['Encadrer 7/3 entre deux fractions', '2 et 5', false],
    ['Encadrer 7/3 entre deux fractions', '2/1 et 5/1', true],
    ['Encadrer 7/3 entre deux fractions', '6/3 et 8/3', true],
    ['Encadrer 7/3 entre deux fractions', '7/2 et 7/3', false],
  ])('resolves %s / %s without provider status', (question, answer, isCorrect) => {
    const result = resolveExerciseEvaluation(question, answer, false, false);
    expect(result.localResult).not.toBeNull();
    expect(result.isCorrect).toBe(isCorrect);
    expect(result.isIncorrect).toBe(!isCorrect);
  });

  it('keeps unanswered exercises unevaluated', () => {
    const result = resolveExerciseEvaluation('Encadrer 7/3 entre deux fractions', '', false, false);
    expect(result.localResult).toBeNull();
    expect(result.isCorrect).toBe(false);
    expect(result.isIncorrect).toBe(false);
  });
});
