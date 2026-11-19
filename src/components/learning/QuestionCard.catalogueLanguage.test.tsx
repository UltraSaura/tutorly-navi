import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { QuestionCard } from './QuestionCard';
import { createArithmeticQuizExercise } from '@/features/practice/arithmeticQuiz';
import { createVisualQuizDraft } from '@/features/practice/visualQuiz';
import { createGuidedFamilyExercise } from '@/features/practice/guidedFamilies';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en', resolvedLanguage: 'en' } }) }));

describe('quiz bank interactive control language', () => {
  it.each(['calculation-race', 'number-flashcards'] as const)('uses the interface language for %s controls', kind => {
    const html = renderToStaticMarkup(<QuestionCard question={createArithmeticQuizExercise(kind)} />);
    expect(html).toContain('Elapsed time');
    expect(html).not.toContain('Temps écoulé');
    expect(html).toContain('Answer choices');
  });
  it('uses the interface language for clock and guided-family controls without rewriting authored prompts', () => {
    const clock = createVisualQuizDraft('analogue-clock', 'clock');
    const clockHtml = renderToStaticMarkup(<QuestionCard question={clock} />);
    expect(clockHtml).toContain(clock.prompt);
    expect(clockHtml).toContain('Show hint');
    const groupHtml = renderToStaticMarkup(<QuestionCard question={createGuidedFamilyExercise('equal-groups', () => 0.4)} />);
    expect(groupHtml).toContain('Show hint');
    expect(groupHtml).not.toContain('Afficher un indice');
  });
});
