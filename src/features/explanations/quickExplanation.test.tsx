import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  classifyDivision,
  safeDivisionExplanation,
  validateQuickExplanation,
} from './quickExplanation';
import { quickFlowTransition } from './QuickExplanationFlow';
import { QuickExplanationFlow } from './QuickExplanationFlow';

describe('validated quick division explanation', () => {
  it('keeps exact division exact and does not expose the original answer', () => {
    const source = '66 ÷ 6';
    const lesson = safeDivisionExplanation(source, 'fr');

    expect(classifyDivision(source)).toBe('exact_integer_division');
    expect(lesson.workedExample.dividend % lesson.workedExample.divisor).toBe(0);
    expect(lesson.check.dividend % lesson.check.divisor).toBe(0);
    expect(validateQuickExplanation(source, lesson, 'fr')).toEqual([]);
    expect(JSON.stringify(lesson)).not.toContain('11');
    expect(lesson.frames.map(frame => frame.body).join(' ')).not.toMatch(/reste|remainder/i);
  });

  it('distinguishes division with a remainder and preserves the invariant', () => {
    const source = '67 ÷ 6';
    const lesson = safeDivisionExplanation(source, 'fr');
    const workedRemainder = lesson.workedExample.dividend % lesson.workedExample.divisor;

    expect(classifyDivision(source)).toBe('integer_division_with_remainder');
    expect(workedRemainder).toBeGreaterThan(0);
    expect(lesson.workedExample.divisor * Math.floor(lesson.workedExample.dividend / lesson.workedExample.divisor) + workedRemainder)
      .toBe(lesson.workedExample.dividend);
    expect(workedRemainder).toBeLessThan(lesson.workedExample.divisor);
    expect(validateQuickExplanation(source, lesson, 'fr')).toEqual([]);
  });

  it('rejects mixed operands and false remainder equalities', () => {
    const lesson = safeDivisionExplanation('66 ÷ 6', 'fr');
    const invalid = {
      ...lesson,
      frames: [
        { title: 'bad', body: '13 ÷ 4 puis 50 ÷ 7 puis 29 ÷ 6' },
        { title: 'bad', body: '13 ÷ 4 = 3 reste 12' },
      ],
    };
    expect(validateQuickExplanation('66 ÷ 6', invalid, 'fr').length).toBeGreaterThan(0);
  });

  it('keeps the check answer hidden until the learner selects it and unlocks retry only when correct', () => {
    const lesson = safeDivisionExplanation('66 ÷ 6', 'fr');
    const initial = { index: lesson.frames.length + 1, choice: null };
    const wrong = quickFlowTransition(initial, { type: 'answer', choice: lesson.check.choices[0] }, lesson);
    const correct = quickFlowTransition(initial, { type: 'answer', choice: lesson.check.correctChoice }, lesson);

    expect(initial.choice).toBeNull();
    expect(wrong.choice).toBe(lesson.check.choices[0]);
    expect(correct.choice).toBe(lesson.check.correctChoice);
  });

  it('renders the active flow without the legacy completion action', () => {
    const lesson = safeDivisionExplanation('66 ÷ 6', 'fr');
    const html = renderToStaticMarkup(<QuickExplanationFlow lesson={lesson} language="fr" />);

    expect(html).toContain('L’idée à comprendre');
    expect(html).toContain(`1/${lesson.frames.length + 2}`);
    expect(html).not.toContain("J’ai compris");
    expect(html).not.toContain(`>${lesson.check.correctChoice}<`);
  });
});
