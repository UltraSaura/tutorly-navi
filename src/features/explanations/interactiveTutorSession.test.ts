import { describe, expect, it } from 'vitest';
import { continueAfterDemonstration, createInteractiveTutorSession, demonstrateCorrectionMethod, demonstrationExpression, requestTutorHint, retryTutorQuestion, submitTutorResponse } from './interactiveTutorSession';

describe('original demonstration followed by independent application', () => {
  const why = () => submitTutorResponse(createInteractiveTutorSession(), '8 - 5');
  const application = () => continueAfterDemonstration(demonstrateCorrectionMethod(why()));
  it('explains why order matters before showing the original animation', () => {
    const s = why();
    expect(s.state).toBe('correction-explanation');
    expect(s.feedback).toContain('change le calcul');
    expect(s.lastMisconception).toBe('reversed-subtraction');
    expect(demonstrationExpression(demonstrateCorrectionMethod(s))).toBe('325 - 148');
  });
  it('does not grade answers during demonstration or require an understanding quiz', () => {
    const s = demonstrateCorrectionMethod(why());
    expect(submitTutorResponse(s, '177')).toBe(s);
    const next = continueAfterDemonstration(s);
    expect(next.state).toBe('transfer');
    expect(next.question).toContain('326 − 157');
    expect(next.question).not.toContain('169');
    expect(next.attempts).toEqual(s.attempts);
  });
  it('accepts compensation and proceeds to the original demonstration', () => {
    expect(submitTutorResponse(createInteractiveTutorSession(), 'J’ajoute 10 unités en haut et 1 dizaine en bas').state).toBe('demonstrate');
  });
  it('validates a fresh result through the actual session', () => {
    const s = submitTutorResponse(application(), '169');
    expect(s.state).toBe('complete');
    expect(s.transferAttempts).toBe(1);
    expect(s.attempts.at(-1)?.isCorrect).toBe(true);
  });
  it.each(['177', '7', '111', '1690', '-169'])('rejects %s and preserves the exercise on retry', answer => {
    const s = submitTutorResponse(application(), answer);
    expect(s.state).toBe('feedback');
    const retry = retryTutorQuestion(s);
    expect(retry.question).toContain('326 − 157');
    expect(submitTutorResponse(retry, '169').state).toBe('complete');
  });
  it('offers compensation hints without revealing the final answer', () => {
    let s = application();
    s = requestTutorHint(s);
    expect(s.feedback).toContain('1 dizaine en bas');
    s = requestTutorHint(s);
    expect(s.feedback).toContain('12 − 6');
    expect(s.feedback).not.toContain('169');
    s = requestTutorHint(s);
    expect(s.state).toBe('demonstrate');
    expect(demonstrationExpression(s)).toBe('325 - 148');
    expect(continueAfterDemonstration(s).question).toContain('326 − 157');
  });
  it('bounds repeated failure and returns from a prerequisite without losing progress', () => {
    let s = application();
    s = submitTutorResponse(s, '1');
    s = submitTutorResponse(s, '1');
    expect(s.state).toBe('demonstrate');
    s = submitTutorResponse(continueAfterDemonstration(s), '1');
    expect(s.prerequisite).toBe(true);
    let withHelp = s;
    for (let n = 0; n < 3; n++) withHelp = requestTutorHint(withHelp);
    withHelp = continueAfterDemonstration(withHelp);
    expect(withHelp.question).toContain('5 + 5');
    expect(submitTutorResponse(withHelp, '10').question).toContain('326 − 157');
    const recovered = submitTutorResponse(s, '10');
    expect(recovered.question).toContain('326 − 157');
    expect(submitTutorResponse(recovered, '169').state).toBe('complete');
    s = submitTutorResponse(submitTutorResponse(s, '1'), '1');
    expect(s.state).toBe('needs-support');
    expect(submitTutorResponse(s, '1')).toBe(s);
  });
});
