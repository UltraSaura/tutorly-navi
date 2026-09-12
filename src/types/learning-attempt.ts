/**
 * Canonical Learning Attempt Result Contract for Tutorly
 *
 * Normalizes learning attempt evidence produced by Learn, Tutor, and Practice
 * interactions into a unified domain event structure for the Shared Learning Model.
 */

import type { MasteryLevel } from "./mastery-level";

export type LearningAttemptSource = "learn" | "tutor" | "practice";

export interface LearningAttemptResult {
  studentId: string;

  subjectId: string;
  conceptId: string;
  objectiveId?: string;

  masteryLevel: MasteryLevel;

  correct: boolean;

  attemptNumber: number;

  hintsUsed: number;

  responseTimeMs?: number;

  difficultyScore?: number;

  source: LearningAttemptSource;

  // Optional contextual metadata mapping cleanly to learning_interaction_events
  metadata?: {
    questionId?: string;
    questionKind?: string;
    activityEngine?: string;
    learningStyleUsed?: string;
    supportType?: string;
    targetPrerequisiteId?: string;
    isRemediation?: boolean;
    tags?: string[];
  };
}
