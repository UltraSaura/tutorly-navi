import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { QuestionCard } from './QuestionCard';
import { createGuidedFamilyExercise } from '@/features/practice/guidedFamilies';
import { isQuizAnswerComplete } from '@/utils/quizEvaluation';
import type { Question } from '@/types/quiz-bank';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('guided family registration in quiz and lesson question cards', () => {
  it.each(['guided-word-problem', 'equal-groups', 'colour-grid'] as const)('routes %s to its reusable activity', kind => {
    const exercise = createGuidedFamilyExercise(kind, () => 0.5);
    const markup = renderToStaticMarkup(<QuestionCard question={exercise} />);
    expect(markup).toContain(`data-testid="guided-family-${kind}"`);
    expect(markup).not.toContain('data-testid="guided-family-complete"');
    expect(isQuizAnswerComplete(exercise, undefined)).toBe(false);
  });
  it('shows a configuration error and blocks submission for malformed imported content', () => {
    const exercise = { ...createGuidedFamilyExercise('equal-groups'), groups: -1 } as Question;
    const markup = renderToStaticMarkup(<QuestionCard question={exercise} />);
    expect(markup).toContain('role="alert"');
    expect(isQuizAnswerComplete(exercise, { complete: true, selectedAnswer: 1 })).toBe(false);
  });
});
