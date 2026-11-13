import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { CountingQ } from '@/types/quiz-bank';
import type { AdditionAcrossTenQ } from '@/types/quiz-bank';
import type { SubtractionWithDotsQ } from '@/types/quiz-bank';
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

describe('addition across ten quiz-bank question rendering', () => {
  it('shows the ten-frame model and move action before answer choices', () => {
    const question: AdditionAcrossTenQ = {
      id: 'bridge-247-8',
      kind: 'addition-across-ten',
      prompt: 'Start at 247. Add 8. Fill the next ten, then choose the total.',
      startNumber: 247,
      addend: 8,
      answerChoices: [255, 254, 256, 265],
    };
    const html = renderToStaticMarkup(<QuestionCard question={question} />);
    expect(html).toContain('data-testid="quiz-addition-across-ten-question"');
    expect(html).toContain('Move one counter to the ten-frame');
    expect(html).toContain('Fill the next ten: 250');
    expect(html).not.toContain('Choose the total of 247 plus 8');
  });
});

describe('subtraction with bubbles quiz-bank rendering', () => {
  it('shows the add-bubble action before the lightning take-away step', () => {
    const question: SubtractionWithDotsQ = {
      id: 'subtract-8-5', kind: 'subtraction-with-dots', prompt: 'Add 8 bubbles, then take away 5.',
      targetCount: 8, takeAway: 5, answerChoices: [3, 2, 4, 5],
    };
    const html = renderToStaticMarkup(<QuestionCard question={question} />);
    expect(html).toContain('data-testid="quiz-subtraction-with-dots-question"');
    expect(html).toContain('Add one bubble');
    expect(html).not.toContain('Take away one bubble');
    expect(html).not.toContain('8 − 5');
  });
});
