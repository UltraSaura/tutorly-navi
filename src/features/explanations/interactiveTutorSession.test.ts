import { describe, expect, it } from 'vitest';
import { continueAfterDemonstration, createInteractiveTutorSession, demonstrateTutorStep, requestTutorHint, retryTutorQuestion, submitTutorResponse } from './interactiveTutorSession';

describe('interactive tutor session', () => {
  it('diagnoses distinct regrouping answers', () => {
    const reversed = submitTutorResponse(createInteractiveTutorSession(), '8 moins 5');
    const skipped = submitTutorResponse(createInteractiveTutorSession(), 'Je commence par les dizaines');
    expect(reversed.lastMisconception).toBe('reversed-subtraction');
    expect(skipped.lastMisconception).toBe('skipped-units');
    expect(reversed.feedback).not.toBe(skipped.feedback);
  });

  it('escalates hints and retries without revealing the final result', () => {
    const initial = createInteractiveTutorSession();
    const hinted = requestTutorHint(initial);
    const retried = retryTutorQuestion(hinted);
    expect(hinted.state).toBe('hint');
    expect(hinted.feedback).toContain('unités');
    expect(retried.state).toBe('awaiting-response');
    expect(retried.feedback).not.toContain('177');
  });

  it('requires the student to complete the worked example and transfer exercise', () => {
    let session = createInteractiveTutorSession();
    session = submitTutorResponse(session, 'J’échange une dizaine contre 10 unités');
    session = submitTutorResponse(session, '15');
    session = submitTutorResponse(session, '7');
    expect(session.state).toBe('transfer');
    session = submitTutorResponse(session, '169');
    expect(session.state).toBe('complete');
  });

  it('returns to the student after a demonstration', () => {
    const demonstrated = demonstrateTutorStep(createInteractiveTutorSession());
    expect(demonstrated.state).toBe('demonstrate');
    expect(continueAfterDemonstration(demonstrated).state).toBe('awaiting-response');
  });
});
