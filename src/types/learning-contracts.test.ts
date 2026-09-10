import { describe, expect, it } from 'vitest';
import {
  MASTERY_LEVEL_LABELS,
  MASTERY_LEVEL_NAMES_FR,
  MASTERY_LEVEL_NAMES_EN,
  type MasteryLevel,
} from '@/types/mastery-level';
import type {
  LearningUnit,
  ExplanationLearningUnit,
  LessonLearningUnit,
  ExerciseLearningUnit,
  ManipulativeLearningUnit,
  SkillActivityLearningUnit,
  RemediationLearningUnit,
} from '@/types/learning-unit';
import type {
  SkillActivityDefinition,
  SkillActivityEngine,
} from '@/types/skill-activity';
import type {
  LearningAttemptResult,
  LearningAttemptSource,
} from '@/types/learning-attempt';
import type {
  RecommendedAction,
  RecommendedActionReason,
  RecommendedActionSource,
} from '@/types/recommendations';

describe('Unified Domain Types Contract (Phase 2)', () => {
  describe('MasteryLevel Contract', () => {
    it('defines labels for all 4 mastery levels', () => {
      expect(MASTERY_LEVEL_LABELS[1]).toBe('understand');
      expect(MASTERY_LEVEL_LABELS[2]).toBe('guided_application');
      expect(MASTERY_LEVEL_LABELS[3]).toBe('independent_application');
      expect(MASTERY_LEVEL_LABELS[4]).toBe('transfer');
    });

    it('provides French semantic names', () => {
      expect(MASTERY_LEVEL_NAMES_FR[1]).toBe('Comprendre');
      expect(MASTERY_LEVEL_NAMES_FR[2]).toBe('Application guidée');
      expect(MASTERY_LEVEL_NAMES_FR[3]).toBe('Application autonome');
      expect(MASTERY_LEVEL_NAMES_FR[4]).toBe('Transfert');
    });

    it('provides English semantic names', () => {
      expect(MASTERY_LEVEL_NAMES_EN[1]).toBe('Understand');
      expect(MASTERY_LEVEL_NAMES_EN[2]).toBe('Guided Application');
      expect(MASTERY_LEVEL_NAMES_EN[3]).toBe('Independent Application');
      expect(MASTERY_LEVEL_NAMES_EN[4]).toBe('Transfer');
    });
  });

  describe('LearningUnit Discriminated Union Contract', () => {
    it('allows instantiation and narrowing of explanation units', () => {
      const unit: LearningUnit = {
        id: 'unit_exp_1',
        type: 'explanation',
        subjectId: 'maths',
        conceptId: 'fractions_basics',
        masteryLevel: 1,
        ageBand: 'upper_primary',
        payload: {
          prompt: 'Qu’est-ce qu’une fraction ?',
          conceptCard: {
            title: 'Le partage équitable',
            content: 'Une fraction représente une partie d’un tout partagé en parts égales.',
          },
        },
      };

      if (unit.type === 'explanation') {
        expect(unit.payload.conceptCard?.title).toBe('Le partage équitable');
      } else {
        throw new Error('Type narrowing failed for explanation unit');
      }
    });

    it('allows instantiation and narrowing of lesson units', () => {
      const unit: LearningUnit = {
        id: 'unit_les_1',
        type: 'lesson',
        subjectId: 'francais',
        conceptId: 'present_indicatif',
        masteryLevel: 1,
        payload: {
          topicSlug: 'le-present-de-l-indicatif',
          title: 'Le présent de l’indicatif',
          explanation: 'On utilise le présent pour parler d’une action qui se déroule maintenant.',
          example: 'Je chante, tu chantes, nous chantons.',
        },
      };

      if (unit.type === 'lesson') {
        expect(unit.payload.topicSlug).toBe('le-present-de-l-indicatif');
      } else {
        throw new Error('Type narrowing failed for lesson unit');
      }
    });

    it('allows instantiation and narrowing of manipulative units', () => {
      const unit: LearningUnit = {
        id: 'unit_man_1',
        type: 'manipulative',
        subjectId: 'maths',
        conceptId: 'multiplication_arrays',
        masteryLevel: 2,
        payload: {
          manipulativeType: 'array_builder',
          instructions: 'Construis un rectangle de 4 lignes de 7 carreaux.',
          interactiveMode: 'challenge',
        },
      };

      if (unit.type === 'manipulative') {
        expect(unit.payload.manipulativeType).toBe('array_builder');
      } else {
        throw new Error('Type narrowing failed for manipulative unit');
      }
    });

    it('allows instantiation and narrowing of remediation units', () => {
      const unit: LearningUnit = {
        id: 'unit_rem_1',
        type: 'remediation',
        subjectId: 'maths',
        conceptId: 'division_posee',
        masteryLevel: 2,
        payload: {
          targetProblemContext: '864 ÷ 8',
          diagnosedGap: {
            prerequisiteConceptId: 'tables_multiplication_8',
            prerequisiteName: 'Table de 8',
            reason: 'Erreur répétée sur 8 × 8 dans la division.',
          },
          remediationAction: {
            type: 'mini_explanation',
            content: 'Rappel : 8 × 8 = 64.',
          },
          returnContextToken: 'tutor_session_ctx_123',
        },
      };

      if (unit.type === 'remediation') {
        expect(unit.payload.diagnosedGap.prerequisiteConceptId).toBe('tables_multiplication_8');
      } else {
        throw new Error('Type narrowing failed for remediation unit');
      }
    });
  });

  describe('SkillActivityDefinition Contract across Subjects', () => {
    it('supports math sprint activity definition', () => {
      const mathActivity: SkillActivityDefinition = {
        id: 'math_sprint_mult_8',
        subjectId: 'maths',
        conceptId: 'multiplication_facts',
        engine: 'fact_sprint',
        ageBand: 'upper_primary',
        masteryLevels: [2, 3],
        difficulty: 2,
        estimatedMinutes: 3,
        configuration: {
          targetFamily: '8',
          questionCount: 12,
        },
      };

      expect(mathActivity.engine).toBe('fact_sprint');
      expect(mathActivity.estimatedMinutes).toBe(3);
    });

    it('supports French grammar timeline/sentence builder activity definition', () => {
      const frenchActivity: SkillActivityDefinition = {
        id: 'fr_sentence_builder_1',
        subjectId: 'francais',
        conceptId: 'accord_sujet_verbe',
        engine: 'sentence_builder',
        ageBand: 'upper_primary',
        masteryLevels: [2, 3],
        difficulty: 2,
        configuration: {
          scrambledSegments: ['Les oiseaux', 'chantent', 'dans le jardin'],
        },
      };

      expect(frenchActivity.engine).toBe('sentence_builder');
    });

    it('supports History timeline activity definition', () => {
      const historyActivity: SkillActivityDefinition = {
        id: 'hist_timeline_rois',
        subjectId: 'histoire',
        conceptId: 'moyen_age_chronologie',
        engine: 'timeline',
        ageBand: 'middle_school',
        masteryLevels: [2, 3],
        difficulty: 3,
        configuration: {
          events: [{ year: 800, title: 'Couronnement de Charlemagne' }],
        },
      };

      expect(historyActivity.engine).toBe('timeline');
    });
  });

  describe('LearningAttemptResult Contract', () => {
    it('normalizes attempt evidence from Learn, Tutor, and Practice', () => {
      const sources: LearningAttemptSource[] = ['learn', 'tutor', 'practice'];
      
      sources.forEach((source) => {
        const attempt: LearningAttemptResult = {
          studentId: 'usr_123',
          subjectId: 'maths',
          conceptId: 'fractions_simplification',
          masteryLevel: 3,
          correct: true,
          attemptNumber: 1,
          hintsUsed: 0,
          responseTimeMs: 3400,
          difficultyScore: 2,
          source,
          metadata: {
            questionKind: 'numeric',
          },
        };

        expect(attempt.source).toBe(source);
        expect(attempt.correct).toBe(true);
      });
    });
  });

  describe('RecommendedAction Contract', () => {
    it('supports all 7 recommendation reasons', () => {
      const reasons: RecommendedActionReason[] = [
        'continue',
        'prerequisite',
        'weak_skill',
        'spaced_review',
        'homework_followup',
        'curriculum',
        'enrichment',
      ];

      reasons.forEach((reason, index) => {
        const action: RecommendedAction = {
          source: 'practice',
          subjectId: 'maths',
          conceptId: `concept_${index}`,
          reason,
          estimatedMinutes: 5,
          priority: 100 - index * 10,
        };

        expect(action.reason).toBe(reason);
      });
    });
  });
});
