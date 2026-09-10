/**
 * Cross-Subject Skill Activity Domain Model for Tutorly Skills Lab
 *
 * Defines reusable activity engine types that power interactive practice
 * across Mathematics, Français, Sciences, Histoire, Géographie, and Anglais.
 */

import type { PedagogicalAgeBand } from "@/config/ageConfig";
import type { MasteryLevel } from "./mastery-level";

export type SkillActivityEngine =
  | "fact_sprint"
  | "match_pairs"
  | "sort_classify"
  | "sequence"
  | "timeline"
  | "diagram_label"
  | "number_line"
  | "build"
  | "simulation"
  | "error_detective"
  | "sentence_builder"
  | "mental_chain"
  | "missing_number";

export interface SkillActivityDefinition {
  id: string;

  subjectId: string;
  conceptId: string;
  objectiveId?: string;

  engine: SkillActivityEngine;

  ageBand: PedagogicalAgeBand;

  masteryLevels: Array<MasteryLevel>;

  difficulty: number;

  estimatedMinutes?: number;

  configuration: Record<string, unknown>;
}
