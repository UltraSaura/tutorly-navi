/**
 * Canonical LearningUnit Domain Model for Tutorly
 *
 * Defines the unified, polymorphic contract for all learning interactions
 * across Learn, Tutor, and Practice surfaces.
 *
 * Designed to be consumed by the future LearningSessionPlayer (Phase 3).
 */

import type { PedagogicalAgeBand } from "@/config/ageConfig";
import type { MasteryLevel } from "./mastery-level";
import type { SkillActivityDefinition } from "./skill-activity";
import type { LearningStyle } from "./learning-style";

/**
 * ConceptId maps to topics.id in the current database schema,
 * establishing a clean semantic alias for curriculum concepts.
 */
export type ConceptId = string;

export type LearningUnitType =
  | "explanation"
  | "lesson"
  | "exercise"
  | "manipulative"
  | "skill_activity"
  | "remediation";

export interface BaseLearningUnit {
  id: string;
  type: LearningUnitType;

  subjectId: string;
  conceptId: ConceptId;
  objectiveId?: string;

  masteryLevel: MasteryLevel;

  ageBand?: PedagogicalAgeBand;

  difficultyScore?: number;

  prerequisiteConceptIds?: ConceptId[];
}

// ── Explanation Unit ──────────────────────────────────────────────────────────

export interface ExplanationLearningUnit extends BaseLearningUnit {
  type: "explanation";
  payload: {
    prompt: string;
    learningStyle?: LearningStyle;
    conceptCard?: {
      title: string;
      content: string;
      visualType?: string;
      intuition?: string;
    };
    practiceCard?: {
      title: string;
      content: string;
      exampleProblem?: string;
      steps?: string[];
    };
    cachedExplanationId?: string;
  };
}

// ── Lesson Unit ───────────────────────────────────────────────────────────────

export interface LessonLearningUnit extends BaseLearningUnit {
  type: "lesson";
  payload: {
    topicSlug: string;
    title: string;
    description?: string;
    vocabulary?: Array<{ term: string; definition: string }>;
    explanation: string;
    example: string;
    commonMistakes?: string[] | Array<{ mistake: string; why: string }>;
    guidedPractice?: string[];
    exitTicket?: string[];
    videoUrl?: string | null;
  };
}

// ── Exercise Unit ─────────────────────────────────────────────────────────────

export interface ExerciseLearningUnit extends BaseLearningUnit {
  type: "exercise";
  payload: {
    questionId: string;
    prompt: string;
    questionKind:
      | "single"
      | "multi"
      | "numeric"
      | "ordering"
      | "visual"
      | "operation-posee"
      | "slider"
      | "match"
      | "fill-expr"
      | "short_answer"
      | "multiple_choice";
    choices?: unknown[] | null;
    hints?: Array<{ level: number; text: string }> | null;
    solution?: string | null;
    rawPayload?: Record<string, unknown>;
  };
}

// ── Manipulative Unit ─────────────────────────────────────────────────────────

export interface ManipulativeLearningUnit extends BaseLearningUnit {
  type: "manipulative";
  payload: {
    manipulativeType:
      | "object_counter"
      | "number_line"
      | "array_builder"
      | "fraction_model"
      | "place_value_blocks"
      | "balance_scale"
      | "geometry_canvas"
      | "timeline"
      | "diagram_labeler"
      | "map_canvas";
    initialState?: Record<string, unknown>;
    goalState?: Record<string, unknown>;
    instructions: string;
    interactiveMode?: "explore" | "challenge" | "guided";
  };
}

// ── Skill Activity Unit ───────────────────────────────────────────────────────

export interface SkillActivityLearningUnit extends BaseLearningUnit {
  type: "skill_activity";
  payload: {
    activity: SkillActivityDefinition;
    sessionTargetCount?: number;
    timeLimitSeconds?: number;
  };
}

// ── Remediation Unit ──────────────────────────────────────────────────────────

export interface RemediationLearningUnit extends BaseLearningUnit {
  type: "remediation";
  payload: {
    targetProblemContext: string;
    diagnosedGap: {
      prerequisiteConceptId: ConceptId;
      prerequisiteName: string;
      reason: string;
    };
    remediationAction:
      | { type: "mini_explanation"; content: string }
      | { type: "manipulative_drill"; manipulativeType: string }
      | { type: "skill_sprint"; activity: SkillActivityDefinition };
    returnContextToken?: string;
  };
}

// ── Discriminated Union ───────────────────────────────────────────────────────

export type LearningUnit =
  | ExplanationLearningUnit
  | LessonLearningUnit
  | ExerciseLearningUnit
  | ManipulativeLearningUnit
  | SkillActivityLearningUnit
  | RemediationLearningUnit;
