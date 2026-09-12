import { describe, expect, it } from 'vitest';
import { personalizeNextBestActions } from './personalizationService';
import type { RecommendedAction } from '@/types/recommendation';

function action(overrides: Partial<RecommendedAction> = {}): RecommendedAction {
  return {
    id: 'a1', source: 'learn', subjectId: 'math', conceptId: 'fractions',
    reason: 'curriculum', priority: 200, title: 'Fractions', route: '/learning/math/fractions',
    ...overrides,
  };
}

describe('personalizeNextBestActions', () => {
  it('preserves recommendation order and chooses continuation mode', () => {
    const actions = [action({ id: 'first', reason: 'continue' }), action({ id: 'second' })];
    const result = personalizeNextBestActions({ actions, homework: [], schoolLevel: 'cm1' });
    expect(result.map((item) => item.id)).toEqual(['first', 'second']);
    expect(result[0].personalization.learningMode).toBe('continue_learning');
    expect(result[0].personalization.confidence).toBe('high');
  });

  it('selects guided remediation from repeated difficulty', () => {
    const result = personalizeNextBestActions({
      actions: [action({ reason: 'weak_skill' })],
      homework: [{ id: 'h1', subjectId: 'math', topicId: 'fractions', isCorrect: false, attemptsCount: 3 }],
      schoolLevel: '6eme',
    });
    expect(result[0].personalization).toMatchObject({ learningMode: 'guided_remediation', ageBand: 'middle_school', confidence: 'high' });
  });

  it('keeps spaced review distinct from current-mastery practice', () => {
    const result = personalizeNextBestActions({ actions: [action({ source: 'practice', reason: 'spaced_review' })], homework: [] });
    expect(result[0].personalization.learningMode).toBe('spaced_review');
  });

  it('routes homework evidence to Tutor support', () => {
    const result = personalizeNextBestActions({ actions: [action({ source: 'tutor', reason: 'homework_followup' })], homework: [] });
    expect(result[0].personalization.learningMode).toBe('tutor_support');
  });

  it('uses centralized age configuration and increases minimum remediation scaffold for high school', () => {
    const result = personalizeNextBestActions({ actions: [action({ reason: 'weak_skill' })], homework: [], schoolLevel: 'terminale' });
    expect(result[0].personalization.ageBand).toBe('high_school');
    expect(result[0].personalization.scaffold).toBe('medium');
  });

  it('does not fabricate strong confidence for curriculum-only recommendations', () => {
    const result = personalizeNextBestActions({ actions: [action()], homework: [], schoolLevel: 'ce1' });
    expect(result[0].personalization).toMatchObject({ learningMode: 'new_learning', ageBand: 'early_primary', confidence: 'low', evidenceCount: 0 });
  });
});
