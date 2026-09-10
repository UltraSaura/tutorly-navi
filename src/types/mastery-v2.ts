/**
 * Canonical Mastery v2 Domain Types for Tutorly
 *
 * Implements the state contracts and semantic structures for the Shared Learning Model
 * defined in TUTORLY_FINAL_PRODUCT_AND_ADAPTIVE_ARCHITECTURE.md.
 *
 * Distinctly tracks:
 * - currentMasteryLevel (present estimate, conservative downward adaptation upon failure)
 * - bestMasteryLevel (historical peak demonstrated, strictly non-decreasing)
 * - unassessed vs assessed explicit distinction
 */

import type { MasteryLevel } from "./mastery-level";
import type { ConceptId } from "./learning-unit";

export type MasteryAssessmentStatus = "unassessed" | "assessed";

export interface ConceptMasteryState {
  studentId: string;
  subjectId: string;
  conceptId: ConceptId;
  objectiveId?: string;

  status: MasteryAssessmentStatus;

  /** Current adaptive mastery score (0–100) */
  currentScore: number;
  /** Historical peak mastery score (0–100, non-decreasing) */
  bestScore: number;

  /** Current estimated pedagogical mastery level (undefined if unassessed) */
  currentMasteryLevel?: MasteryLevel;
  /** Historical peak pedagogical mastery level (undefined if unassessed, non-decreasing) */
  bestMasteryLevel?: MasteryLevel;

  /** Confidence in current estimate based on volume & consistency of evidence (0–1) */
  confidence: number;

  totalAttempts: number;
  correctAttempts: number;

  consecutiveCorrect: number;
  consecutiveIncorrect: number;

  lastPracticedAt?: string;
  lastSuccessfulAt?: string;

  updatedAt: string;
}

export interface MasteryUpdateExplanation {
  scoreDelta: number;
  previousLevel?: MasteryLevel;
  newLevel?: MasteryLevel;
  previousScore: number;
  newScore: number;
  reason: string;
}

export interface MasteryUpdateResult {
  state: ConceptMasteryState;
  change: MasteryUpdateExplanation;
}
