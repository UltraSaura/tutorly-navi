/**
 * Pure Tutor Adaptive Learning Service for Tutorly
 *
 * Coordinates:
 * - TutorProblemContext lifecycle & hint/attempt tracking
 * - Evaluation of structured homework attempts into LearningAttemptResult (Phase 5)
 * - Mastery v2 updates & strategy selection (Socratic / Targeted Hint / Concept / Remediation)
 * - Prerequisite remediation checks (Phase 6) and resumable return context creation
 * - Graceful degradation when concept or prerequisite metadata is absent
 */

import type {
  TutorProblemContext,
  TutorSupportStrategy,
  TutorRemediationReturnContext,
  EvaluatedTutorAttemptInput,
} from "@/types/tutor-learning";
import type { ConceptMasteryState, MasteryUpdateResult } from "@/types/mastery-v2";
import type { RemediationContext, RemediationDecision } from "@/types/prerequisite";
import type { RemediationLearningUnit } from "@/types/learning-unit";
import { normalizeTutorAttempt, processLearningAttempt } from "./learningEventNormalizer";
import { PrerequisiteGraph } from "./prerequisiteService";
import { evaluateRemediation, createRemediationLearningUnit } from "./remediationService";
import { getAgeLearningConfig, type PedagogicalAgeBand } from "@/config/ageConfig";

/**
 * Creates a new structured TutorProblemContext for a homework problem.
 */
export function createTutorProblemContext(params: {
  problemId: string;
  studentId: string;
  subjectId: string;
  conversationId?: string;
  conceptId?: string;
  conceptName?: string;
  objectiveId?: string;
  originalPrompt?: string;
  difficultyScore?: number;
  ageBand?: PedagogicalAgeBand;
  timestamp?: string;
}): TutorProblemContext {
  const ts = params.timestamp || new Date().toISOString();
  return {
    problemId: params.problemId,
    conversationId: params.conversationId,
    studentId: params.studentId,
    subjectId: params.subjectId,
    conceptId: params.conceptId,
    conceptName: params.conceptName,
    objectiveId: params.objectiveId,
    originalPrompt: params.originalPrompt,
    difficultyScore: params.difficultyScore,
    hintsUsedCount: 0,
    attemptCount: 0,
    consecutiveIncorrectCount: 0,
    status: "submitted",
    supportStrategy: "targeted_hint",
    ageBand: params.ageBand,
    createdAt: ts,
    updatedAt: ts,
  };
}

/**
 * Registers an escalation or request for a hint by the student.
 */
export function recordTutorHintGiven(
  context: TutorProblemContext,
  timestamp: string = new Date().toISOString()
): TutorProblemContext {
  return {
    ...context,
    hintsUsedCount: context.hintsUsedCount + 1,
    status: "in_progress",
    updatedAt: timestamp,
  };
}

/**
 * Determines the optimal tutoring response strategy based on current mastery & attempt evidence.
 */
export function determineTutorSupportStrategy(params: {
  masteryState?: ConceptMasteryState;
  consecutiveIncorrect: number;
  hintsUsed: number;
  hasPrerequisiteRemediation?: boolean;
}): TutorSupportStrategy {
  const { masteryState, consecutiveIncorrect, hintsUsed, hasPrerequisiteRemediation } = params;

  if (hasPrerequisiteRemediation) {
    return "prerequisite_remediation";
  }

  // Strong mastery: Socratic prompting and light guidance
  if (masteryState && masteryState.currentMasteryLevel && masteryState.currentMasteryLevel >= 3 && consecutiveIncorrect === 0) {
    return "socratic";
  }

  // Multiple consecutive errors without prerequisite: step-by-step worked step
  if (consecutiveIncorrect >= 2) {
    return "worked_step";
  }

  // High hint usage: concept explanation
  if (hintsUsed >= 2) {
    return "concept_explanation";
  }

  // Default: targeted, scaffolding hint
  return "targeted_hint";
}

export interface ProcessTutorAttemptResult {
  updatedContext: TutorProblemContext;
  masteryUpdate?: MasteryUpdateResult;
  remediationDecision?: RemediationDecision;
  remediationUnit?: RemediationLearningUnit;
  returnContext?: TutorRemediationReturnContext;
  supportStrategy: TutorSupportStrategy;
}

/**
 * Processes a student homework step/answer attempt in Tutor.
 * Normalizes the attempt, updates Mastery v2, checks prerequisites, and decides next strategy.
 */
export function processTutorAttempt(params: {
  input: EvaluatedTutorAttemptInput;
  graph?: PrerequisiteGraph;
  masteryStateMap?: Map<string, ConceptMasteryState>;
  remediationContext?: RemediationContext;
  timestamp?: string;
}): ProcessTutorAttemptResult {
  const { input, graph, masteryStateMap, timestamp = new Date().toISOString() } = params;
  const ctx = input.problemContext;

  const newAttemptCount = ctx.attemptCount + 1;
  const newConsecutiveIncorrect = input.isCorrect ? 0 : ctx.consecutiveIncorrectCount + 1;
  const totalHintsUsed = input.hintsUsed !== undefined ? input.hintsUsed : ctx.hintsUsedCount;

  let masteryUpdate: MasteryUpdateResult | undefined;
  let remediationDecision: RemediationDecision | undefined;
  let remediationUnit: RemediationLearningUnit | undefined;
  let returnContext: TutorRemediationReturnContext | undefined;

  // Step 1: Mastery v2 processing if conceptId is present
  if (ctx.conceptId) {
    const normResult = normalizeTutorAttempt({
      studentId: ctx.studentId,
      subjectId: ctx.subjectId,
      conceptId: ctx.conceptId,
      objectiveId: ctx.objectiveId,
      taskMasteryLevel: ctx.detectedMasteryLevel ?? 2,
      correct: input.isCorrect,
      hintsUsed: totalHintsUsed,
      attemptNumber: newAttemptCount,
      responseTimeMs: input.responseTimeMs,
      difficulty: ctx.difficultyScore,
      stepId: input.stepId,
    });

    if (normResult.ok) {
      const prevMastery = masteryStateMap?.get(ctx.conceptId);
      masteryUpdate = processLearningAttempt(normResult.attempt, prevMastery, timestamp);
    }
  }

  // Step 2: Prerequisite check via RemediationService if repeated failure
  if (!input.isCorrect && ctx.conceptId && graph && masteryStateMap) {
    remediationDecision = evaluateRemediation({
      blockedConceptId: ctx.conceptId,
      subjectId: ctx.subjectId,
      graph,
      masteryStateMap,
      consecutiveIncorrectOnBlockedTask: newConsecutiveIncorrect,
      context: params.remediationContext,
    });

    if (remediationDecision.shouldRemediate && remediationDecision.targetConceptId) {
      const unit = createRemediationLearningUnit(
        remediationDecision,
        ctx.subjectId,
        `Renforcement ciblé du prérequis ${remediationDecision.targetConceptId}`
      );
      if (unit) {
        remediationUnit = unit;
      }

      returnContext = {
        conversationId: ctx.conversationId,
        problemId: ctx.problemId,
        conceptId: ctx.conceptId,
        attemptNumber: newAttemptCount,
        hintsUsedCount: totalHintsUsed,
        returnContextToken: `resume_${ctx.problemId}_${ctx.conceptId}`,
        originalPrompt: ctx.originalPrompt,
      };
    }
  }

  // Step 3: Determine appropriate tutoring strategy
  const currentConceptMastery = ctx.conceptId ? masteryStateMap?.get(ctx.conceptId) : undefined;
  const supportStrategy = determineTutorSupportStrategy({
    masteryState: currentConceptMastery,
    consecutiveIncorrect: newConsecutiveIncorrect,
    hintsUsed: totalHintsUsed,
    hasPrerequisiteRemediation: Boolean(remediationDecision?.shouldRemediate),
  });

  const updatedContext: TutorProblemContext = {
    ...ctx,
    attemptCount: newAttemptCount,
    consecutiveIncorrectCount: newConsecutiveIncorrect,
    hintsUsedCount: totalHintsUsed,
    status: remediationDecision?.shouldRemediate
      ? "remediating"
      : input.isCorrect
      ? "completed"
      : "in_progress",
    supportStrategy,
    updatedAt: timestamp,
  };

  return {
    updatedContext,
    masteryUpdate,
    remediationDecision,
    remediationUnit,
    returnContext,
    supportStrategy,
  };
}

/**
 * Resumes a TutorProblemContext after student completes or exits a remediation detour.
 * Ensures the original problem context is restored without falsely marking it solved.
 */
export function resumeTutorAfterRemediation(
  returnContext: TutorRemediationReturnContext,
  originalProblemContext: TutorProblemContext,
  timestamp: string = new Date().toISOString()
): TutorProblemContext {
  return {
    ...originalProblemContext,
    problemId: returnContext.problemId,
    conceptId: returnContext.conceptId,
    status: "resumed",
    supportStrategy: "targeted_hint",
    consecutiveIncorrectCount: 0, // Fresh attempt counter for post-remediation retry
    updatedAt: timestamp,
  };
}

/**
 * Generates age-adapted Tutor dialogue cues based on the pedagogical band and strategy.
 */
export function getTutorDialogueCue(
  strategy: TutorSupportStrategy,
  ageBand?: PedagogicalAgeBand
): string {
  const ageConfig = getAgeLearningConfig(ageBand);

  if (strategy === "prerequisite_remediation") {
    return ageConfig.band === "early_primary" || ageConfig.band === "upper_primary"
      ? "Avant de continuer, faisons un mini-défi de 3 minutes sur les bases !"
      : "Cette étape semble bloquée par un prérequis. Révisons-le rapidement avant de continuer.";
  }

  if (strategy === "socratic") {
    return ageConfig.band === "early_primary" || ageConfig.band === "upper_primary"
      ? "Très bien ! Que remarques-tu d’abord sur ce nombre ?"
      : "Quelle règle ou propriété peux-tu appliquer pour simplifier cette expression ?";
  }

  if (strategy === "concept_explanation") {
    return ageConfig.band === "early_primary" || ageConfig.band === "upper_primary"
      ? "Rappelons le principe en une image simple :"
      : "Rappel de la méthode théorique :";
  }

  if (strategy === "worked_step") {
    return "Faisons la première étape ensemble :";
  }

  return "Voici un indice pour avancer :";
}
