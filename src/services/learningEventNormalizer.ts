/**
 * Canonical Learning Event Normalizer & Mastery Processor for Tutorly
 *
 * Implements the shared learning event pipeline defined in TUTORLY_FINAL_PRODUCT_AND_ADAPTIVE_ARCHITECTURE.md:
 * - Distinguishes raw analytics telemetry from mastery-bearing performance evidence
 * - Normalizes evidence from Learn, Tutor, and Practice surfaces into LearningAttemptResult
 * - Validates, sanitizes, and binds task mastery levels (1–4)
 * - Feeds normalized attempts to MasteryService without duplicating calculation logic
 */

import type {
  LearningAttemptResult,
  LearningAttemptSource,
} from "@/types/learning-attempt";
import type { MasteryLevel } from "@/types/mastery-level";
import type {
  ConceptMasteryState,
  MasteryUpdateResult,
} from "@/types/mastery-v2";
import { calculateMasteryUpdate } from "./masteryService";

export type LearningAttemptNormalizationResult =
  | {
      ok: true;
      attempt: LearningAttemptResult;
    }
  | {
      ok: false;
      reason: string;
    };

/**
 * Event types from learningAnalytics that represent real learner performance
 * (as opposed to navigation/view telemetry).
 */
export const MASTERY_BEARING_EVENT_TYPES = new Set([
  "quiz_answer_submitted",
  "quiz_wrong_answer",
  "quiz_answer_after_remediation",
  "runtime_mini_practice_answered",
  "lesson_completed",
]);

/**
 * Non-mastery analytics event types (for explicit distinction).
 */
export const NON_MASTERY_EVENT_TYPES = new Set([
  "explanation_opened",
  "explanation_style_support_viewed",
  "explanation_check_started",
  "runtime_mini_practice_generated",
  "runtime_mini_practice_hint_clicked",
  "runtime_mini_practice_try_again_clicked",
  "runtime_mini_practice_try_another_clicked",
  "quiz_started",
  "quiz_question_viewed",
  "quiz_hint_clicked",
  "quiz_completed",
  "quiz_remediation_clicked",
  "quiz_remediation_opened",
  "grouped_retry_opened",
  "grouped_learning_style_support_viewed",
  "learning_resources_shown",
  "learning_resource_clicked",
  "recommended_video_clicked",
  "recommended_quiz_clicked",
  "recommended_practice_clicked",
  "resource_recommendation_empty",
  "learning_preference_changed",
  "lesson_started",
]);

/**
 * Checks if a given raw analytics event type carries mastery-bearing evidence.
 */
export function isMasteryBearingEvent(eventType: string): boolean {
  return MASTERY_BEARING_EVENT_TYPES.has(eventType);
}

/**
 * Normalizes difficulty string or number into standard numeric scale (1–5).
 */
export function normalizeDifficultyScore(difficulty?: string | number | null): number | undefined {
  if (typeof difficulty === "number" && Number.isFinite(difficulty)) {
    return Math.max(1, Math.min(5, Math.round(difficulty)));
  }
  if (typeof difficulty === "string") {
    const lower = difficulty.toLowerCase().trim();
    if (lower === "easy" || lower === "facile") return 1;
    if (lower === "medium" || lower === "moyen") return 3;
    if (lower === "hard" || lower === "difficile") return 5;
    const parsed = parseInt(lower, 10);
    if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= 5) return parsed;
  }
  return undefined;
}

/**
 * Input contract for Learn interaction evidence (quizzes, exercises, mini-practice).
 */
export interface LearnInteractionInput {
  studentId: string;
  subjectId: string;
  topicId: string;
  objectiveId?: string;
  taskMasteryLevel?: MasteryLevel;
  correct: boolean;
  hintsUsed?: number;
  attemptNumber?: number;
  responseTimeMs?: number;
  difficulty?: string | number;
  questionId?: string;
  questionKind?: string;
}

/**
 * Normalizes a Learn surface interaction into a LearningAttemptResult.
 * Task mastery level default for standard structured lesson checks is Level 2 (guided application).
 */
export function normalizeLearnAttempt(
  input: LearnInteractionInput
): LearningAttemptNormalizationResult {
  if (!input.studentId || typeof input.studentId !== "string" || !input.studentId.trim()) {
    return { ok: false, reason: "Missing required studentId" };
  }
  if (!input.subjectId || typeof input.subjectId !== "string" || !input.subjectId.trim()) {
    return { ok: false, reason: "Missing required subjectId" };
  }
  if (!input.topicId || typeof input.topicId !== "string" || !input.topicId.trim()) {
    return { ok: false, reason: "Missing required concept/topicId" };
  }

  const masteryLevel = input.taskMasteryLevel ?? 2;
  if (![1, 2, 3, 4].includes(masteryLevel)) {
    return { ok: false, reason: `Invalid taskMasteryLevel: ${masteryLevel}` };
  }

  const hintsUsed = Math.max(0, input.hintsUsed ?? 0);
  const attemptNumber = Math.max(1, input.attemptNumber ?? 1);
  const responseTimeMs = typeof input.responseTimeMs === "number" && input.responseTimeMs >= 0
    ? input.responseTimeMs
    : undefined;

  return {
    ok: true,
    attempt: {
      studentId: input.studentId.trim(),
      subjectId: input.subjectId.trim(),
      conceptId: input.topicId.trim(), // topicId maps to conceptId
      objectiveId: input.objectiveId?.trim() || undefined,
      masteryLevel,
      correct: Boolean(input.correct),
      attemptNumber,
      hintsUsed,
      responseTimeMs,
      difficultyScore: normalizeDifficultyScore(input.difficulty),
      source: "learn",
      metadata: {
        questionId: input.questionId,
        questionKind: input.questionKind,
      },
    },
  };
}

/**
 * Input contract for Practice / Training session interactions.
 */
export interface PracticeInteractionInput {
  studentId: string;
  subjectId: string;
  conceptId: string;
  objectiveId?: string;
  taskMasteryLevel?: MasteryLevel;
  correct: boolean;
  hintsUsed?: number;
  attemptNumber?: number;
  responseTimeMs?: number;
  difficulty?: string | number;
  activityEngine?: string;
}

/**
 * Normalizes a Practice surface interaction into a LearningAttemptResult.
 * Task mastery level default for standard independent practice is Level 3 (independent application).
 */
export function normalizePracticeAttempt(
  input: PracticeInteractionInput
): LearningAttemptNormalizationResult {
  if (!input.studentId || typeof input.studentId !== "string" || !input.studentId.trim()) {
    return { ok: false, reason: "Missing required studentId" };
  }
  if (!input.subjectId || typeof input.subjectId !== "string" || !input.subjectId.trim()) {
    return { ok: false, reason: "Missing required subjectId" };
  }
  if (!input.conceptId || typeof input.conceptId !== "string" || !input.conceptId.trim()) {
    return { ok: false, reason: "Missing required conceptId" };
  }

  const masteryLevel = input.taskMasteryLevel ?? 3;
  if (![1, 2, 3, 4].includes(masteryLevel)) {
    return { ok: false, reason: `Invalid taskMasteryLevel: ${masteryLevel}` };
  }

  const hintsUsed = Math.max(0, input.hintsUsed ?? 0);
  const attemptNumber = Math.max(1, input.attemptNumber ?? 1);
  const responseTimeMs = typeof input.responseTimeMs === "number" && input.responseTimeMs >= 0
    ? input.responseTimeMs
    : undefined;

  return {
    ok: true,
    attempt: {
      studentId: input.studentId.trim(),
      subjectId: input.subjectId.trim(),
      conceptId: input.conceptId.trim(),
      objectiveId: input.objectiveId?.trim() || undefined,
      masteryLevel,
      correct: Boolean(input.correct),
      attemptNumber,
      hintsUsed,
      responseTimeMs,
      difficultyScore: normalizeDifficultyScore(input.difficulty),
      source: "practice",
      metadata: {
        activityEngine: input.activityEngine,
      },
    },
  };
}

/**
 * Input contract for Tutor homework help evaluation attempts.
 */
export interface TutorInteractionInput {
  studentId?: string | null;
  subjectId?: string | null;
  conceptId?: string | null;
  objectiveId?: string | null;
  taskMasteryLevel?: MasteryLevel | null;
  correct?: boolean | null;
  hintsUsed?: number | null;
  attemptNumber?: number | null;
  responseTimeMs?: number | null;
  difficulty?: string | number | null;
  stepId?: string | null;
}

/**
 * Normalizes a Tutor homework interaction into a LearningAttemptResult.
 * If essential concept or correctness metadata is missing (as in freeform unstructured chat),
 * returns ok: false with explicit reasoning rather than fabricating synthetic data.
 */
export function normalizeTutorAttempt(
  input: TutorInteractionInput
): LearningAttemptNormalizationResult {
  if (!input.studentId || !input.studentId.trim()) {
    return { ok: false, reason: "Tutor attempt missing studentId" };
  }
  if (!input.subjectId || !input.subjectId.trim()) {
    return { ok: false, reason: "Tutor attempt missing subjectId" };
  }
  if (!input.conceptId || !input.conceptId.trim()) {
    return { ok: false, reason: "Tutor attempt missing conceptId (unstructured chat)" };
  }
  if (typeof input.correct !== "boolean") {
    return { ok: false, reason: "Tutor attempt has no evaluated correctness signal" };
  }

  const masteryLevel = input.taskMasteryLevel ?? 2;
  if (![1, 2, 3, 4].includes(masteryLevel)) {
    return { ok: false, reason: `Invalid taskMasteryLevel: ${masteryLevel}` };
  }

  const hintsUsed = Math.max(0, input.hintsUsed ?? 0);
  const attemptNumber = Math.max(1, input.attemptNumber ?? 1);
  const responseTimeMs = typeof input.responseTimeMs === "number" && input.responseTimeMs >= 0
    ? input.responseTimeMs
    : undefined;

  return {
    ok: true,
    attempt: {
      studentId: input.studentId.trim(),
      subjectId: input.subjectId.trim(),
      conceptId: input.conceptId.trim(),
      objectiveId: input.objectiveId?.trim() || undefined,
      masteryLevel,
      correct: input.correct,
      attemptNumber,
      hintsUsed,
      responseTimeMs,
      difficultyScore: normalizeDifficultyScore(input.difficulty),
      source: "tutor",
      metadata: {
        stepId: input.stepId || undefined,
      },
    },
  };
}

/**
 * High-level pipeline API: Processes a normalized LearningAttemptResult through MasteryService
 * to produce a deterministic MasteryUpdateResult.
 */
export function processLearningAttempt(
  attempt: LearningAttemptResult,
  previousMasteryState?: ConceptMasteryState,
  timestamp: string = new Date().toISOString()
): MasteryUpdateResult {
  return calculateMasteryUpdate(previousMasteryState, attempt, timestamp);
}
