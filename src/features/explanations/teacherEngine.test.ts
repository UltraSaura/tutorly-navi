import { describe, expect, it } from 'vitest';
import { buildTeacherDecision, chooseAssistanceLevel, transitionTeacherDecision, type TeacherEngineInput } from './teacherEngine';

const baseInput = (overrides: Partial<TeacherEngineInput> = {}): TeacherEngineInput => ({
  problem: '52 − 27',
  grade: 'CM1',
  curriculumObjective: 'Soustraire avec regroupement',
  mastery: { score: 0.55, recentCorrect: 1, recentIncorrect: 0 },
  attempts: [],
  preferredPresentation: 'visual',
  tutoringMode: 'guided',
  verifiedSolution: { expression: '52 - 27', result: '25', operation: 'subtraction', stepCount: 4, isVerified: true },
  explanationExperience: 'explain-v2',
  ...overrides,
});

describe('teacherEngine', () => {
  it('selects assistance from evidence rather than age alone', () => {
    expect(chooseAssistanceLevel(baseInput({ grade: '6e', mastery: { score: 0.2, recentCorrect: 0, recentIncorrect: 2 } }))).toBe('concrete');
    expect(chooseAssistanceLevel(baseInput({ grade: 'CM1', mastery: { score: 0.95, recentCorrect: 4, recentIncorrect: 0 } }))).toBe('concise');
  });

  it('asks before revealing the answer in guided regrouping', () => {
    const decision = buildTeacherDecision(baseInput());
    expect(decision.studentFacingQuestion).toContain('unités');
    expect(decision.finalAnswerVisible).toBe(false);
    expect(decision.visualDemonstration).toBe('structured-operation-grid');
  });

  it('responds to repeated failure with concrete remediation', () => {
    const decision = buildTeacherDecision(baseInput({
      attempts: [{ answer: '35', isCorrect: false, misconception: 'emprunt compris comme déplacement' }, { answer: '35', isCorrect: false }],
      mastery: { score: 0.2, recentCorrect: 0, recentIncorrect: 2, repeatedMisconception: 'emprunt compris comme déplacement' },
    }));
    expect(decision.assistance).toBe('concrete');
    expect(decision.remediationRecommendation).toContain('unités et dizaines');
    expect(decision.misconceptionIndicators).toContain('emprunt compris comme déplacement');
  });

  it('shows the answer only after an independent correct attempt in guided mode', () => {
    const decision = transitionTeacherDecision(baseInput(), { type: 'student_attempt', answer: '25', isCorrect: true }, 0);
    expect(decision.finalAnswerVisible).toBe(true);
    expect(decision.explanationStep).toBe(1);
  });

  it('keeps review grounded in submitted work', () => {
    const decision = buildTeacherDecision(baseInput({ tutoringMode: 'review', attempts: [{ answer: '35', isCorrect: false }] }));
    expect(decision.strategy).toContain('éléments réellement fournis');
    expect(decision.finalAnswerVisible).toBe(true);
  });

  it('does not accept an unverified solver result', () => {
    expect(() => buildTeacherDecision(baseInput({ verifiedSolution: { ...baseInput().verifiedSolution, isVerified: false } as never }))).toThrow('solution vérifiée');
  });

  it('uses the original TwoCards presentation when explicitly selected', () => {
    expect(buildTeacherDecision(baseInput({ explanationExperience: 'two-cards' })).visualDemonstration).toBe('two-cards');
  });
});
