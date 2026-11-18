import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { QuestionCard } from './QuestionCard';
import { createCoordinateExercise } from '@/features/practice/coordinatePlane';
import type { Question } from '@/types/quiz-bank';

const permission = vi.hoisted(() => ({ allowed: true }));
vi.mock('@/hooks/useCoordinateEligibility', () => ({ useCoordinateEligibility: () => ({ allowed: permission.allowed, pending: false, sessionKey: 'synthetic-fr-5eme' }) }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'fr', resolvedLanguage: 'fr' } }) }));

describe('coordinate question registration', () => {
  it('renders the shared coordinate tool for an eligible learner without completing it', () => {
    permission.allowed = true;
    const markup = renderToStaticMarkup(<QuestionCard question={createCoordinateExercise()} />);
    expect(markup).toContain('data-testid="coordinate-activity"');
    expect(markup).not.toContain('data-testid="coordinate-complete"');
  });
  it('blocks an imported bank question for the wrong learner level', () => {
    permission.allowed = false;
    const markup = renderToStaticMarkup(<QuestionCard question={createCoordinateExercise()} />);
    expect(markup).toContain('role="alert"');
    expect(markup).not.toContain('data-testid="coordinate-activity"');
    permission.allowed = true;
  });
  it('rejects malformed imported geometry rather than rendering it', () => {
    const exercise = { ...createCoordinateExercise(), target: null } as unknown as Question;
    expect(renderToStaticMarkup(<QuestionCard question={exercise} />)).toContain('mal configuré');
  });
});
