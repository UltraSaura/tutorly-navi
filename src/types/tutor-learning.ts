/**
 * Canonical Tutor Adaptive Learning Contracts for Tutorly
 *
 * Defines the structured problem context, tutoring support strategy,
 * attempt tracking, and resumable remediation handoff contracts for Tutor.
 */

import type { ConceptId } from "./learning-unit";
import type { MasteryLevel } from "./mastery-level";
import type { PedagogicalAgeBand } from "@/config/ageConfig";

export type TutorProblemStatus =
  | "submitted"
  | "analyzed"
  | "in_progress"
  | "remediating"
  | "resumed"
  | "completed";

export type TutorSupportStrategy =
  | "socratic"
  | "targeted_hint"
  | "worked_step"
  | "concept_explanation"
  | "prerequisite_remediation";

export interface TutorProblemContext {
  problemId: string;
  conversationId?: string;
  studentId: string;
  subjectId: string;
  conceptId?: ConceptId;
  conceptName?: string;
  objectiveId?: string;

  detectedMasteryLevel?: MasteryLevel;
  difficultyScore?: number;
  originalPrompt?: string;

  hintsUsedCount: number;
  attemptCount: number;
  consecutiveIncorrectCount: number;

  status: TutorProblemStatus;
  supportStrategy: TutorSupportStrategy;
  ageBand?: PedagogicalAgeBand;

  createdAt: string;
  updatedAt: string;
}

export interface TutorRemediationReturnContext {
  conversationId?: string;
  problemId: string;
  conceptId: ConceptId;
  messageId?: string;
  attemptNumber: number;
  hintsUsedCount: number;
  returnContextToken: string;
  originalPrompt?: string;
}

export interface EvaluatedTutorAttemptInput {
  problemContext: TutorProblemContext;
  studentAnswer?: string | unknown;
  isCorrect: boolean;
  hintsUsed?: number;
  responseTimeMs?: number;
  stepId?: string;
}
