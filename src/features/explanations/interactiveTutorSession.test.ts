import { describe, expect, it } from 'vitest';
import { beginCorrectionCheck, continueAfterDemonstration, createInteractiveTutorSession, requestTutorHint, retryTutorQuestion, submitTutorResponse } from './interactiveTutorSession';
import { createPedagogicalCorrection } from './pedagogicalCorrection';

describe('interactive tutor session hotfix', () => {
  const remediate = () => submitTutorResponse(createInteractiveTutorSession(), '8 - 5');
  const understood = () => submitTutorResponse(beginCorrectionCheck(remediate()), 'Oui, ce sont deux situations différentes');
  const transfer = () => {
    let s = understood();
    for (const answer of ['10', '15', '7', '1', '11', '7', '1', '177']) s = submitTutorResponse(s, answer);
    return s;
  };
  it('replaces the question with an answerable prerequisite', () => {
    const s = remediate();
    expect(s.step).toBe(0);
    expect(s.correction?.understandingQuestion).toContain('même situation');
    expect(s.feedback).toContain('change le calcul');
    expect(s.lastMisconception).toBe('reversed-subtraction');
  });
  it('explains reversed subtraction, checks understanding, then introduces regrouping', () => {
    let s = remediate();
    expect(s.state).toBe('correction-explanation');
    expect(s.correction?.exampleExpressions).toEqual(['8 - 5', '5 - 8']);
    s = beginCorrectionCheck(s);
    expect(s.state).toBe('correction-check');
    s = submitTutorResponse(s, 'Oui, c’est la même situation');
    expect(s.state).toBe('correction-explanation');
    s = beginCorrectionCheck(s);
    s = submitTutorResponse(s, 'Oui, ce sont deux situations différentes');
    expect(s.step).toBe(1);
    expect(s.question).toContain('combien d’unités');
  });
  it('uses a simpler explanation after an incorrect understanding check', () => {
    let s = beginCorrectionCheck(remediate());
    s = submitTutorResponse(s, 'Oui, c’est pareil');
    expect(s.state).toBe('correction-explanation');
    expect(s.feedback).toContain('nombre de départ');
  });
  it('creates the same typed correction contract for another misconception', () => {
    const correction = createPedagogicalCorrection('skipped-units', 'Je commence par les dizaines');
    expect(correction.observedResponse).toContain('dizaines');
    expect(correction.principle).toContain('colonne');
    expect(correction.understandingQuestion).toBeTruthy();
    expect(correction.nextAction).toBe('check-understanding');
  });
  it('requires every column before transfer', () => {
    let s = understood();
    for (const [answer, step] of [['10', 2], ['15', 3], ['7', 4], ['1', 5], ['11', 6], ['7', 7], ['1', 8], ['177', 9]] as const) {
      s = submitTutorResponse(s, answer);
      expect(s.step).toBe(step);
    }
    expect(s.state).toBe('transfer');
    expect(submitTutorResponse(s, '169').state).toBe('complete');
  });
  it.each(['110', '10 + 1', '210', '-10', '10.5'])('rejects incorrect numeric answer %s', answer => {
    expect(submitTutorResponse(understood(), answer).attempts.at(-1)?.isCorrect).toBe(false);
  });
  it('accepts the selectable approach', () => {
    expect(submitTutorResponse(createInteractiveTutorSession(), 'J’échange une dizaine contre 10 unités').step).toBe(2);
  });
  it('escalates to demonstration, prerequisite, then human help instead of endless retries', () => {
    let s = submitTutorResponse(understood(), '2');
    s = submitTutorResponse(retryTutorQuestion(s), '2');
    expect(s.state).toBe('demonstrate');
    s = submitTutorResponse(continueAfterDemonstration(s), '2');
    expect(s.prerequisite).toBe(true);
    s = submitTutorResponse(submitTutorResponse(s, '2'), '2');
    expect(s.state).toBe('needs-support');
    expect(submitTutorResponse(s, '2')).toBe(s);
  });
  it('returns from prerequisite without erasing history', () => {
    let s = understood();
    for (let n = 0; n < 3; n++) s = requestTutorHint(s);
    expect(s.state).toBe('demonstrate');
    s = requestTutorHint(continueAfterDemonstration(s));
    expect(s.prerequisite).toBe(true);
    s = submitTutorResponse(s, '10');
    expect(s.prerequisite).toBe(false);
    expect(s.step).toBe(1);
    expect(s.demonstrationUsed).toBe(true);
  });
  it('preserves transfer through hints, retry and demonstration', () => {
    let s = retryTutorQuestion(requestTutorHint(transfer()));
    expect(submitTutorResponse(s, '169').state).toBe('complete');
    s = requestTutorHint(requestTutorHint(s));
    expect(s.state).toBe('demonstrate');
    s = continueAfterDemonstration(s);
    expect(s.state).toBe('transfer');
    expect(submitTutorResponse(s, '169').state).toBe('complete');
  });
});
