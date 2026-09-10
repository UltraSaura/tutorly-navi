/**
 * Pure Remediation Decision Engine for Tutorly
 *
 * Evaluates student performance evidence against the prerequisite graph to decide
 * whether, when, and how to trigger prerequisite remediation.
 *
 * Implements strict rules from TUTORLY_FINAL_PRODUCT_AND_ADAPTIVE_ARCHITECTURE.md:
 * - Conservative triggering: single mistakes do NOT divert the student
 * - Max automatic remediation depth = 1 (direct prerequisite only)
 * - Loop prevention: visited and cooldown concepts are excluded
 * - Preserves target concept, remediation concept, and return-to-task context
 */

import type { ConceptId, RemediationLearningUnit } from "@/types/learning-unit";
import type { ConceptMasteryState } from "@/types/mastery-v2";
import type {
  RemediationDecision,
  RemediationContext,
} from "@/types/prerequisite";
import { PrerequisiteGraph } from "./prerequisiteService";

export const MAX_AUTOMATIC_REMEDIATION_DEPTH = 1;
export const WEAK_MASTERY_SCORE_THRESHOLD = 50;
export const MIN_CONSECUTIVE_FAILURES_FOR_REMEDIATION = 2;

export interface EvaluateRemediationParams {
  blockedConceptId: ConceptId;
  subjectId: string;
  graph: PrerequisiteGraph;
  masteryStateMap: Map<ConceptId, ConceptMasteryState>;
  consecutiveIncorrectOnBlockedTask: number;
  context?: RemediationContext;
}

/**
 * Evaluates whether a student struggling on blockedConceptId should be routed to remediation.
 */
export function evaluateRemediation(
  params: EvaluateRemediationParams
): RemediationDecision {
  const {
    blockedConceptId,
    graph,
    masteryStateMap,
    consecutiveIncorrectOnBlockedTask,
    context = { depth: 0, visitedConceptIds: [] },
  } = params;

  const currentDepth = context.depth || 0;
  const visitedSet = new Set(context.visitedConceptIds || []);
  const cooldownSet = new Set(
    context.cooldownConceptIds
      ? Array.from(context.cooldownConceptIds)
      : context.recentlyRemediatedConceptIds || []
  );

  // Guard 1: Max automatic depth reached
  if (currentDepth >= MAX_AUTOMATIC_REMEDIATION_DEPTH) {
    return {
      shouldRemediate: false,
      blockedConceptId,
      returnToConceptId: blockedConceptId,
      reason: "max_depth_reached",
      depth: currentDepth,
    };
  }

  // Guard 2: Single mistake should not immediately divert student
  if (consecutiveIncorrectOnBlockedTask < MIN_CONSECUTIVE_FAILURES_FOR_REMEDIATION) {
    return {
      shouldRemediate: false,
      blockedConceptId,
      returnToConceptId: blockedConceptId,
      reason: "no_remediation_needed",
      depth: currentDepth,
    };
  }

  // Step 3: Fetch direct prerequisites for the blocked concept
  const directPrereqs = graph.getDirectPrerequisites(blockedConceptId);
  if (directPrereqs.length === 0) {
    return {
      shouldRemediate: false,
      blockedConceptId,
      returnToConceptId: blockedConceptId,
      reason: "no_prerequisites_found",
      depth: currentDepth,
    };
  }

  // Step 4: Evaluate prerequisite mastery states
  for (const prereqId of directPrereqs) {
    // Loop prevention: skip already visited or cooldown concepts
    if (visitedSet.has(prereqId)) {
      continue;
    }
    if (cooldownSet.has(prereqId)) {
      continue;
    }

    const state = masteryStateMap.get(prereqId);

    // Case A: Unassessed prerequisite
    if (!state || state.status === "unassessed" || state.currentMasteryLevel === undefined) {
      return {
        shouldRemediate: true,
        targetConceptId: prereqId,
        blockedConceptId,
        returnToConceptId: blockedConceptId,
        reason: "unassessed_prerequisite",
        depth: currentDepth + 1,
        explanationText: `Le prérequis (${prereqId}) n’a pas encore été validé.`,
        evidence: {
          currentMasteryLevel: undefined,
          currentScore: 0,
          confidence: 0,
          consecutiveIncorrect: consecutiveIncorrectOnBlockedTask,
        },
      };
    }

    // Case B: Weak prerequisite (score < threshold or level < Level 2)
    const isWeak =
      state.currentScore < WEAK_MASTERY_SCORE_THRESHOLD ||
      (state.currentMasteryLevel && state.currentMasteryLevel < 2) ||
      (state.consecutiveIncorrect >= 2);

    if (isWeak) {
      return {
        shouldRemediate: true,
        targetConceptId: prereqId,
        blockedConceptId,
        returnToConceptId: blockedConceptId,
        reason: "weak_prerequisite",
        depth: currentDepth + 1,
        explanationText: `Difficulté diagnostiquée sur le prérequis (${prereqId}).`,
        evidence: {
          currentMasteryLevel: state.currentMasteryLevel,
          currentScore: state.currentScore,
          confidence: state.confidence,
          consecutiveIncorrect: state.consecutiveIncorrect,
        },
      };
    }
  }

  // All prerequisites are either strong or in cooldown/visited
  return {
    shouldRemediate: false,
    blockedConceptId,
    returnToConceptId: blockedConceptId,
    reason: directPrereqs.some((p) => cooldownSet.has(p) || visitedSet.has(p))
      ? "cooldown_active"
      : "no_remediation_needed",
    depth: currentDepth,
  };
}

/**
 * Factory helper: Transforms a valid RemediationDecision into a typed RemediationLearningUnit
 * ready for rendering in LearningSessionPlayer (Phase 3).
 */
export function createRemediationLearningUnit(
  decision: RemediationDecision,
  subjectId: string,
  remediationActionContent: string = "Rappel du concept prérequis"
): RemediationLearningUnit | null {
  if (!decision.shouldRemediate || !decision.targetConceptId) {
    return null;
  }

  return {
    id: `rem_unit_${decision.targetConceptId}_${Date.now()}`,
    type: "remediation",
    subjectId,
    conceptId: decision.blockedConceptId,
    masteryLevel: 2,
    payload: {
      targetProblemContext: `Blocage sur ${decision.blockedConceptId}`,
      diagnosedGap: {
        prerequisiteConceptId: decision.targetConceptId,
        prerequisiteName: decision.targetConceptName || decision.targetConceptId,
        reason: decision.explanationText || "Renforcement du prérequis nécessaire",
      },
      remediationAction: {
        type: "mini_explanation",
        content: remediationActionContent,
      },
      returnContextToken: `resume_${decision.returnToConceptId}`,
    },
  };
}
