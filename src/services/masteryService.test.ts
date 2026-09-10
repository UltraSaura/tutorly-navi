import { describe, expect, it } from 'vitest';
import {
  createInitialMasteryState,
  calculateMasteryUpdate,
} from './masteryService';
import type { LearningAttemptResult } from '@/types/learning-attempt';
import type { ConceptMasteryState } from '@/types/mastery-v2';

describe('Mastery v2 Pure Calculation Service (Phase 4)', () => {
  const baseAttempt: LearningAttemptResult = {
    studentId: 'student_1',
    subjectId: 'maths',
    conceptId: 'fractions_equivalent',
    masteryLevel: 1,
    correct: true,
    attemptNumber: 1,
    hintsUsed: 0,
    source: 'learn',
  };

  describe('Initial Unassessed State', () => {
    it('creates an unassessed state with undefined mastery levels (not falsely Level 1)', () => {
      const initial = createInitialMasteryState('student_1', 'maths', 'fractions');
      expect(initial.status).toBe('unassessed');
      expect(initial.currentMasteryLevel).toBeUndefined();
      expect(initial.bestMasteryLevel).toBeUndefined();
      expect(initial.currentScore).toBe(0);
      expect(initial.bestScore).toBe(0);
      expect(initial.confidence).toBe(0);
      expect(initial.totalAttempts).toBe(0);
    });
  });

  describe('Positive Progression & Level Bounding', () => {
    it('advances to Level 1 on successful Level 1 attempt', () => {
      const res = calculateMasteryUpdate(undefined, {
        ...baseAttempt,
        masteryLevel: 1,
        correct: true,
      });

      expect(res.state.status).toBe('assessed');
      expect(res.state.currentMasteryLevel).toBe(1);
      expect(res.state.bestMasteryLevel).toBe(1);
      expect(res.state.currentScore).toBeGreaterThan(0);
      expect(res.change.scoreDelta).toBeGreaterThan(0);
    });

    it('bounds repeated Level 1 success so it cannot produce Level 4 mastery', () => {
      let state: ConceptMasteryState | undefined = undefined;

      // Simulate 15 consecutive perfect Level 1 attempts
      for (let i = 0; i < 15; i++) {
        const res = calculateMasteryUpdate(state, {
          ...baseAttempt,
          masteryLevel: 1,
          correct: true,
        });
        state = res.state;
      }

      // Must be capped at Level 1 score boundary and Level 1 level
      expect(state.currentScore).toBeLessThanOrEqual(50);
      expect(state.currentMasteryLevel).toBe(1);
      expect(state.bestMasteryLevel).toBe(1);
    });

    it('advances to Level 2 when practicing Level 2 tasks with success', () => {
      let state: ConceptMasteryState | undefined = undefined;

      // Start with Level 1
      state = calculateMasteryUpdate(state, { ...baseAttempt, masteryLevel: 1, correct: true }).state;

      // Attempt Level 2 tasks
      for (let i = 0; i < 4; i++) {
        state = calculateMasteryUpdate(state, { ...baseAttempt, masteryLevel: 2, correct: true }).state;
      }

      expect(state.currentMasteryLevel).toBe(2);
      expect(state.bestMasteryLevel).toBe(2);
      expect(state.currentScore).toBeGreaterThanOrEqual(45);
    });

    it('advances through Level 3 (Independent) and Level 4 (Transfer)', () => {
      let state: ConceptMasteryState | undefined = undefined;

      // Level 1 -> Level 2 -> Level 3 -> Level 4 progression
      for (let i = 0; i < 3; i++) {
        state = calculateMasteryUpdate(state, { ...baseAttempt, masteryLevel: 1, correct: true }).state;
      }
      for (let i = 0; i < 4; i++) {
        state = calculateMasteryUpdate(state, { ...baseAttempt, masteryLevel: 2, correct: true }).state;
      }
      for (let i = 0; i < 4; i++) {
        state = calculateMasteryUpdate(state, { ...baseAttempt, masteryLevel: 3, correct: true }).state;
      }
      expect(state.currentMasteryLevel).toBe(3);

      // Attempt Level 4 transfer tasks
      for (let i = 0; i < 4; i++) {
        state = calculateMasteryUpdate(state, { ...baseAttempt, masteryLevel: 4, correct: true }).state;
      }
      expect(state.currentMasteryLevel).toBe(4);
      expect(state.bestMasteryLevel).toBe(4);
      expect(state.currentScore).toBeGreaterThanOrEqual(90);
    });
  });

  describe('Hints & Scaffolding Influence', () => {
    it('provides stronger score gain for independent answers than heavily hinted answers', () => {
      const independentRes = calculateMasteryUpdate(undefined, {
        ...baseAttempt,
        masteryLevel: 2,
        correct: true,
        hintsUsed: 0,
      });

      const hintedRes = calculateMasteryUpdate(undefined, {
        ...baseAttempt,
        masteryLevel: 2,
        correct: true,
        hintsUsed: 3,
      });

      expect(independentRes.state.currentScore).toBeGreaterThan(hintedRes.state.currentScore);
      expect(hintedRes.state.currentScore).toBeGreaterThan(0); // Still positive evidence
    });
  });

  describe('Current vs Best Invariants & Forgetting', () => {
    it('never decreases bestScore or bestMasteryLevel when current mastery drops', () => {
      // Build up to Level 3 mastery
      let state: ConceptMasteryState | undefined = undefined;
      for (let i = 0; i < 3; i++) {
        state = calculateMasteryUpdate(state, { ...baseAttempt, masteryLevel: 1, correct: true }).state;
      }
      for (let i = 0; i < 4; i++) {
        state = calculateMasteryUpdate(state, { ...baseAttempt, masteryLevel: 2, correct: true }).state;
      }
      for (let i = 0; i < 4; i++) {
        state = calculateMasteryUpdate(state, { ...baseAttempt, masteryLevel: 3, correct: true }).state;
      }

      const peakScore = state.currentScore;
      expect(state.currentMasteryLevel).toBe(3);
      expect(state.bestMasteryLevel).toBe(3);

      // One failure should not cause catastrophic downgrade
      const singleFailRes = calculateMasteryUpdate(state, {
        ...baseAttempt,
        masteryLevel: 3,
        correct: false,
      });
      expect(singleFailRes.state.currentMasteryLevel).toBe(3);
      expect(singleFailRes.state.bestMasteryLevel).toBe(3);
      expect(singleFailRes.state.bestScore).toBe(peakScore);

      // Repeated failures cause conservative downgrade of current mastery
      state = singleFailRes.state;
      for (let i = 0; i < 4; i++) {
        state = calculateMasteryUpdate(state, {
          ...baseAttempt,
          masteryLevel: 3,
          correct: false,
        }).state;
      }

      // Current mastery decreased, but bestMasteryLevel remained preserved at 3
      expect(state.currentMasteryLevel).toBeLessThan(3);
      expect(state.bestMasteryLevel).toBe(3);
      expect(state.bestScore).toBe(peakScore);
    });
  });

  describe('Confidence Metric', () => {
    it('grows confidence bounded between 0 and 1 as evidence accumulates', () => {
      let state: ConceptMasteryState | undefined = undefined;

      state = calculateMasteryUpdate(state, { ...baseAttempt, correct: true }).state;
      expect(state.confidence).toBeGreaterThan(0);
      expect(state.confidence).toBeLessThan(0.6);

      for (let i = 0; i < 10; i++) {
        state = calculateMasteryUpdate(state, { ...baseAttempt, correct: true }).state;
      }

      expect(state.confidence).toBeGreaterThan(0.7);
      expect(state.confidence).toBeLessThanOrEqual(1.0);
    });
  });

  describe('Cross-Source & Granular Concept Support', () => {
    it('processes attempts from Learn, Tutor, and Practice equivalently', () => {
      const learnRes = calculateMasteryUpdate(undefined, { ...baseAttempt, source: 'learn' });
      const tutorRes = calculateMasteryUpdate(undefined, { ...baseAttempt, source: 'tutor' });
      const practiceRes = calculateMasteryUpdate(undefined, { ...baseAttempt, source: 'practice' });

      expect(learnRes.state.currentScore).toBe(tutorRes.state.currentScore);
      expect(tutorRes.state.currentScore).toBe(practiceRes.state.currentScore);
    });

    it('processes granular Skills Lab fact concepts like mul:7x8', () => {
      let state: ConceptMasteryState | undefined = undefined;
      for (let i = 0; i < 4; i++) {
        state = calculateMasteryUpdate(state, {
          studentId: 'usr_cm1',
          subjectId: 'maths',
          conceptId: 'mul:7x8',
          masteryLevel: 2,
          correct: true,
          hintsUsed: 0,
          source: 'practice',
        }).state;
      }

      expect(state.conceptId).toBe('mul:7x8');
      expect(state.currentMasteryLevel).toBe(2);
    });
  });

  describe('Input Sanitization & Edge Cases', () => {
    it('handles negative hints, invalid attempt numbers, and out-of-range difficulty', () => {
      const res = calculateMasteryUpdate(undefined, {
        ...baseAttempt,
        hintsUsed: -5,
        attemptNumber: -2,
        difficultyScore: 99,
      });

      expect(res.state.totalAttempts).toBe(1);
      expect(res.state.currentScore).toBeGreaterThan(0);
    });
  });
});
