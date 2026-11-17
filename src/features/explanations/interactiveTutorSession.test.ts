import { describe, expect, it } from 'vitest';
import { advanceTutorStep, continueAfterDemonstration, createInteractiveTutorSession, demonstrateCorrectionMethod, demonstrateTutorStep, demonstrationExpression, requestTutorHint, retryTutorQuestion, submitTutorResponse } from './interactiveTutorSession';

describe('original demonstration followed by independent application', () => {
  const why = () => submitTutorResponse(createInteractiveTutorSession(), '8 - 5');
  const application = () => {
    let session = continueAfterDemonstration(demonstrateCorrectionMethod(why()));
    session = submitTutorResponse(session, 'J’ajoute 10 unités en haut et 1 dizaine en bas');
    for (const answer of ['10', '15', '7', '5', '12', '7', '1', '177']) session = submitTutorResponse(session, answer);
    return session;
  };
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
    expect(next.state).toBe('awaiting-response');
    expect(next.step).toBe(0);
    expect(next.question).toContain('On a 5 unités');
    expect(next.question).not.toContain('16 − 7');
    expect(next.question).not.toContain('169');
    expect(next.attempts).toEqual(s.attempts);
    const resumed = submitTutorResponse(next, 'J’ajoute 10 unités en haut et 1 dizaine en bas');
    expect(resumed.step).toBe(1);
    expect(resumed.question).toContain('Une dizaine');
  });
  it('advances after a correct initial answer without requiring the animation', () => {
    const s = submitTutorResponse(createInteractiveTutorSession(), 'J’ajoute 10 unités en haut et 1 dizaine en bas');
    expect(s.state).toBe('awaiting-response');
    expect(s.step).toBe(1);
    expect(s.question).toContain('Une dizaine');
    expect(s.demonstrationUsed).toBe(false);
    expect(s.criticalStepIndependent).toBe(true);
    expect(s.attempts).toHaveLength(1);
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
    expect(s.attempts.filter(attempt => attempt.step >= 9 && attempt.isCorrect).map(attempt => attempt.answer)).toEqual(['9', '6', '1', '169']);
  });
  it('returns from an animation to the same unfinished stage and keeps attempt and hint history', () => {
    let s = createInteractiveTutorSession();
    s = submitTutorResponse(s, 'J’ajoute 10 unités en haut et 1 dizaine en bas');
    s = submitTutorResponse(s, '10');
    s = requestTutorHint(s);
    const savedStep = s.step;
    const savedQuestion = s.question;
    const savedAttempts = s.attempts;
    const savedHintLevels = s.hintLevelsByStep;
    const savedCompletedSteps = s.completedSteps;
    const savedFeedback = s.feedback;
    s = continueAfterDemonstration(demonstrateTutorStep(s));
    expect(s.step).toBe(savedStep);
    expect(s.question).toBe(savedQuestion);
    expect(s.state).toBe('hint');
    expect(s.feedback).toBe(savedFeedback);
    expect(s.attempts).toEqual(savedAttempts);
    expect(s.hintLevelsByStep).toEqual(savedHintLevels);
    expect(s.completedSteps).toEqual(savedCompletedSteps);
    expect(s.demonstratedSteps).toContain(savedStep);
    expect(submitTutorResponse(s, '15').step).toBe(savedStep + 1);
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
    let finalStep = application();
    for (const answer of ['9', '6', '1']) finalStep = advanceTutorStep(submitTutorResponse(finalStep, answer));
    finalStep = requestTutorHint(requestTutorHint(finalStep));
    expect(finalStep.question).toContain('326 − 157');
    expect(finalStep.feedback).not.toContain('169');
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
    expect(withHelp.question).toContain('14 − 6');
    expect(submitTutorResponse(withHelp, '8').question).toContain('16 − 7');
    const recovered = submitTutorResponse(s, '8');
    expect(recovered.question).toContain('16 − 7');
    expect(submitTutorResponse(recovered, '9').canAdvance).toBe(true);
    s = submitTutorResponse(submitTutorResponse(s, '1'), '1');
    expect(s.state).toBe('needs-support');
    expect(submitTutorResponse(s, '1')).toBe(s);
  });
  it.each([
    ['9', 'wrong', '14 − 6', '8', '16 − 7'],
    ['10', 'wrong', '13 − 6', '7', '12 − 6'],
    ['11', 'wrong', '4 − 2', '2', '3 − 2'],
    ['12', 'wrong', '100 + 50 + 8', '158', '326 − 157'],
  ])('targets an arithmetic prerequisite at transfer step %s and resumes the same question', (target, wrong, preparation, answer, original) => {
    let s = application();
    while (s.step < Number(target)) {
      s = advanceTutorStep(submitTutorResponse(s, ['9', '6', '1'][s.step - 9]));
    }
    const savedStep = s.step;
    s = submitTutorResponse(s, wrong);
    s = submitTutorResponse(s, wrong);
    expect(s.state).toBe('demonstrate');
    s = continueAfterDemonstration(s);
    expect(s.step).toBe(savedStep);
    expect(s.question).toContain(original);
    s = submitTutorResponse(s, wrong);
    expect(s.prerequisite).toBe(true);
    expect(s.lastErrorKind).toBe('arithmetic');
    expect(s.question).toContain(preparation);
    const recovered = submitTutorResponse(s, answer);
    expect(recovered.prerequisite).toBe(false);
    expect(recovered.step).toBe(savedStep);
    expect(recovered.question).toContain(original);
  });

  it.each([
    ['9', '-1', '10 + 6', '16', '16 − 7'],
    ['10', '7', '4 + 1', '5', '12 − 6'],
    ['11', '2', '2 + 1', '3', '3 − 2'],
    ['12', '179', '4 + 1', '5', '326 − 157'],
  ])('targets a compensation prerequisite at transfer step %s', (target, wrong, preparation, answer, original) => {
    let s = application();
    while (s.step < Number(target)) s = advanceTutorStep(submitTutorResponse(s, ['9', '6', '1'][s.step - 9]));
    const savedStep = s.step;
    s = submitTutorResponse(s, wrong);
    expect(s.attempts.at(-1)?.errorKind).toBe('compensation');
    expect(s.lastMisconception).toBe('compensation-error');
    s = submitTutorResponse(s, wrong);
    expect(s.state).toBe('demonstrate');
    const savedAttempts = s.attempts;
    const savedHints = s.hintLevelsByStep;
    s = continueAfterDemonstration(s);
    expect(s.step).toBe(savedStep);
    expect(s.question).toContain(original);
    expect(s.attempts).toEqual(savedAttempts);
    expect(s.hintLevelsByStep).toEqual(savedHints);
    s = submitTutorResponse(s, wrong);
    expect(s.prerequisite).toBe(true);
    expect(s.lastErrorKind).toBe('compensation');
    expect(s.question).toContain(preparation);
    const recovered = submitTutorResponse(s, answer);
    expect(recovered.prerequisite).toBe(false);
    expect(recovered.step).toBe(savedStep);
    expect(recovered.question).toContain(original);
  });

});
