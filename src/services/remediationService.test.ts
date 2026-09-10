import { describe, expect, it } from 'vitest';
import { PrerequisiteGraph } from './prerequisiteService';
import {
  evaluateRemediation,
  createRemediationLearningUnit,
} from './remediationService';
import type { ConceptMasteryState } from '@/types/mastery-v2';

describe('Prerequisite Graph & Remediation Decision Layer (Phase 6)', () => {
  describe('PrerequisiteGraph pure operations & cycle safety', () => {
    it('stores and queries direct prerequisites', () => {
      const graph = new PrerequisiteGraph([
        {
          subjectId: 'maths',
          prerequisiteConceptId: 'mul:8',
          targetConceptId: 'division_posee_8',
          relationshipType: 'required',
        },
      ]);

      expect(graph.getDirectPrerequisites('division_posee_8')).toEqual(['mul:8']);
      expect(graph.getDirectPrerequisites('mul:8')).toEqual([]);
    });

    it('traverses multi-hop prerequisite chains safely', () => {
      const graph = new PrerequisiteGraph([
        { subjectId: 'maths', prerequisiteConceptId: 'counting', targetConceptId: 'addition', relationshipType: 'required' },
        { subjectId: 'maths', prerequisiteConceptId: 'addition', targetConceptId: 'multiplication', relationshipType: 'required' },
        { subjectId: 'maths', prerequisiteConceptId: 'multiplication', targetConceptId: 'division', relationshipType: 'required' },
      ]);

      const chain = graph.getPrerequisiteChain('division');
      expect(chain).toContain('multiplication');
      expect(chain).toContain('addition');
      expect(chain).toContain('counting');
    });

    it('detects and prevents cycles gracefully without infinite loop', () => {
      const graph = new PrerequisiteGraph([
        { subjectId: 'maths', prerequisiteConceptId: 'A', targetConceptId: 'B', relationshipType: 'required' },
        { subjectId: 'maths', prerequisiteConceptId: 'B', targetConceptId: 'C', relationshipType: 'required' },
      ]);

      expect(graph.hasCycle('C', 'A')).toBe(true);
      expect(graph.hasCycle('A', 'C')).toBe(false);

      // Adding the cyclic edge should not break getPrerequisiteChain
      graph.addRelationship({ subjectId: 'maths', prerequisiteConceptId: 'C', targetConceptId: 'A', relationshipType: 'required' });
      const chain = graph.getPrerequisiteChain('A');
      expect(chain.length).toBeLessThanOrEqual(3);
    });

    it('rejects self-referential relationships', () => {
      const graph = new PrerequisiteGraph();
      const added = graph.addRelationship({
        subjectId: 'maths',
        prerequisiteConceptId: 'self',
        targetConceptId: 'self',
        relationshipType: 'required',
      });
      expect(added).toBe(false);
      expect(graph.getDirectPrerequisites('self')).toEqual([]);
    });
  });

  describe('Remediation Decision Rules', () => {
    const graph = new PrerequisiteGraph([
      {
        subjectId: 'maths',
        prerequisiteConceptId: 'mul:7x8',
        targetConceptId: 'division_864_8',
        relationshipType: 'required',
      },
      {
        subjectId: 'francais',
        prerequisiteConceptId: 'futur_terminaisons',
        targetConceptId: 'futur_simple_phrases',
        relationshipType: 'required',
      },
      {
        subjectId: 'histoire',
        prerequisiteConceptId: 'chronologie_moyen_age',
        targetConceptId: 'analyse_causes_croisades',
        relationshipType: 'required',
      },
    ]);

    it('does NOT trigger remediation after a single failure (conservative)', () => {
      const masteryMap = new Map<string, ConceptMasteryState>();

      const decision = evaluateRemediation({
        blockedConceptId: 'division_864_8',
        subjectId: 'maths',
        graph,
        masteryStateMap: masteryMap,
        consecutiveIncorrectOnBlockedTask: 1, // only 1 mistake
      });

      expect(decision.shouldRemediate).toBe(false);
      expect(decision.reason).toBe('no_remediation_needed');
    });

    it('triggers remediation when prerequisite is unassessed and student has repeated failures', () => {
      const masteryMap = new Map<string, ConceptMasteryState>();

      const decision = evaluateRemediation({
        blockedConceptId: 'division_864_8',
        subjectId: 'maths',
        graph,
        masteryStateMap: masteryMap,
        consecutiveIncorrectOnBlockedTask: 2, // repeated failure
      });

      expect(decision.shouldRemediate).toBe(true);
      expect(decision.targetConceptId).toBe('mul:7x8');
      expect(decision.reason).toBe('unassessed_prerequisite');
      expect(decision.returnToConceptId).toBe('division_864_8');
      expect(decision.depth).toBe(1);
    });

    it('triggers remediation when prerequisite is weak (low score / level)', () => {
      const masteryMap = new Map<string, ConceptMasteryState>();
      masteryMap.set('mul:7x8', {
        studentId: 'std_1',
        subjectId: 'maths',
        conceptId: 'mul:7x8',
        status: 'assessed',
        currentScore: 30, // weak
        bestScore: 30,
        currentMasteryLevel: 1,
        bestMasteryLevel: 1,
        confidence: 0.8,
        totalAttempts: 5,
        correctAttempts: 1,
        consecutiveCorrect: 0,
        consecutiveIncorrect: 3,
        updatedAt: new Date().toISOString(),
      });

      const decision = evaluateRemediation({
        blockedConceptId: 'division_864_8',
        subjectId: 'maths',
        graph,
        masteryStateMap: masteryMap,
        consecutiveIncorrectOnBlockedTask: 2,
      });

      expect(decision.shouldRemediate).toBe(true);
      expect(decision.targetConceptId).toBe('mul:7x8');
      expect(decision.reason).toBe('weak_prerequisite');
    });

    it('does NOT trigger remediation if prerequisite is strongly mastered', () => {
      const masteryMap = new Map<string, ConceptMasteryState>();
      masteryMap.set('mul:7x8', {
        studentId: 'std_1',
        subjectId: 'maths',
        conceptId: 'mul:7x8',
        status: 'assessed',
        currentScore: 85, // strong Level 3
        bestScore: 85,
        currentMasteryLevel: 3,
        bestMasteryLevel: 3,
        confidence: 0.9,
        totalAttempts: 10,
        correctAttempts: 9,
        consecutiveCorrect: 5,
        consecutiveIncorrect: 0,
        updatedAt: new Date().toISOString(),
      });

      const decision = evaluateRemediation({
        blockedConceptId: 'division_864_8',
        subjectId: 'maths',
        graph,
        masteryStateMap: masteryMap,
        consecutiveIncorrectOnBlockedTask: 3,
      });

      expect(decision.shouldRemediate).toBe(false);
      expect(decision.reason).toBe('no_remediation_needed');
    });
  });

  describe('Loop Prevention & Max Depth Guards', () => {
    const graph = new PrerequisiteGraph([
      { subjectId: 'maths', prerequisiteConceptId: 'A', targetConceptId: 'B', relationshipType: 'required' },
    ]);

    it('stops remediation when max automatic depth (1) is reached', () => {
      const decision = evaluateRemediation({
        blockedConceptId: 'B',
        subjectId: 'maths',
        graph,
        masteryStateMap: new Map(),
        consecutiveIncorrectOnBlockedTask: 3,
        context: { depth: 1, visitedConceptIds: ['B'] }, // already at depth 1
      });

      expect(decision.shouldRemediate).toBe(false);
      expect(decision.reason).toBe('max_depth_reached');
    });

    it('skips already visited prerequisite concepts', () => {
      const decision = evaluateRemediation({
        blockedConceptId: 'B',
        subjectId: 'maths',
        graph,
        masteryStateMap: new Map(),
        consecutiveIncorrectOnBlockedTask: 3,
        context: { depth: 0, visitedConceptIds: ['A'] }, // A already visited
      });

      expect(decision.shouldRemediate).toBe(false);
    });

    it('respects cooldown on recently remediated concepts', () => {
      const decision = evaluateRemediation({
        blockedConceptId: 'B',
        subjectId: 'maths',
        graph,
        masteryStateMap: new Map(),
        consecutiveIncorrectOnBlockedTask: 3,
        context: { depth: 0, visitedConceptIds: [], recentlyRemediatedConceptIds: ['A'] },
      });

      expect(decision.shouldRemediate).toBe(false);
      expect(decision.reason).toBe('cooldown_active');
    });
  });

  describe('Cross-Subject Support & LearningUnit Factory', () => {
    const graph = new PrerequisiteGraph([
      { subjectId: 'francais', prerequisiteConceptId: 'futur_terminaisons', targetConceptId: 'futur_phrases', relationshipType: 'required' },
      { subjectId: 'histoire', prerequisiteConceptId: 'chronologie', targetConceptId: 'causes_guerre', relationshipType: 'required' },
    ]);

    it('evaluates French grammar prerequisite seamlessly', () => {
      const decision = evaluateRemediation({
        blockedConceptId: 'futur_phrases',
        subjectId: 'francais',
        graph,
        masteryStateMap: new Map(),
        consecutiveIncorrectOnBlockedTask: 2,
      });

      expect(decision.shouldRemediate).toBe(true);
      expect(decision.targetConceptId).toBe('futur_terminaisons');

      // Factory transforms decision into RemediationLearningUnit
      const unit = createRemediationLearningUnit(decision, 'francais', 'Rappel des terminaisons du futur');
      expect(unit).not.toBeNull();
      expect(unit?.type).toBe('remediation');
      expect(unit?.payload.diagnosedGap.prerequisiteConceptId).toBe('futur_terminaisons');
      expect(unit?.payload.returnContextToken).toBe('resume_futur_phrases');
    });

    it('evaluates History chronology prerequisite seamlessly', () => {
      const decision = evaluateRemediation({
        blockedConceptId: 'causes_guerre',
        subjectId: 'histoire',
        graph,
        masteryStateMap: new Map(),
        consecutiveIncorrectOnBlockedTask: 2,
      });

      expect(decision.shouldRemediate).toBe(true);
      expect(decision.targetConceptId).toBe('chronologie');
    });
  });
});
