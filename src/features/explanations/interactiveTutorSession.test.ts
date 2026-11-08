import { describe, expect, it } from 'vitest';
import { continueAfterDemonstration, createInteractiveTutorSession, requestTutorHint, retryTutorQuestion, submitTutorResponse } from './interactiveTutorSession';

describe('interactive tutor session hotfix', () => {
  const remediate = () => submitTutorResponse(createInteractiveTutorSession(), '8 - 5');
  const transfer = () => {
    let s = remediate();
    for (const answer of ['10', '15', '7', '1', '11', '7', '1', '177']) s = submitTutorResponse(s, answer);
    return s;
  };
  it('replaces the question with an answerable prerequisite', () => {
    const s = remediate();
    expect(s.step).toBe(1);
    expect(s.question).toBe('Une dizaine représente combien d’unités ?');
    expect(s.feedback).toContain("pas l'inverse");
    expect(s.lastMisconception).toBe('reversed-subtraction');
  });
  it('requires every column before transfer', () => {
    let s = remediate();
    for (const [answer, step] of [['10', 2], ['15', 3], ['7', 4], ['1', 5], ['11', 6], ['7', 7], ['1', 8], ['177', 9]] as const) {
      s = submitTutorResponse(s, answer);
      expect(s.step).toBe(step);
    }
    expect(s.state).toBe('transfer');
    expect(submitTutorResponse(s, '169').state).toBe('complete');
  });
  it.each(['110', '10 + 1', '210', '-10', '10.5'])('rejects incorrect numeric answer %s', answer => {
    expect(submitTutorResponse(remediate(), answer).attempts.at(-1)?.isCorrect).toBe(false);
  });
  it('accepts the selectable approach', () => {
    expect(submitTutorResponse(createInteractiveTutorSession(), 'J’échange une dizaine contre 10 unités').step).toBe(2);
  });
  it('escalates to demonstration, prerequisite, then human help instead of endless retries', () => {
    let s = submitTutorResponse(remediate(), '2');
    s = submitTutorResponse(retryTutorQuestion(s), '2');
    expect(s.state).toBe('demonstrate');
    s = submitTutorResponse(continueAfterDemonstration(s), '2');
    expect(s.prerequisite).toBe(true);
    s = submitTutorResponse(submitTutorResponse(s, '2'), '2');
    expect(s.state).toBe('needs-support');
    expect(submitTutorResponse(s, '2')).toBe(s);
  });
  it('returns from prerequisite without erasing history', () => {
    let s = remediate();
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
