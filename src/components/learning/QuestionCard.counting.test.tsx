import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { CountingQ } from '@/types/quiz-bank';
import { QuestionCard } from './QuestionCard';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const question: CountingQ = {
  id: 'count-bank-1',
  kind: 'counting',
  prompt: 'Start with 12 apples. Add one group of ten. How many altogether?',
  object: 'apple',
  startingGroups: 1,
  startingOnes: 2,
  groupsToAdd: 1,
  answerChoices: [22, 12, 32, 23],
};

describe('counting quiz-bank question rendering', () => {
  it('shows the grouped object model and add control before the answer choices', () => {
    const html = renderToStaticMarkup(<QuestionCard question={question} />);
    expect(html).toContain('data-testid="quiz-counting-question"');
    expect(html).toContain('Add one group of ten');
    expect(html).toContain('data-testid="countable-group"');
    expect(html).not.toContain('aria-label="Choose how many apples there are"');
  });
});
