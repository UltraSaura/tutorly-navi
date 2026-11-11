import { describe, expect, it } from 'vitest';
import { advanceTutorStep, continueAfterDemonstration, createInteractiveTutorSession, demonstrateCorrectionMethod, demonstrationExpression, requestTutorHint, retryTutorQuestion, submitTutorResponse } from './interactiveTutorSession';

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
    expect(next.question).toContain('16 − 7');
    expect(next.question).not.toContain('169');
    expect(next.attempts).toEqual(s.attempts);
  });
  it('accepts compensation and proceeds to the original demonstration', () => {
    expect(submitTutorResponse(createInteractiveTutorSession(), 'J’ajoute 10 unités en haut et 1 dizaine en bas').state).toBe('demonstrate');
  });
  it('guides the application through all four compensation stages', () => {
    let s = application();
    const journey = [['9', '16 − 7'], ['6', '12 − 6'], ['1', '3 − 2'], ['169', '326 − 157']] as const;
    for (const [answer, nextQuestion] of journey) {
      expect(s.question).toContain(nextQuestion);
      s = submitTutorResponse(s, answer);
      expect(s.canAdvance).toBe(true);
      expect(s.completedSteps).toContain(s.step);
      expect(s.feedback).toMatch(/Oui|Bravo/);
      s = advanceTutorStep(s);
    }
    expect(s.state).toBe('complete');
    expect(s.feedback).toContain('terminé');
    expect(s.attempts.filter(attempt => attempt.isCorrect).map(attempt => attempt.answer)).toEqual(['9', '6', '1', '169']);
  });
  it.each([
    ['8', '9', '16 − 7'], ['5', '6', '12 − 6'], ['2', '1', '3 − 2'], ['177', '169', '326 − 157'],
  ])('keeps the %s response on the current question until corrected', (wrong, correct, question) => {
    let s = application();
    for (const answer of ['9', '6', '1']) {
      if (s.question.includes(question)) break;
      s = advanceTutorStep(submitTutorResponse(s, answer));
    }
    expect(s.question).toContain(question);
    s = submitTutorResponse(s, wrong);
    expect(s.state).toBe('feedback');
    expect(s.canAdvance).toBe(false);
    expect(s.question).toContain(question);
    s = submitTutorResponse(retryTutorQuestion(s), correct);
    expect(s.canAdvance).toBe(true);
  });
  it('offers compensation hints without revealing the final answer', () => {
    let s = application();
    s = requestTutorHint(s);
    expect(s.feedback).toContain('16 unités');
    s = requestTutorHint(s);
    expect(s.feedback).toContain('16 − 7');
    expect(s.feedback).not.toContain('169');
    s = requestTutorHint(s);
    expect(s.state).toBe('demonstrate');
    expect(demonstrationExpression(s)).toBe('325 - 148');
    expect(continueAfterDemonstration(s).question).toContain('16 − 7');
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
    expect(submitTutorResponse(withHelp, '10').question).toContain('16 − 7');
    const recovered = submitTutorResponse(s, '10');
    expect(recovered.question).toContain('16 − 7');
    expect(submitTutorResponse(recovered, '9').canAdvance).toBe(true);
    s = submitTutorResponse(submitTutorResponse(s, '1'), '1');
    expect(s.state).toBe('needs-support');
    expect(submitTutorResponse(s, '1')).toBe(s);
  });
});
