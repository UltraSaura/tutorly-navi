/**
 * Canonical Prerequisite & Remediation Domain Contracts for Tutorly
 *
 * Implements directed prerequisite edges and remediation decision structures
 * defined in TUTORLY_FINAL_PRODUCT_AND_ADAPTIVE_ARCHITECTURE.md.
 */

import type { ConceptId } from "./learning-unit";
import type { MasteryLevel } from "./mastery-level";

export type PrerequisiteRelationshipType = "required" | "recommended" | "remedial";

export interface PrerequisiteRelationship {
  id?: string;
  subjectId: string;
  prerequisiteConceptId: ConceptId;
  targetConceptId: ConceptId;
  relationshipType: PrerequisiteRelationshipType;
  strength?: number;
  objectiveId?: string;
}

export interface PrerequisiteGraphNode {
  conceptId: ConceptId;
  directPrerequisites: ConceptId[];
}

export type RemediationDecisionReason =
  | "weak_prerequisite"
  | "unassessed_prerequisite"
  | "repeated_failure"
  | "no_remediation_needed"
  | "cooldown_active"
  | "max_depth_reached"
  | "no_prerequisites_found";

export interface RemediationDecision {
  shouldRemediate: boolean;
  targetConceptId?: ConceptId;
  targetConceptName?: string;
  blockedConceptId: ConceptId;
  reason: RemediationDecisionReason;
  depth: number;
  returnToConceptId: ConceptId;
  explanationText?: string;
  evidence?: {
    currentMasteryLevel?: MasteryLevel;
    currentScore?: number;
    confidence?: number;
    consecutiveIncorrect?: number;
  };
}

export interface RemediationContext {
  depth: number;
  visitedConceptIds: ConceptId[];
  recentlyRemediatedConceptIds?: ConceptId[];
  cooldownConceptIds?: Set<ConceptId> | ConceptId[];
}
