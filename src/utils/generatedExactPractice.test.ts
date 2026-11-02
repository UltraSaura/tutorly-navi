import { describe, expect, it } from 'vitest';
import { buildSimilarArithmeticExercises, buildSimilarArithmeticQuiz, buildSimilarFractionBoundsQuiz } from './generatedExactPractice';
import { evaluateQuestion } from './quizEvaluation';

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

  it('creates three fraction-bounds exercises without a provider call', () => {
    const quiz = buildSimilarFractionBoundsQuiz('Encadrer 7/3 entre 2 fractions', 'fr');

    expect(quiz?.quizBankId).toBe('__generated_fraction_bounds_practice__');
    expect(quiz?.questions.map(question => question.prompt)).toEqual([
      'Encadrer 7/3 entre deux fractions.',
      'Encadrer 8/3 entre deux fractions.',
      'Encadrer 9/3 entre deux fractions.',
    ]);
    expect(quiz?.questions[0]?.kind === 'single' && quiz.questions[0].choices.some(choice => choice.label === '6/3 et 8/3' && choice.correct)).toBe(true);
    expect(quiz?.questions.every(question =>
      question.kind === 'single' && question.choices.some(choice => choice.correct),
    )).toBe(true);
    expect(quiz?.questions.every(question => {
      if (question.kind !== 'single') return false;
      const correct = question.choices.find(choice => choice.correct);
      const wrong = question.choices.find(choice => !choice.correct);
      return Boolean(correct && wrong)
        && evaluateQuestion(question, correct?.id)
        && !evaluateQuestion(question, wrong?.id);
    })).toBe(true);
  });

  it('does not claim arithmetic practice support for a non-encadrement fraction task', () => {
    expect(buildSimilarFractionBoundsQuiz('Simplifier 7/3', 'fr')).toBeNull();
  });
});
