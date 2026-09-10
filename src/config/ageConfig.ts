/**
 * Canonical Pedagogical Age Configuration System for Tutorly
 *
 * Provides a centralized, subject-independent specification of pedagogical bands
 * and age-appropriate learning parameters (scaffolding, visual support, timer pressure,
 * manipulative priority, interaction style, explanation density, and practice labels).
 *
 * Implements the 4 pedagogical bands defined in TUTORLY_FINAL_PRODUCT_AND_ADAPTIVE_ARCHITECTURE.md:
 * - Early Primary (CP / CE1 — approx 6–8)
 * - Upper Primary (CE2 / CM1 / CM2 — approx 8–11)
 * - Middle School (6e / 5e / 4e / 3e — approx 11–15)
 * - High School (2nde / 1re / Terminale — approx 15–18)
 */

import { normalizeSchoolLevel } from "@/domain/schoolLevels";

export type PedagogicalAgeBand =
  | "early_primary"
  | "upper_primary"
  | "middle_school"
  | "high_school";

export interface AgeLearningConfig {
  band: PedagogicalAgeBand;
  practiceLabel: string;
  practiceLabelKey: string;
  approximateAgeRange: [number, number];
  instructionComplexity: "very_simple" | "simple" | "standard" | "advanced";
  visualSupport: "very_high" | "high" | "medium" | "low";
  scaffoldLevel: "very_high" | "high" | "medium" | "low";
  interactionStyle: "playful" | "challenge" | "training" | "academic";
  timerPressure: "none" | "low" | "normal";
  manipulativePriority: "very_high" | "high" | "medium" | "optional";
  explanationDensity: "very_short" | "short" | "standard" | "concise";
  preferredActivityDurationMinutes: {
    min: number;
    max: number;
  };
  showMascot: boolean;
  celebration: "big" | "medium" | "subtle";
  // Visual presentation metrics (for UI renderers)
  visualSize: number;
  titleSize: number;
  bodySize: number;
  exampleCount: number;
}

export const PEDAGOGICAL_AGE_CONFIGS: Record<PedagogicalAgeBand, AgeLearningConfig> = {
  early_primary: {
    band: "early_primary",
    practiceLabel: "Jeux",
    practiceLabelKey: "pedagogy.practiceLabel.early_primary",
    approximateAgeRange: [6, 8],
    instructionComplexity: "very_simple",
    visualSupport: "very_high",
    scaffoldLevel: "very_high",
    interactionStyle: "playful",
    timerPressure: "none",
    manipulativePriority: "very_high",
    explanationDensity: "very_short",
    preferredActivityDurationMinutes: {
      min: 2,
      max: 5,
    },
    showMascot: true,
    celebration: "big",
    visualSize: 110,
    titleSize: 20,
    bodySize: 16,
    exampleCount: 2,
  },
  upper_primary: {
    band: "upper_primary",
    practiceLabel: "Défis",
    practiceLabelKey: "pedagogy.practiceLabel.upper_primary",
    approximateAgeRange: [8, 11],
    instructionComplexity: "simple",
    visualSupport: "high",
    scaffoldLevel: "high",
    interactionStyle: "challenge",
    timerPressure: "low",
    manipulativePriority: "high",
    explanationDensity: "short",
    preferredActivityDurationMinutes: {
      min: 3,
      max: 8,
    },
    showMascot: false,
    celebration: "medium",
    visualSize: 95,
    titleSize: 17,
    bodySize: 14,
    exampleCount: 3,
  },
  middle_school: {
    band: "middle_school",
    practiceLabel: "Entraînement",
    practiceLabelKey: "pedagogy.practiceLabel.middle_school",
    approximateAgeRange: [11, 15],
    instructionComplexity: "standard",
    visualSupport: "medium",
    scaffoldLevel: "medium",
    interactionStyle: "training",
    timerPressure: "normal",
    manipulativePriority: "medium",
    explanationDensity: "standard",
    preferredActivityDurationMinutes: {
      min: 5,
      max: 12,
    },
    showMascot: false,
    celebration: "subtle",
    visualSize: 82,
    titleSize: 15,
    bodySize: 13,
    exampleCount: 3,
  },
  high_school: {
    band: "high_school",
    practiceLabel: "S'entraîner",
    practiceLabelKey: "pedagogy.practiceLabel.high_school",
    approximateAgeRange: [15, 18],
    instructionComplexity: "advanced",
    visualSupport: "low",
    scaffoldLevel: "low",
    interactionStyle: "academic",
    timerPressure: "normal",
    manipulativePriority: "optional",
    explanationDensity: "concise",
    preferredActivityDurationMinutes: {
      min: 8,
      max: 20,
    },
    showMascot: false,
    celebration: "subtle",
    visualSize: 75,
    titleSize: 15,
    bodySize: 13,
    exampleCount: 3,
  },
};

const EARLY_PRIMARY_LEVELS = new Set(["cp", "ce1"]);
const UPPER_PRIMARY_LEVELS = new Set(["ce2", "cm1", "cm2"]);
const MIDDLE_SCHOOL_LEVELS = new Set(["6eme", "5eme", "4eme", "3eme"]);
const HIGH_SCHOOL_LEVELS = new Set(["2nde", "1ere", "terminale"]);

/**
 * Maps a curriculum level code (French or international) to a canonical PedagogicalAgeBand.
 * Handles normalization, aliases, country prefixes, and casing safely.
 *
 * Default fallback: 'upper_primary' (CM1 equivalent, the primary target age of the application).
 */
export function getPedagogicalAgeBand(levelCode?: string | null): PedagogicalAgeBand {
  if (!levelCode || typeof levelCode !== "string") {
    return "upper_primary";
  }

  // Strip possible country prefix (e.g. "fr:cm1" -> "cm1")
  const rawCode = levelCode.includes(":") ? levelCode.split(":")[1] : levelCode;
  const normalized = normalizeSchoolLevel(rawCode);

  if (normalized && EARLY_PRIMARY_LEVELS.has(normalized)) return "early_primary";
  if (normalized && UPPER_PRIMARY_LEVELS.has(normalized)) return "upper_primary";
  if (normalized && MIDDLE_SCHOOL_LEVELS.has(normalized)) return "middle_school";
  if (normalized && HIGH_SCHOOL_LEVELS.has(normalized)) return "high_school";

  // Check aliases on cleaned string for international or non-standard formats
  const clean = rawCode.toLowerCase().trim().replace(/[\s_-]+/g, "");
  if (clean === "cp" || clean === "ce1" || clean === "k" || clean === "grade1" || clean === "grade2" || clean === "year1" || clean === "year2") {
    return "early_primary";
  }
  if (clean === "ce2" || clean === "cm1" || clean === "cm2" || clean === "grade3" || clean === "grade4" || clean === "grade5" || clean === "year3" || clean === "year4" || clean === "year5" || clean === "year6") {
    return "upper_primary";
  }
  if (clean.startsWith("6") || clean.startsWith("5") || clean.startsWith("4") || clean.startsWith("3") || clean === "grade6" || clean === "grade7" || clean === "grade8" || clean === "grade9") {
    return "middle_school";
  }
  if (clean.startsWith("2") || clean.startsWith("1") || clean.includes("term") || clean === "grade10" || clean === "grade11" || clean === "grade12" || clean === "seconde" || clean === "premiere" || clean === "terminale") {
    return "high_school";
  }

  return "upper_primary";
}

/**
 * Central API: Returns the strongly-typed AgeLearningConfig for a given student level code.
 */
export function getAgeLearningConfig(levelCode?: string | null): AgeLearningConfig {
  const band = getPedagogicalAgeBand(levelCode);
  return PEDAGOGICAL_AGE_CONFIGS[band];
}

/**
 * Helper to determine if student belongs to the under-11 demographic
 * (Early Primary or Upper Primary). Preserves legacy behavior.
 */
export function isPedagogicalUnder11(levelCode?: string | null): boolean {
  const band = getPedagogicalAgeBand(levelCode);
  return band === "early_primary" || band === "upper_primary";
}
