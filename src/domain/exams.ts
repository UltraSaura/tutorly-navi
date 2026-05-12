export const EXAM_LEVEL_MAP = {
  dnb: "3eme",
  bac: "terminale",
  bac_francais: "1ere",
  cap: "cap",
} as const;

export const EXAM_SCHOOL_CYCLE_MAP = {
  dnb: "cycle_4",
} as const;

export type ExamSlug = keyof typeof EXAM_LEVEL_MAP;
export type ExamLevel = (typeof EXAM_LEVEL_MAP)[ExamSlug];

export function levelForExam(exam: string | null | undefined): string | null {
  if (!exam) return null;
  return EXAM_LEVEL_MAP[exam as ExamSlug] ?? null;
}

export function schoolCycleForExam(exam: string | null | undefined): string | null {
  if (!exam) return null;
  return EXAM_SCHOOL_CYCLE_MAP[exam as keyof typeof EXAM_SCHOOL_CYCLE_MAP] ?? null;
}

export function normalizeStudentLevelForExamFilter(level: string | null | undefined): string | null {
  if (!level) return null;
  const normalized = level
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[:_\s-]+/g, "")
    .replace(/ème/g, "eme");

  if (normalized === "3e" || normalized === "3eme" || normalized === "troisieme" || normalized === "fr3eme" || /(?:^|college|fr)3e(?:me)?$/.test(normalized)) {
    return "3eme";
  }
  if (normalized === "4e" || normalized === "4eme" || normalized === "quatrieme" || normalized === "fr4eme" || /(?:^|college|fr)4e(?:me)?$/.test(normalized)) {
    return "4eme";
  }
  if (normalized === "term" || normalized === "terminale" || normalized === "frterm") {
    return "terminale";
  }
  if (normalized === "1ere" || normalized === "premiere" || normalized === "fr1ere") {
    return "1ere";
  }
  return level.trim().toLowerCase().replace(/\s+/g, "_");
}
