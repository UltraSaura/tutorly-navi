import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  arithmeticProblemAnswer, arithmeticQuizFraction, createArithmeticQuizDraft, createArithmeticQuizExercise, evaluateArithmeticQuiz,
  isArithmeticLessonHref, isArithmeticQuizComplete, isArithmeticQuizExercise, makeArithmeticQuizChoices, validateArithmeticQuizExercise,
  type ArithmeticQuizAnswer, type ArithmeticQuizExercise,
} from './arithmeticQuiz';
import { ArithmeticQuizActivity } from '@/components/practice/ArithmeticQuizActivity';

const deck = (): ArithmeticQuizExercise => ({ id: 'authored', kind: 'calculation-race', prompt: 'Calcule chaque carte.', operations: ['addition', 'subtraction', 'multiplication', 'division'], leftDigits: 2, rightDigits: 1, problems: [
  { id: 'add', operation: 'addition', left: 2, right: 5, choices: [7, 6, 8, 9] },
  { id: 'subtract', operation: 'subtraction', left: 9, right: 3, choices: [5, 6, 7, 8] },
  { id: 'multiply', operation: 'multiplication', left: 4, right: 3, choices: [10, 11, 12, 13] },
  { id: 'divide', operation: 'division', left: 18, right: 3, choices: [3, 4, 5, 6] },
] });
const result = (responses: Record<string, number>): ArithmeticQuizAnswer => ({ responses, correctCount: 999, total: 999, complete: true, attempts: 1, elapsedSeconds: 12, supported: false });

describe('authored arithmetic quiz contract', () => {
  it.each(['calculation-race', 'number-flashcards'] as const)('creates valid explicit %s cards', kind => {
    const exercise = createArithmeticQuizExercise(kind);
    expect(validateArithmeticQuizExercise(exercise)).toEqual([]);
    expect(exercise.kind).toBe(kind);
    expect(exercise.problems.length).toBeGreaterThan(0);
    expect(exercise.problems.every(problem => problem.choices.length === 4)).toBe(true);
  });

  it('supports all four operations, exact division, zero and negative subtraction', () => {
    expect(validateArithmeticQuizExercise(deck())).toEqual([]);
    expect(arithmeticProblemAnswer({ operation: 'addition', left: 0, right: 0 })).toBe(0);
    expect(arithmeticProblemAnswer({ operation: 'subtraction', left: 2, right: 5 })).toBe(-3);
    expect(arithmeticProblemAnswer({ operation: 'multiplication', left: 0, right: 5 })).toBe(0);
    expect(arithmeticProblemAnswer({ operation: 'division', left: 0, right: 5 })).toBe(0);
    expect(arithmeticProblemAnswer({ operation: 'division', left: 5, right: 0 })).toBeNaN();
  });

  it('rejects invalid types, duplicate card IDs, arithmetic errors and malformed choices', () => {
    const source = deck(), card = source.problems[0];
    const cardDeck = (update: object) => ({ ...source, problems: [{ ...card, ...update }] });
    for (const value of [null, {}, { ...source, kind: 'other' }, { ...source, id: '' }, { ...source, prompt: ' ' }, { ...source, problems: [] }, { ...source, problems: Array.from({ length: 21 }, (_, i) => ({ ...card, id: String(i) })) }, { ...source, problems: [card, card] }, { ...source, operations: [] }, { ...source, operations: ['addition', 'addition'] }, { ...source, leftDigits: 0 }, { ...source, rightDigits: 8 }, { ...source, points: -1 }, cardDeck({ left: '2' }), cardDeck({ left: NaN }), cardDeck({ right: 1.5 }), cardDeck({ left: -1 }), cardDeck({ left: 10_000_000 }), cardDeck({ operation: 'power' }), cardDeck({ choices: [7, 7, 8, 9] }), cardDeck({ choices: [6, 8, 9, 10] }), cardDeck({ choices: [7, 6, 8] }), cardDeck({ choices: [7, 6, 8, '9'] }), cardDeck({ operation: 'division', left: 7, right: 3, choices: [2, 3, 4, 5] }), cardDeck({ operation: 'division', left: 0, right: 0 })]) {
      expect(isArithmeticQuizExercise(value), JSON.stringify(value)).toBe(false);
    }
    expect(isArithmeticQuizExercise({ ...source, operations: ['subtraction'] })).toBe(false);
    expect(isArithmeticQuizExercise({ ...source, leftDigits: 1 })).toBe(false);
  });

  it('materializes author-time drafts and never needs runtime card generation', () => {
    for (const kind of ['calculation-race', 'number-flashcards'] as const) {
      const exercise = createArithmeticQuizDraft(kind, ['addition', 'subtraction', 'multiplication', 'division'], 2, 1, 20, () => 0.5);
      expect(validateArithmeticQuizExercise(exercise)).toEqual([]);
      expect(exercise.problems).toHaveLength(20);
      expect(new Set(exercise.problems.map(problem => problem.id)).size).toBe(20);
      expect(JSON.parse(JSON.stringify(exercise))).toEqual(exercise);
    }
    expect(() => createArithmeticQuizDraft('calculation-race', [], 1, 1, 10)).toThrow();
    expect(() => createArithmeticQuizDraft('calculation-race', ['division'], 1, 2, 10)).toThrow();
  });

  it('can author nonnegative subtraction drafts for younger learners', () => {
    for (const sizes of [[1, 1], [1, 2], [2, 1]]) {
      const exercise = createArithmeticQuizDraft('calculation-race', ['subtraction'], sizes[0], sizes[1], 20, () => 0.5, false);
      expect(validateArithmeticQuizExercise(exercise)).toEqual([]);
      expect(exercise.problems.every(problem => arithmeticProblemAnswer(problem) >= 0)).toBe(true);
    }
  });

  it('builds four distinct safe choices including zero without negative distractors', () => {
    for (const answer of [-50, -1, 0, 1, 7, 100, 99_999_980_000_001]) {
      const choices = makeArithmeticQuizChoices(answer);
      expect(choices).toHaveLength(4);
      expect(new Set(choices).size).toBe(4);
      expect(choices).toContain(answer);
      expect(choices.every(Number.isSafeInteger)).toBe(true);
      if (answer >= 0) expect(choices.every(value => value >= 0)).toBe(true);
    }
    expect(new Set([2, 3, 4, 5].map(answer => makeArithmeticQuizChoices(answer).indexOf(answer))).size).toBeGreaterThan(1);
  });

  it('only accepts relative Tutorly lesson routes for remediation links', () => {
    expect(isArithmeticLessonHref('/learning/mathematiques/multiplication')).toBe(true);
    for (const url of ['https://other.example/learning/a', '//other.example/learning/a', 'javascript:alert(1)', '/learning/../admin', '/learning/%2f%2fevil']) expect(isArithmeticLessonHref(url)).toBe(false);
  });
});

describe('aggregate grading preserves partial achievement', () => {
  it('derives a fractional grade from actual responses rather than self-reported totals', () => {
    const exercise = deck();
    const partial = result({ add: 7, subtract: 5, multiply: 12, divide: 4 });
    expect(isArithmeticQuizComplete(exercise, partial)).toBe(true);
    expect(arithmeticQuizFraction(exercise, partial)).toBe(0.5);
    expect(evaluateArithmeticQuiz(exercise, partial.responses).correctCount).toBe(2);
    expect(arithmeticQuizFraction(exercise, result({ add: 7, subtract: 6, multiply: 12, divide: 6 }))).toBe(1);
    expect(arithmeticQuizFraction(exercise, result({ add: 6, subtract: 5, multiply: 10, divide: 3 }))).toBe(0);
  });

  it('requires completed deck evidence and a submitted choice for every card', () => {
    const exercise = deck(), correct = result({ add: 7, subtract: 6, multiply: 12, divide: 6 });
    for (const state of [null, {}, { ...correct, complete: false }, { ...correct, attempts: 0 }, { ...correct, elapsedSeconds: NaN }, { ...correct, supported: undefined }, { ...correct, responses: { add: 7 } }, { ...correct, responses: { ...correct.responses, unknown: 3 } }, { ...correct, responses: { ...correct.responses, add: '7' } }, { ...correct, responses: { ...correct.responses, divide: 100 } }]) {
      expect(isArithmeticQuizComplete(exercise, state)).toBe(false);
      expect(arithmeticQuizFraction(exercise, state)).toBe(0);
    }
  });
});

describe('arithmetic learner display', () => {
  it('shows one problem and elapsed time, with no race hint or review before completion', () => {
    const html = renderToStaticMarkup(React.createElement(ArithmeticQuizActivity, { exercise: deck() }));
    expect(html).toContain('2 + 5 = ?');
    expect(html).not.toContain('9 − 3 = ?');
    expect(html).toContain('Temps écoulé');
    expect(html).not.toContain('Afficher un indice');
    expect(html).not.toContain('Voir la méthode');
    expect(html).not.toContain('2 + 5 = 7');
  });

  it('offers flashcard method hints while keeping answer feedback after submission', () => {
    const html = renderToStaticMarkup(React.createElement(ArithmeticQuizActivity, { exercise: { ...deck(), kind: 'number-flashcards' } }));
    expect(html).toContain('Afficher un indice');
    expect(html).toContain('Vérifier');
    expect(html).not.toContain('2 + 5 = 7');
  });

  it('shows every completed calculation and distinguishes correct from incorrect answers', () => {
    const completed = result({ add: 7, subtract: 5, multiply: 12, divide: 4 });
    const html = renderToStaticMarkup(React.createElement(ArithmeticQuizActivity, { exercise: deck(), initialState: completed }));

    for (const problem of deck().problems) {
      expect(html).toContain(`data-testid="arithmetic-result-${problem.id}"`);
    }
    expect(html.match(/data-result="correct"/g)).toHaveLength(2);
    expect(html.match(/data-result="incorrect"/g)).toHaveLength(2);
    expect(html).toContain('Réponse correcte');
    expect(html).toContain('Résultats des calculs');
  });
});
