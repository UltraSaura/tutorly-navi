import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { VisualQuizActivity } from '@/components/practice/VisualQuizActivity';
import { createVisualQuizDraft, isVisualQuizAnswerCorrect, isVisualQuizExercise, validateVisualQuizExercise, type AnalogueClockQuiz, type GraduatedNumberLineQuiz, type VisualQuizAnswer } from './visualQuiz';
const answer: VisualQuizAnswer = { value: '0.5', position: null, selectedHour: null, attempts: 1, supported: false, complete: true };
const line = createVisualQuizDraft('graduated-number-line', 'line') as GraduatedNumberLineQuiz;
const clock = createVisualQuizDraft('analogue-clock', 'clock') as AnalogueClockQuiz;

describe('authored visual quiz bank contracts', () => {
  it('provides valid admin drafts, never runtime-generated learner content', () => {
    expect(validateVisualQuizExercise(line)).toEqual([]);
    expect(validateVisualQuizExercise(clock)).toEqual([]);
  });
  it('accepts equivalent raw fractional answers using the existing evaluator', () => {
    for (const value of ['0.5', '0,5', '1/2', '2/4']) expect(isVisualQuizAnswerCorrect(line, { ...answer, value })).toBe(true);
    for (const value of ['', ' ', '0', '1/3', 'NaN', null]) expect(isVisualQuizAnswerCorrect(line, { ...answer, value })).toBe(false);
  });
  it('rejects completion flags without actual evidence or with wrong values', () => {
    for (const value of [null, { complete: true }, { ...answer, complete: false }, { ...answer, attempts: 0 }, { ...answer, attempts: -1 }, { ...answer, attempts: '1' }, { ...answer, supported: undefined }, { ...answer, value: '0.25', correct: true }]) expect(isVisualQuizAnswerCorrect(line, value)).toBe(false);
    expect(isVisualQuizAnswerCorrect(line, { ...answer, supported: true })).toBe(true);
  });
  it('grades exact bounded placements from authored values', () => {
    const place: GraduatedNumberLineQuiz = { ...line, configuration: { ...line.configuration, mode: 'place_value', snapMode: 'tick', items: [{ ...line.configuration.items[0], tolerance: 1e-9 }] } };
    expect(isVisualQuizAnswerCorrect(place, { ...answer, position: 0.5 })).toBe(true);
    for (const position of [null, undefined, -0.1, 1.1, '0.5', 0.25, 0.51, NaN]) expect(isVisualQuizAnswerCorrect(place, { ...answer, position })).toBe(false);
  });
  it('handles twelve-to-one wraparound without exposing a guessed correct flag', () => {
    const wrap: AnalogueClockQuiz = { ...clock, startHour: 12, answerChoices: [12, 1, 2, 3] };
    expect(isVisualQuizExercise(wrap)).toBe(true);
    expect(isVisualQuizAnswerCorrect(wrap, { ...answer, selectedHour: 1 })).toBe(true);
    for (const selectedHour of [12, 0, 13, '1', null]) expect(isVisualQuizAnswerCorrect(wrap, { ...answer, selectedHour, correct: true })).toBe(false);
    const read: AnalogueClockQuiz = { ...wrap, mode: 'read' };
    expect(isVisualQuizAnswerCorrect(read, { ...answer, selectedHour: 12 })).toBe(true);
    expect(isVisualQuizAnswerCorrect(read, { ...answer, selectedHour: 1 })).toBe(false);
  });
  it('rejects malformed, impossible, unsupported and answer-prefilled payloads', () => {
    const config = line.configuration;
    const invalid = [null, {}, { ...clock, startHour: 0 }, { ...clock, startHour: 1.5 }, { ...clock, mode: 'minutes' }, { ...clock, answerChoices: [1, 1, 4, 5] }, { ...clock, answerChoices: [1, 2, 3, 5] }, { ...clock, id: '' }, { ...clock, points: 101 }, { ...line, configuration: null }, { ...line, configuration: { ...config, mode: 'order_values' } }, { ...line, configuration: { ...config, line: { ...config.line, end: 0 } } }, { ...line, configuration: { ...config, line: { ...config.line, subdivisions: 0 } } }, { ...line, configuration: { ...config, items: [] } }, { ...line, configuration: { ...config, items: [{ ...config.items[0], value: '1/3' }] } }, { ...line, configuration: { ...config, items: [{ ...config.items[0], label: '0.5' }] } }, { ...line, configuration: { ...config, items: [{ ...config.items[0], initialPosition: 0.5 }] } }];
    for (const value of invalid) expect(isVisualQuizExercise(value), JSON.stringify(value)).toBe(false);
  });
  it('renders authored clock choices and hands without spelling out the answer', () => {
    const markup = renderToStaticMarkup(createElement(VisualQuizActivity, { exercise: clock, language: 'fr' }));
    expect(markup).toContain('visual-quiz-clock');
    expect(markup).toContain('Quelle heure sera-t-il une heure plus tard');
    expect(markup).toContain('4 h');
    expect(markup).toContain('Horloge à aiguilles');
    expect(markup).not.toContain('selectedHour');
    expect(markup).not.toContain('visual-quiz-complete');
    expect(markup).not.toContain('3:00');
  });
  it('rejects unsnapped positions even when default renderer tolerance is generous', () => {
    const place: GraduatedNumberLineQuiz = { ...line, configuration: { ...line.configuration, mode: 'place_value' } };
    expect(isVisualQuizAnswerCorrect(place, { ...answer, position: 0.501 })).toBe(false);
    expect(isVisualQuizAnswerCorrect(place, { ...answer, position: 0.5 })).toBe(true);
  });
  it('keeps zero-point authored assessments valid', () => {
    expect(isVisualQuizExercise({ ...clock, points: 0 })).toBe(true);
  });
});
