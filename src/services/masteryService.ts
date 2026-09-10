/**
 * Pure Deterministic Mastery v2 Service for Tutorly
 *
 * Implements evidence processing and state transitions for the Shared Learning Model
 * according to TUTORLY_FINAL_PRODUCT_AND_ADAPTIVE_ARCHITECTURE.md.
 *
 * Core Rules:
 * - Deterministic, pure calculation (no Supabase / network side-effects)
 * - Level-bounded: easy Level-1 success cannot produce Level-4 mastery
 * - Non-decreasing bestMasteryLevel and bestScore
 * - Conservative downward adaptation of currentMasteryLevel upon repeated errors
 * - Hints reduce positive evidence strength while remaining positive
 * - Unassessed status kept strictly distinct from Level 1 ("Understand")
 */

import type { LearningAttemptResult } from "@/types/learning-attempt";
import type { MasteryLevel } from "@/types/mastery-level";
import type {
  ConceptMasteryState,
  MasteryUpdateResult,
} from "@/types/mastery-v2";

/**
 * Creates a clean, unassessed initial mastery state for a student and concept.
 */
export function createInitialMasteryState(
  studentId: string,
  subjectId: string,
  conceptId: string,
  objectiveId?: string,
  timestamp: string = new Date().toISOString()
): ConceptMasteryState {
  return {
    studentId,
    subjectId,
    conceptId,
    objectiveId,
    status: "unassessed",
    currentScore: 0,
    bestScore: 0,
    currentMasteryLevel: undefined,
    bestMasteryLevel: undefined,
    confidence: 0,
    totalAttempts: 0,
    correctAttempts: 0,
    consecutiveCorrect: 0,
    consecutiveIncorrect: 0,
    updatedAt: timestamp,
  };
}

/**
 * Clamps numeric values safely into an inclusive range.
 */
function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value) || !Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

/**
 * Validates and normalizes raw LearningAttemptResult data.
 */
function sanitizeAttempt(attempt: LearningAttemptResult): LearningAttemptResult {
  const safeHints = Math.max(0, attempt.hintsUsed || 0);
  const safeAttemptNum = Math.max(1, attempt.attemptNumber || 1);
  const rawLevel = Number(attempt.masteryLevel);
  const safeLevel = (rawLevel >= 1 && rawLevel <= 4 ? rawLevel : 1) as MasteryLevel;

  let safeDiff: number | undefined;
  if (typeof attempt.difficultyScore === "number" && Number.isFinite(attempt.difficultyScore)) {
    safeDiff = clamp(attempt.difficultyScore, 1, 5);
  }

  return {
    ...attempt,
    hintsUsed: safeHints,
    attemptNumber: safeAttemptNum,
    masteryLevel: safeLevel,
    difficultyScore: safeDiff,
  };
}

/**
 * Maps a calculated numerical score and highest demonstrated level to a MasteryLevel.
 *
 * Strict pedagogical bounding:
 * Level 1: score >= 20, maxLevel >= 1
 * Level 2: score >= 45, maxLevel >= 2
 * Level 3: score >= 70, maxLevel >= 3
 * Level 4: score >= 90, maxLevel >= 4
 */
function scoreToMasteryLevel(
  score: number,
  maxDemonstratedLevel: MasteryLevel
): MasteryLevel | undefined {
  if (score >= 90 && maxDemonstratedLevel >= 4) return 4;
  if (score >= 70 && maxDemonstratedLevel >= 3) return 3;
  if (score >= 45 && maxDemonstratedLevel >= 2) return 2;
  if (score >= 20 && maxDemonstratedLevel >= 1) return 1;
  return score > 0 ? 1 : undefined;
}

/**
 * Pure calculation function that computes the updated ConceptMasteryState
 * from an incoming LearningAttemptResult.
 */
export function calculateMasteryUpdate(
  previousState: ConceptMasteryState | undefined,
  rawAttempt: LearningAttemptResult,
  timestamp: string = new Date().toISOString()
): MasteryUpdateResult {
  const attempt = sanitizeAttempt(rawAttempt);
  const prev =
    previousState ??
    createInitialMasteryState(
      attempt.studentId,
      attempt.subjectId,
      attempt.conceptId,
      attempt.objectiveId,
      timestamp
    );

  const prevScore = prev.currentScore;
  const prevLevel = prev.currentMasteryLevel;

  const totalAttempts = prev.totalAttempts + 1;
  const correctAttempts = prev.correctAttempts + (attempt.correct ? 1 : 0);

  const consecutiveCorrect = attempt.correct ? prev.consecutiveCorrect + 1 : 0;
  const consecutiveIncorrect = attempt.correct ? 0 : prev.consecutiveIncorrect + 1;

  let currentScore = prevScore;
  let reason = "";

  if (attempt.correct) {
    // Independence factor: no hints (1.0) -> 1 hint (0.7) -> 2 hints (0.5) -> 3+ hints (0.35)
    let independenceFactor = 1.0;
    if (attempt.hintsUsed === 1) independenceFactor = 0.7;
    else if (attempt.hintsUsed === 2) independenceFactor = 0.5;
    else if (attempt.hintsUsed >= 3) independenceFactor = 0.35;

    // Difficulty weighting: difficulty 1 (0.8x) to difficulty 5 (1.2x)
    const diffMultiplier = attempt.difficultyScore ? 0.7 + (attempt.difficultyScore / 5) * 0.5 : 1.0;

    // Target score ceiling permitted by this attempt's level
    // Level 1 cap = 40, Level 2 cap = 65, Level 3 cap = 85, Level 4 cap = 100
    const levelScoreCaps: Record<MasteryLevel, number> = {
      1: 40,
      2: 65,
      3: 85,
      4: 100,
    };
    const targetCap = levelScoreCaps[attempt.masteryLevel];

    // Base gain depends on attempted level
    const baseGain = attempt.masteryLevel * 10;
    const effectiveGain = baseGain * independenceFactor * diffMultiplier;

    // Gain diminishes as currentScore approaches the level's cap
    if (currentScore < targetCap) {
      const roomToGrow = (targetCap - currentScore) / targetCap;
      const actualGain = Math.max(3, Math.round(effectiveGain * roomToGrow));
      currentScore = Math.min(targetCap, currentScore + actualGain);
    }

    reason = attempt.hintsUsed > 0
      ? `Succès guidé (Niveau ${attempt.masteryLevel}, ${attempt.hintsUsed} indice(s))`
      : `Succès autonome (Niveau ${attempt.masteryLevel})`;
  } else {
    // Conservative penalty on failure
    // A single failure has very small impact; repeated failures increase decay
    const penaltyBase = attempt.masteryLevel * 2;
    const streakPenalty = Math.min(10, consecutiveIncorrect * 2);
    const totalPenalty = penaltyBase + streakPenalty;

    currentScore = Math.max(0, currentScore - totalPenalty);
    reason = `Erreur sur tâche de Niveau ${attempt.masteryLevel}`;
  }

  // Update confidence (0 to 1 based on attempt volume and consistency)
  // Confidence grows with attempts, dampened by contradictions
  const attemptWeight = Math.min(0.6, totalAttempts * 0.08);
  const consistencyWeight = totalAttempts > 0 ? (correctAttempts / totalAttempts) * 0.4 : 0;
  const newConfidence = clamp(
    Math.round((attemptWeight + consistencyWeight) * 100) / 100,
    0,
    1
  );

  // Calculate new current mastery level bounded by pedagogical evidence
  let newLevel: MasteryLevel | undefined = prev.currentMasteryLevel;

  if (attempt.correct) {
    const candidateLevel = scoreToMasteryLevel(
      currentScore,
      Math.max(prev.currentMasteryLevel ?? 1, attempt.masteryLevel) as MasteryLevel
    );
    newLevel = candidateLevel;
  } else {
    // Single failure retains existing level if score remains above floor
    // Only downgrade if consecutive failures >= 2 and score dropped significantly
    if (consecutiveIncorrect >= 2 && prev.currentMasteryLevel && prev.currentMasteryLevel > 1) {
      if (currentScore < 40 && prev.currentMasteryLevel >= 2) {
        newLevel = 1;
        reason += " — Dégradation adaptative vers Niveau 1 suite à difficultés répétées";
      } else if (currentScore < 65 && prev.currentMasteryLevel >= 3) {
        newLevel = 2;
        reason += " — Dégradation adaptative vers Niveau 2 suite à difficultés répétées";
      } else if (currentScore < 85 && prev.currentMasteryLevel === 4) {
        newLevel = 3;
        reason += " — Dégradation adaptative vers Niveau 3 suite à difficultés répétées";
      }
    } else {
      newLevel = prev.currentMasteryLevel ?? (currentScore > 0 ? 1 : undefined);
    }
  }

  // Best invariants: bestScore and bestMasteryLevel must NEVER decrease
  const bestScore = Math.max(prev.bestScore, currentScore);
  let bestMasteryLevel = prev.bestMasteryLevel;
  if (newLevel !== undefined) {
    bestMasteryLevel = prev.bestMasteryLevel !== undefined
      ? (Math.max(prev.bestMasteryLevel, newLevel) as MasteryLevel)
      : newLevel;
  }

  const updatedState: ConceptMasteryState = {
    studentId: prev.studentId,
    subjectId: prev.subjectId,
    conceptId: prev.conceptId,
    objectiveId: prev.objectiveId ?? attempt.objectiveId,
    status: newLevel !== undefined || currentScore > 0 ? "assessed" : prev.status,
    currentScore,
    bestScore,
    currentMasteryLevel: newLevel,
    bestMasteryLevel,
    confidence: newConfidence,
    totalAttempts,
    correctAttempts,
    consecutiveCorrect,
    consecutiveIncorrect,
    lastPracticedAt: timestamp,
    lastSuccessfulAt: attempt.correct ? timestamp : prev.lastSuccessfulAt,
    updatedAt: timestamp,
  };

  return {
    state: updatedState,
    change: {
      scoreDelta: currentScore - prevScore,
      previousLevel: prevLevel,
      newLevel,
      previousScore: prevScore,
      newScore: currentScore,
      reason,
    },
  };
}
