import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  classifyDivision,
  safeDivisionExplanation,
  validateQuickExplanation,
} from './quickExplanation';
import { quickFlowTransition } from './QuickExplanationFlow';
import { QuickExplanationFlow, visibleGroupsForPhase } from './QuickExplanationFlow';
import { canonicalLessonRoute, resolveCanonicalSkill } from './canonicalSkill';

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
    expect(lesson.frames.length).toBeGreaterThanOrEqual(3);
    expect(lesson.canonicalSkill.skillId).toBe('fr.cm2.math.division.exact_integer');
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
    const initial = { index: lesson.frames.length + 1, choice: null, validated: false, wrongAttempts: 0, showReasoning: false };
    const selected = quickFlowTransition(initial, { type: 'select', choice: lesson.check.correctChoice }, lesson);
    const correct = quickFlowTransition(selected, { type: 'validate' }, lesson);

    expect(initial.choice).toBeNull();
    expect(selected.validated).toBe(false);
    expect(correct.choice).toBe(lesson.check.correctChoice);
    expect(correct.validated).toBe(true);
  });

  it('resolves the same canonical strategy and visual for the Lesson tab', () => {
    const exact = resolveCanonicalSkill('66 ÷ 6', 'CM2', 'France');
    const remainder = resolveCanonicalSkill('73 ÷ 8', 'CM2', 'France');
    expect(exact.preferredStrategy).toBe('inverse multiplication');
    expect(exact.preferredVisual).toBe('equal_groups_or_array');
    expect(remainder.preferredVisual).toBe('equal_groups_with_remainder');
    expect(remainder.constraints.remainderLessThanDivisor).toBe(true);
    expect(canonicalLessonRoute('mathematiques', 'division')).toBe('/learning/mathematiques/division');
  });

  it('requires explicit validation and escalates hints after wrong attempts', () => {
    const lesson = safeDivisionExplanation('66 ÷ 6', 'fr');
    const index = lesson.frames.length + 1;
    let state = { index, choice: null as string | null, validated: false, wrongAttempts: 0, showReasoning: false };
    state = quickFlowTransition(state, { type: 'select', choice: lesson.check.choices[0] }, lesson);
    expect(state.validated).toBe(false);
    state = quickFlowTransition(state, { type: 'validate' }, lesson);
    expect(state.wrongAttempts).toBe(1);
    state = quickFlowTransition({ ...state, choice: lesson.check.choices[0] }, { type: 'validate' }, lesson);
    expect(state.wrongAttempts).toBe(2);
    state = quickFlowTransition({ ...state, choice: lesson.check.choices[0] }, { type: 'validate' }, lesson);
    expect(state.showReasoning).toBe(true);
  });

  it('renders the active flow without the legacy completion action', () => {
    const lesson = safeDivisionExplanation('66 ÷ 6', 'fr');
    const html = renderToStaticMarkup(<QuickExplanationFlow lesson={lesson} language="fr" />);

    expect(html).toContain('Comprendre');
    expect(html).toContain(`1/${lesson.frames.length + 2}`);
    expect(html).not.toContain("J’ai compris");
    expect(html).not.toContain(`>${lesson.check.correctChoice}<`);
    expect(html).not.toContain('groups of');
    expect(html).toContain('72 au total');
  });

  it('progresses the canonical visual through grouping and verification phases', () => {
    const exact = safeDivisionExplanation('66 ÷ 6', 'fr');
    const remainder = safeDivisionExplanation('67 ÷ 6', 'fr');
    expect(visibleGroupsForPhase(exact, 'show_total')).toBe(0);
    expect(visibleGroupsForPhase(exact, 'form_groups')).toBe(9);
    expect(visibleGroupsForPhase(exact, 'verify')).toBe(9);
    expect(visibleGroupsForPhase(remainder, 'show_remainder')).toBe(Math.floor(remainder.workedExample.dividend / remainder.workedExample.divisor));
    expect(remainder.frames.some(frame => frame.visualPhase === 'show_remainder')).toBe(true);
  });
});
