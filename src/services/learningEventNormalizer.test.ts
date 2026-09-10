import { describe, expect, it } from 'vitest';
import {
  isMasteryBearingEvent,
  normalizeDifficultyScore,
  normalizeLearnAttempt,
  normalizePracticeAttempt,
  normalizeTutorAttempt,
  processLearningAttempt,
  MASTERY_BEARING_EVENT_TYPES,
  NON_MASTERY_EVENT_TYPES,
} from './learningEventNormalizer';
import { createInitialMasteryState } from './masteryService';

describe('Shared Learning Event Normalizer (Phase 5)', () => {
  describe('Analytics vs Mastery Event Distinction', () => {
    it('identifies mastery-bearing performance events', () => {
      expect(isMasteryBearingEvent('quiz_answer_submitted')).toBe(true);
      expect(isMasteryBearingEvent('runtime_mini_practice_answered')).toBe(true);
      expect(isMasteryBearingEvent('quiz_wrong_answer')).toBe(true);
      expect(isMasteryBearingEvent('lesson_completed')).toBe(true);
    });

    it('identifies non-mastery telemetry events (navigation, modals, view)', () => {
      expect(isMasteryBearingEvent('explanation_opened')).toBe(false);
      expect(isMasteryBearingEvent('explanation_check_started')).toBe(false);
      expect(isMasteryBearingEvent('recommended_video_clicked')).toBe(false);
      expect(isMasteryBearingEvent('quiz_hint_clicked')).toBe(false);
    });

    it('ensures disjoint sets for mastery and non-mastery events', () => {
      for (const eventType of NON_MASTERY_EVENT_TYPES) {
        expect(MASTERY_BEARING_EVENT_TYPES.has(eventType)).toBe(false);
      }
    });
  });

  describe('Difficulty Score Normalization', () => {
    it('normalizes string difficulty descriptors', () => {
      expect(normalizeDifficultyScore('easy')).toBe(1);
      expect(normalizeDifficultyScore('facile')).toBe(1);
      expect(normalizeDifficultyScore('medium')).toBe(3);
      expect(normalizeDifficultyScore('moyen')).toBe(3);
      expect(normalizeDifficultyScore('hard')).toBe(5);
      expect(normalizeDifficultyScore('difficile')).toBe(5);
    });

    it('normalizes numeric difficulty values', () => {
      expect(normalizeDifficultyScore(3)).toBe(3);
      expect(normalizeDifficultyScore(10)).toBe(5); // clamped
      expect(normalizeDifficultyScore(-2)).toBe(1); // clamped
    });

    it('returns undefined for missing or invalid difficulty', () => {
      expect(normalizeDifficultyScore(null)).toBeUndefined();
      expect(normalizeDifficultyScore(undefined)).toBeUndefined();
      expect(normalizeDifficultyScore('unknown')).toBeUndefined();
    });
  });

  describe('Learn Surface Adapter', () => {
    it('normalizes a valid Learn quiz attempt with topicId mapping to conceptId', () => {
      const res = normalizeLearnAttempt({
        studentId: 'student_123',
        subjectId: 'maths',
        topicId: 'fractions_addition',
        objectiveId: 'obj_456',
        taskMasteryLevel: 2,
        correct: true,
        hintsUsed: 1,
        attemptNumber: 2,
        responseTimeMs: 4200,
        difficulty: 'medium',
        questionId: 'q_789',
        questionKind: 'single',
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.attempt.studentId).toBe('student_123');
        expect(res.attempt.subjectId).toBe('maths');
        expect(res.attempt.conceptId).toBe('fractions_addition');
        expect(res.attempt.objectiveId).toBe('obj_456');
        expect(res.attempt.masteryLevel).toBe(2);
        expect(res.attempt.correct).toBe(true);
        expect(res.attempt.hintsUsed).toBe(1);
        expect(res.attempt.attemptNumber).toBe(2);
        expect(res.attempt.responseTimeMs).toBe(4200);
        expect(res.attempt.difficultyScore).toBe(3);
        expect(res.attempt.source).toBe('learn');
      }
    });

    it('rejects invalid or missing Learn inputs with clear reasons', () => {
      const missingStudent = normalizeLearnAttempt({
        studentId: '',
        subjectId: 'maths',
        topicId: 'fractions',
        correct: true,
      });
      expect(missingStudent.ok).toBe(false);

      const missingTopic = normalizeLearnAttempt({
        studentId: 's1',
        subjectId: 'maths',
        topicId: '',
        correct: true,
      });
      expect(missingTopic.ok).toBe(false);
    });
  });

  describe('Practice Surface Adapter', () => {
    it('normalizes a valid Practice session attempt with Level 3 default', () => {
      const res = normalizePracticeAttempt({
        studentId: 'student_123',
        subjectId: 'histoire',
        conceptId: 'moyen_age',
        correct: true,
        activityEngine: 'timeline',
        difficulty: 'hard',
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.attempt.source).toBe('practice');
        expect(res.attempt.conceptId).toBe('moyen_age');
        expect(res.attempt.masteryLevel).toBe(3); // default for practice
        expect(res.attempt.difficultyScore).toBe(5);
        expect(res.attempt.metadata?.activityEngine).toBe('timeline');
      }
    });

    it('supports granular fact concept IDs like mul:7x8', () => {
      const res = normalizePracticeAttempt({
        studentId: 'student_123',
        subjectId: 'maths',
        conceptId: 'mul:7x8',
        taskMasteryLevel: 3,
        correct: true,
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.attempt.conceptId).toBe('mul:7x8');
      }
    });
  });

  describe('Tutor Surface Adapter & Incomplete Evidence Handling', () => {
    it('normalizes a valid structured Tutor homework check', () => {
      const res = normalizeTutorAttempt({
        studentId: 'student_123',
        subjectId: 'maths',
        conceptId: 'division_posee',
        taskMasteryLevel: 2,
        correct: false,
        hintsUsed: 2,
        stepId: 'step_quotient_1',
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.attempt.source).toBe('tutor');
        expect(res.attempt.conceptId).toBe('division_posee');
        expect(res.attempt.correct).toBe(false);
        expect(res.attempt.hintsUsed).toBe(2);
        expect(res.attempt.metadata?.stepId).toBe('step_quotient_1');
      }
    });

    it('gracefully rejects unstructured Tutor chat lacking conceptId or evaluated correctness', () => {
      const unstructuredChat = normalizeTutorAttempt({
        studentId: 'student_123',
        subjectId: 'maths',
        conceptId: null, // unstructured chat has no conceptId yet
        correct: null,
      });

      expect(unstructuredChat.ok).toBe(false);
      if (!unstructuredChat.ok) {
        expect(unstructuredChat.reason).toContain('Tutor attempt missing conceptId');
      }
    });
  });

  describe('Mastery Service Integration Pipeline', () => {
    it('processes a normalized attempt through MasteryService and returns a valid update', () => {
      const normRes = normalizeLearnAttempt({
        studentId: 'student_1',
        subjectId: 'maths',
        topicId: 'fractions_basics',
        taskMasteryLevel: 1,
        correct: true,
      });

      expect(normRes.ok).toBe(true);
      if (!normRes.ok) return;

      const initial = createInitialMasteryState('student_1', 'maths', 'fractions_basics');
      const result = processLearningAttempt(normRes.attempt, initial);

      expect(result.state.status).toBe('assessed');
      expect(result.state.currentMasteryLevel).toBe(1);
      expect(result.state.bestMasteryLevel).toBe(1);
      expect(result.state.currentScore).toBeGreaterThan(0);
      expect(result.change.reason).toContain('Succès autonome (Niveau 1)');
    });
  });
});
