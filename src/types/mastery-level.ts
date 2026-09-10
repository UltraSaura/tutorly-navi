/**
 * Canonical 4-Level Mastery Model for Tutorly
 *
 * Implements the 4 mastery levels defined in TUTORLY_FINAL_PRODUCT_AND_ADAPTIVE_ARCHITECTURE.md:
 * 1. Understand — mental model, core explanation, visual intuition, simple check
 * 2. Guided Application — worked example, guided steps, scaffolding, structured hints
 * 3. Independent Application — standard exercises, mixed practice, minimal hints
 * 4. Transfer — word problems, error analysis, unfamiliar situations, reasoning
 */

export type MasteryLevel = 1 | 2 | 3 | 4;

export type MasteryLevelName =
  | "understand"
  | "guided_application"
  | "independent_application"
  | "transfer";

export const MASTERY_LEVEL_LABELS: Record<MasteryLevel, MasteryLevelName> = {
  1: "understand",
  2: "guided_application",
  3: "independent_application",
  4: "transfer",
} as const;

export const MASTERY_LEVEL_NAMES_FR: Record<MasteryLevel, string> = {
  1: "Comprendre",
  2: "Application guidée",
  3: "Application autonome",
  4: "Transfert",
} as const;

export const MASTERY_LEVEL_NAMES_EN: Record<MasteryLevel, string> = {
  1: "Understand",
  2: "Guided Application",
  3: "Independent Application",
  4: "Transfer",
} as const;
