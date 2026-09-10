import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { LearningSessionPlayer } from './LearningSessionPlayer';
import { LearningUnitRenderer } from './LearningUnitRenderer';
import type {
  LearningUnit,
  ExplanationLearningUnit,
  LessonLearningUnit,
  ExerciseLearningUnit,
  ManipulativeLearningUnit,
  SkillActivityLearningUnit,
  RemediationLearningUnit,
} from '@/types/learning-unit';

describe('LearningSessionPlayer & Unit Renderers (Phase 3)', () => {
  const explanationUnit: ExplanationLearningUnit = {
    id: 'exp_1',
    type: 'explanation',
    subjectId: 'maths',
    conceptId: 'fractions',
    masteryLevel: 1,
    ageBand: 'upper_primary',
    payload: {
      prompt: 'Comment additionner deux fractions ?',
      conceptCard: {
        title: 'Le même dénominateur',
        content: 'Pour additionner deux fractions, elles doivent avoir le même dénominateur.',
        intuition: 'Pense à des parts de même taille !',
      },
      practiceCard: {
        title: 'Exemple',
        content: '1/4 + 2/4 = 3/4',
      },
    },
  };

  const lessonUnit: LessonLearningUnit = {
    id: 'les_1',
    type: 'lesson',
    subjectId: 'francais',
    conceptId: 'accord_verbe',
    masteryLevel: 1,
    payload: {
      topicSlug: 'accord-sujet-verbe',
      title: 'L’accord sujet-verbe',
      explanation: 'Le verbe s’accorde toujours en nombre et en personne avec son sujet.',
      example: 'Les enfants jouent dans la cour.',
      vocabulary: [{ term: 'Sujet', definition: 'Le groupe qui fait l’action' }],
      commonMistakes: ['Oublier le -nt à la 3e personne du pluriel'],
    },
  };

  const exerciseUnit: ExerciseLearningUnit = {
    id: 'exe_1',
    type: 'exercise',
    subjectId: 'maths',
    conceptId: 'addition_simple',
    masteryLevel: 2,
    payload: {
      questionId: 'q_101',
      prompt: 'Combien font 7 + 8 ?',
      questionKind: 'single',
      choices: ['13', '14', '15', '16'],
      solution: '15',
    },
  };

  const manipulativeUnit: ManipulativeLearningUnit = {
    id: 'man_1',
    type: 'manipulative',
    subjectId: 'maths',
    conceptId: 'counting',
    masteryLevel: 1,
    payload: {
      manipulativeType: 'object_counter',
      instructions: 'Compte les pommes.',
      initialState: { a: 4, b: 3, operation: '+', emoji: '🍏' },
    },
  };

  const skillActivityUnit: SkillActivityLearningUnit = {
    id: 'skl_1',
    type: 'skill_activity',
    subjectId: 'histoire',
    conceptId: 'chrono_1',
    masteryLevel: 3,
    payload: {
      activity: {
        id: 'act_hist_1',
        subjectId: 'histoire',
        conceptId: 'chrono_1',
        engine: 'timeline',
        ageBand: 'middle_school',
        masteryLevels: [2, 3],
        difficulty: 2,
        estimatedMinutes: 4,
        configuration: {},
      },
      sessionTargetCount: 5,
    },
  };

  const remediationUnit: RemediationLearningUnit = {
    id: 'rem_1',
    type: 'remediation',
    subjectId: 'maths',
    conceptId: 'division',
    masteryLevel: 2,
    payload: {
      targetProblemContext: '864 ÷ 8',
      diagnosedGap: {
        prerequisiteConceptId: 'mult_8',
        prerequisiteName: 'Table de 8',
        reason: 'Erreur de calcul sur 8 × 8',
      },
      remediationAction: {
        type: 'mini_explanation',
        content: 'Rappel : 8 × 8 = 64.',
      },
      returnContextToken: 'ctx_864_div_8',
    },
  };

  describe('Session Progression & Orchestration Rendering', () => {
    it('handles empty units gracefully without crashing', () => {
      const html = renderToStaticMarkup(<LearningSessionPlayer units={[]} />);
      expect(html).toContain('Aucune unité d’apprentissage disponible');
    });

    it('renders the initial unit with progress indicators and title', () => {
      const html = renderToStaticMarkup(
        <LearningSessionPlayer
          units={[explanationUnit, lessonUnit]}
          sessionTitle="Addition de fractions"
        />
      );

      expect(html).toContain('Addition de fractions');
      expect(html).toContain('1 / 2');
      expect(html).toContain('Comment additionner deux fractions ?');
      expect(html).toContain('Le même dénominateur');
    });

    it('renders at specified initialUnitIndex', () => {
      const html = renderToStaticMarkup(
        <LearningSessionPlayer
          units={[explanationUnit, lessonUnit]}
          initialUnitIndex={1}
        />
      );

      expect(html).toContain('2 / 2');
      expect(html).toContain('L’accord sujet-verbe');
      expect(html).toContain('Le verbe s’accorde');
    });
  });

  describe('Unit Renderer Dispatch Tests', () => {
    it('dispatches and renders explanation unit', () => {
      const html = renderToStaticMarkup(<LearningUnitRenderer unit={explanationUnit} />);
      expect(html).toContain('Le même dénominateur');
      expect(html).toContain('Pour additionner deux fractions');
      expect(html).toContain('Pense à des parts de même taille');
    });

    it('dispatches and renders lesson unit', () => {
      const html = renderToStaticMarkup(<LearningUnitRenderer unit={lessonUnit} />);
      expect(html).toContain('L’accord sujet-verbe');
      expect(html).toContain('Ce qu’il faut savoir');
      expect(html).toContain('Les enfants jouent dans la cour.');
      expect(html).toContain('Sujet :');
      expect(html).toContain('Attention aux pièges courants');
    });

    it('dispatches and renders exercise unit with adapted question card', () => {
      const html = renderToStaticMarkup(<LearningUnitRenderer unit={exerciseUnit} />);
      expect(html).toContain('Combien font 7 + 8 ?');
      expect(html).toContain('15');
    });

    it('dispatches and renders manipulative unit with ObjectCounter', () => {
      const html = renderToStaticMarkup(<LearningUnitRenderer unit={manipulativeUnit} />);
      expect(html).toContain('Manipulation interactive');
      expect(html).toContain('Compte les pommes.');
      expect(html).toContain('🍏');
    });

    it('dispatches and renders skill activity unit (Phase 9 boundary)', () => {
      const html = renderToStaticMarkup(<LearningUnitRenderer unit={skillActivityUnit} />);
      expect(html).toContain('Activité d’entraînement : timeline');
      expect(html).toContain('4 min');
      expect(html).toContain('Niveau 2');
    });

    it('dispatches and renders remediation unit with gap context and action', () => {
      const html = renderToStaticMarkup(<LearningUnitRenderer unit={remediationUnit} />);
      expect(html).toContain('Pause Remédiation : Table de 8');
      expect(html).toContain('864 ÷ 8');
      expect(html).toContain('Rappel : 8 × 8 = 64.');
      expect(html).toContain('Reprendre le devoir');
    });

    it('handles unsupported manipulative gracefully without crashing', () => {
      const unsupportedManipulative: ManipulativeLearningUnit = {
        id: 'man_unsupported',
        type: 'manipulative',
        subjectId: 'maths',
        conceptId: 'fractions',
        masteryLevel: 2,
        payload: {
          manipulativeType: 'fraction_model',
          instructions: 'Visualise les fractions.',
        },
      };

      const html = renderToStaticMarkup(<LearningUnitRenderer unit={unsupportedManipulative} />);
      expect(html).toContain('Outil de manipulation : fraction_model');
      expect(html).toContain('Outil interactif en cours de préparation');
      expect(html).toContain('Continuer');
    });
  });
});

