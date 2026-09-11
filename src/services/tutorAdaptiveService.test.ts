import { describe, expect, it } from 'vitest';
import {
  createTutorProblemContext,
  recordTutorHintGiven,
  determineTutorSupportStrategy,
  processTutorAttempt,
  resumeTutorAfterRemediation,
  getTutorDialogueCue,
} from './tutorAdaptiveService';
import { PrerequisiteGraph } from './prerequisiteService';
import type { ConceptMasteryState } from '@/types/mastery-v2';

describe('Tutor Adaptive Service (Phase 7)', () => {
  const baseContext = createTutorProblemContext({
    problemId: 'prob_864_div_8',
    studentId: 'std_cm1',
    subjectId: 'maths',
    conceptId: 'division_posee',
    originalPrompt: 'Pose et calcule 864 ÷ 8',
    ageBand: 'upper_primary',
  });

  const mathGraph = new PrerequisiteGraph([
    {
      subjectId: 'maths',
      prerequisiteConceptId: 'mul:8',
      targetConceptId: 'division_posee',
      relationshipType: 'required',
    },
  ]);

  describe('Problem Context & Hint Tracking', () => {
    it('creates structured problem context with initial counters', () => {
      expect(baseContext.problemId).toBe('prob_864_div_8');
      expect(baseContext.hintsUsedCount).toBe(0);
      expect(baseContext.attemptCount).toBe(0);
      expect(baseContext.status).toBe('submitted');
    });

    it('increments hint count when student receives guidance', () => {
      const updated = recordTutorHintGiven(baseContext);
      expect(updated.hintsUsedCount).toBe(1);
      expect(updated.status).toBe('in_progress');
    });
  });

  describe('Structured Attempt Processing & Mastery', () => {
    it('updates Mastery v2 when student submits a correct attempt', () => {
      const res = processTutorAttempt({
        input: {
          problemContext: baseContext,
          isCorrect: true,
          studentAnswer: '108',
        },
      });

      expect(res.updatedContext.attemptCount).toBe(1);
      expect(res.updatedContext.status).toBe('completed');
      expect(res.masteryUpdate).toBeDefined();
      expect(res.masteryUpdate?.state.currentMasteryLevel).toBeDefined();
      expect(res.masteryUpdate?.state.currentScore).toBeGreaterThan(0);
    });

    it('does not crash or update mastery when conceptId is missing (unstructured free chat)', () => {
      const freeChatContext = createTutorProblemContext({
        problemId: 'prob_general',
        studentId: 'std_1',
        subjectId: 'maths',
        // conceptId omitted
      });

      const res = processTutorAttempt({
        input: {
          problemContext: freeChatContext,
          isCorrect: true,
        },
      });

      expect(res.masteryUpdate).toBeUndefined();
      expect(res.updatedContext.status).toBe('completed');
    });
  });

  describe('Repeated Failure & Prerequisite Remediation Handoff', () => {
    it('does not trigger remediation after first failure (conservative)', () => {
      const masteryMap = new Map<string, ConceptMasteryState>();
      const res = processTutorAttempt({
        input: {
          problemContext: baseContext,
          isCorrect: false,
          studentAnswer: '104',
        },
        graph: mathGraph,
        masteryStateMap: masteryMap,
      });

      expect(res.remediationDecision?.shouldRemediate).toBe(false);
      expect(res.updatedContext.status).toBe('in_progress');
      expect(res.supportStrategy).toBe('targeted_hint');
    });

    it('triggers remediation handoff after repeated failure on weak prerequisite', () => {
      const masteryMap = new Map<string, ConceptMasteryState>();
      masteryMap.set('mul:8', {
        studentId: 'std_cm1',
        subjectId: 'maths',
        conceptId: 'mul:8',
        status: 'assessed',
        currentScore: 25, // weak prerequisite
        bestScore: 25,
        currentMasteryLevel: 1,
        bestMasteryLevel: 1,
        confidence: 0.8,
        totalAttempts: 4,
        correctAttempts: 1,
        consecutiveCorrect: 0,
        consecutiveIncorrect: 3,
        updatedAt: new Date().toISOString(),
      });

      // Attempt 1 fails
      const att1 = processTutorAttempt({
        input: { problemContext: baseContext, isCorrect: false },
        graph: mathGraph,
        masteryStateMap: masteryMap,
      });

      // Attempt 2 fails
      const att2 = processTutorAttempt({
        input: { problemContext: att1.updatedContext, isCorrect: false },
        graph: mathGraph,
        masteryStateMap: masteryMap,
      });

      expect(att2.remediationDecision?.shouldRemediate).toBe(true);
      expect(att2.remediationDecision?.targetConceptId).toBe('mul:8');
      expect(att2.remediationUnit).toBeDefined();
      expect(att2.remediationUnit?.type).toBe('remediation');
      expect(att2.returnContext).toBeDefined();
      expect(att2.returnContext?.problemId).toBe('prob_864_div_8');
      expect(att2.returnContext?.conceptId).toBe('division_posee');
      expect(att2.updatedContext.status).toBe('remediating');
      expect(att2.supportStrategy).toBe('prerequisite_remediation');
    });
  });

  describe('Remediation Return & Resume Flow', () => {
    it('restores the original homework context after remediation completion without falsely marking it correct', () => {
      const returnContext = {
        problemId: 'prob_864_div_8',
        conceptId: 'division_posee',
        attemptNumber: 2,
        hintsUsedCount: 1,
        returnContextToken: 'resume_prob_864_div_8_division_posee',
      };

      const resumedContext = resumeTutorAfterRemediation(returnContext, baseContext);

      expect(resumedContext.problemId).toBe('prob_864_div_8');
      expect(resumedContext.conceptId).toBe('division_posee');
      expect(resumedContext.status).toBe('resumed');
      expect(resumedContext.consecutiveIncorrectCount).toBe(0); // reset consecutive failures for fresh attempt
    });
  });

  describe('Tutoring Support Strategy Selection', () => {
    it('selects Socratic strategy for high-mastery students', () => {
      const strongMastery: ConceptMasteryState = {
        studentId: 'std_1',
        subjectId: 'maths',
        conceptId: 'division_posee',
        status: 'assessed',
        currentScore: 85,
        bestScore: 85,
        currentMasteryLevel: 3,
        bestMasteryLevel: 3,
        confidence: 0.9,
        totalAttempts: 10,
        correctAttempts: 9,
        consecutiveCorrect: 3,
        consecutiveIncorrect: 0,
        updatedAt: new Date().toISOString(),
      };

      const strategy = determineTutorSupportStrategy({
        masteryState: strongMastery,
        consecutiveIncorrect: 0,
        hintsUsed: 0,
      });

      expect(strategy).toBe('socratic');
    });

    it('selects concept_explanation after multiple hints requested', () => {
      const strategy = determineTutorSupportStrategy({
        consecutiveIncorrect: 1,
        hintsUsed: 3,
      });

      expect(strategy).toBe('concept_explanation');
    });
  });

  describe('Age-Adapted Dialogue Cues', () => {
    it('provides playful/simple cues for primary students and academic cues for high school', () => {
      const primaryCue = getTutorDialogueCue('prerequisite_remediation', 'upper_primary');
      const lyceeCue = getTutorDialogueCue('prerequisite_remediation', 'high_school');

      expect(primaryCue).toContain('mini-défi');
      expect(lyceeCue).toContain('Cette étape semble bloquée par un prérequis');
    });
  });

  describe('Cross-Subject Support', () => {
    it('supports French grammar tutoring and prerequisite remediation', () => {
      const frenchGraph = new PrerequisiteGraph([
        {
          subjectId: 'francais',
          prerequisiteConceptId: 'terminaisons_futur',
          targetConceptId: 'phrases_futur_simple',
          relationshipType: 'required',
        },
      ]);

      const frenchContext = createTutorProblemContext({
        problemId: 'prob_fr_1',
        studentId: 'std_fr',
        subjectId: 'francais',
        conceptId: 'phrases_futur_simple',
      });

      const masteryMap = new Map<string, ConceptMasteryState>();
      // Attempt 1 and 2 fail
      const att1 = processTutorAttempt({ input: { problemContext: frenchContext, isCorrect: false }, graph: frenchGraph, masteryStateMap: masteryMap });
      const att2 = processTutorAttempt({ input: { problemContext: att1.updatedContext, isCorrect: false }, graph: frenchGraph, masteryStateMap: masteryMap });

      expect(att2.remediationDecision?.shouldRemediate).toBe(true);
      expect(att2.remediationDecision?.targetConceptId).toBe('terminaisons_futur');
      expect(att2.returnContext?.conceptId).toBe('phrases_futur_simple');
    });
  });
});
