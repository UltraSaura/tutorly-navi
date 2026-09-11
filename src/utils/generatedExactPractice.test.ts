import { describe, expect, it } from 'vitest';
import { buildSimilarArithmeticExercises, buildSimilarArithmeticQuiz } from './generatedExactPractice';

describe('generated exact practice', () => {
  it('keeps the trailing-zero multiplication structure', () => {
    const practice = buildSimilarArithmeticExercises('300 × 43');

    expect(practice).toEqual([
      '200 × 42',
      '300 × 53',
      '400 × 64',
    ]);
  });

  it('keeps division digit counts and remainder answers', () => {
    const practice = buildSimilarArithmeticExercises('100 ÷ 45');

    expect(practice).toEqual([
      '233 ÷ 42',
      '344 ÷ 53',
      '455 ÷ 64',
    ]);
  });

  it('creates a normal quiz with questions matching the animated format', () => {
    const quiz = buildSimilarArithmeticQuiz('100 ÷ 45', 'en');

    expect(quiz?.quizBankId).toBe('__generated_similar_practice__');
    expect(quiz?.questions.map(question => question.prompt)).toEqual([
      '233 ÷ 42 = ?',
      '344 ÷ 53 = ?',
      '455 ÷ 64 = ?',
    ]);
    expect(quiz?.questions.every(question =>
      question.kind === 'single' && question.choices.some(choice => choice.correct && choice.label.includes('remainder')),
    )).toBe(true);
  });
});
