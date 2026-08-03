export type ImportMode = "upsert" | "replace";
export type SourceName = "eduscol" | "ac-amiens-maths";
export type ExamSeries = "generale" | "professionnelle" | null;
export type ExamVariant =
  | "standard"
  | "arial16"
  | "arial20"
  | "arial24"
  | "braille_integral"
  | "braille_abrege";
export type ParsingStatus = "parsed" | "partial" | "failed";

export interface BundleSource {
  id: string;
  source_name: SourceName;
  source_url: string;
  fetched_at: string;
}

export interface BundlePaper {
  id: string;
  source_name: SourceName;
  source_url: string;
  fetched_at: string;
  exam: string;
  level?: string | null;
  school_cycle?: string | null;
  session_year: number;
  discipline: string;
  series: ExamSeries;
  location: string;
  variant: ExamVariant;
  title?: string;
  pdf_url: string;
  pdf_hash: string;
  raw_text?: string;
  exercises?: string[];
  parsing_status: ParsingStatus;
}

export interface BundleExercise {
  id: string;
  paper_id: string;
  source_name: SourceName;
  source_url: string;
  fetched_at: string;
  exam: string;
  session_year: number;
  discipline: string;
  series: ExamSeries;
  location: string;
  variant: ExamVariant;
  pdf_url: string;
  pdf_hash: string;
  exercise_number: number | null;
  title: string | null;
  raw_text?: string;
  parsing_status: ParsingStatus;
  parsed_content?: unknown;
  parsing_confidence?: string | null;
}

export interface BundleProgramLink {
  exercise_id: string;
  program_entry_id: string;
  program_entry_type: "objective" | "success_criterion" | "topic" | "unknown";
  confidence: number;
  rationale: string;
}

export interface BundleExamAsset {
  exercise_id: string;
  paper_id: string;
  type: string;
  label: string;
  storage_path: string;
  public_url?: string | null;
  alt?: string | null;
  page_number?: number | null;
  sort_order?: number;
}

export interface ExamBundle {
  mode?: ImportMode;
  sources?: BundleSource[];
  papers?: BundlePaper[];
  exercises?: BundleExercise[];
  exam_assets?: BundleExamAsset[];
  exercise_program_links?: BundleProgramLink[];
}

type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string };

const SOURCE_NAMES = new Set<SourceName>(["eduscol", "ac-amiens-maths"]);
const SERIES = new Set<ExamSeries>(["generale", "professionnelle", null]);
const VARIANTS = new Set<ExamVariant>([
  "standard",
  "arial16",
  "arial20",
  "arial24",
  "braille_integral",
  "braille_abrege",
]);
const PARSING_STATUSES = new Set<ParsingStatus>(["parsed", "partial", "failed"]);
const PROGRAM_ENTRY_TYPES = new Set<BundleProgramLink["program_entry_type"]>([
  "objective",
  "success_criterion",
  "topic",
  "unknown",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown, maxLength = 20_000): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}

function isOptionalString(value: unknown, maxLength = 20_000): value is string | null | undefined {
  return value === undefined || value === null || typeof value === "string" && value.length <= maxLength;
}

function isIsoDateString(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function isUrlString(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 4_000) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isStringArray(value: unknown, maxItems = 1_000): value is string[] {
  return Array.isArray(value) &&
    value.length <= maxItems &&
    value.every((item) => typeof item === "string" && item.length <= 2_000);
}

function hasValidMode(value: unknown): value is ImportMode | undefined {
  return value === undefined || value === "upsert" || value === "replace";
}

function validateSource(source: unknown): source is BundleSource {
  return isRecord(source) &&
    isNonEmptyString(source.id, 200) &&
    SOURCE_NAMES.has(source.source_name as SourceName) &&
    isUrlString(source.source_url) &&
    isIsoDateString(source.fetched_at);
}

function validatePaper(paper: unknown): paper is BundlePaper {
  return isRecord(paper) &&
    isNonEmptyString(paper.id, 200) &&
    SOURCE_NAMES.has(paper.source_name as SourceName) &&
    isUrlString(paper.source_url) &&
    isIsoDateString(paper.fetched_at) &&
    isNonEmptyString(paper.exam, 100) &&
    (paper.level === undefined || paper.level === null || typeof paper.level === "string") &&
    (paper.school_cycle === undefined || paper.school_cycle === null || typeof paper.school_cycle === "string") &&
    typeof paper.session_year === "number" &&
    Number.isInteger(paper.session_year) &&
    paper.session_year >= 2000 &&
    paper.session_year <= 2100 &&
    isNonEmptyString(paper.discipline, 200) &&
    SERIES.has(paper.series as ExamSeries) &&
    isNonEmptyString(paper.location, 100) &&
    VARIANTS.has(paper.variant as ExamVariant) &&
    isOptionalString(paper.title, 500) &&
    isUrlString(paper.pdf_url) &&
    isNonEmptyString(paper.pdf_hash, 256) &&
    isOptionalString(paper.raw_text, 2_000_000) &&
    (paper.exercises === undefined || isStringArray(paper.exercises, 10_000)) &&
    PARSING_STATUSES.has(paper.parsing_status as ParsingStatus);
}

function validateExercise(exercise: unknown): exercise is BundleExercise {
  return isRecord(exercise) &&
    isNonEmptyString(exercise.id, 200) &&
    isNonEmptyString(exercise.paper_id, 200) &&
    SOURCE_NAMES.has(exercise.source_name as SourceName) &&
    isUrlString(exercise.source_url) &&
    isIsoDateString(exercise.fetched_at) &&
    isNonEmptyString(exercise.exam, 100) &&
    typeof exercise.session_year === "number" &&
    Number.isInteger(exercise.session_year) &&
    exercise.session_year >= 2000 &&
    exercise.session_year <= 2100 &&
    isNonEmptyString(exercise.discipline, 200) &&
    SERIES.has(exercise.series as ExamSeries) &&
    isNonEmptyString(exercise.location, 100) &&
    VARIANTS.has(exercise.variant as ExamVariant) &&
    isUrlString(exercise.pdf_url) &&
    isNonEmptyString(exercise.pdf_hash, 256) &&
    (exercise.exercise_number === null ||
      typeof exercise.exercise_number === "number" &&
      Number.isInteger(exercise.exercise_number) &&
      exercise.exercise_number >= 0 &&
      exercise.exercise_number <= 10_000) &&
    (exercise.title === null || isNonEmptyString(exercise.title, 500)) &&
    isOptionalString(exercise.raw_text, 2_000_000) &&
    PARSING_STATUSES.has(exercise.parsing_status as ParsingStatus) &&
    isOptionalString(exercise.parsing_confidence, 100);
}

function validateAsset(asset: unknown): asset is BundleExamAsset {
  return isRecord(asset) &&
    isNonEmptyString(asset.exercise_id, 200) &&
    isNonEmptyString(asset.paper_id, 200) &&
    isNonEmptyString(asset.type, 100) &&
    isNonEmptyString(asset.label, 500) &&
    isNonEmptyString(asset.storage_path, 1_000) &&
    (asset.public_url === undefined || asset.public_url === null || isUrlString(asset.public_url)) &&
    isOptionalString(asset.alt, 500) &&
    (asset.page_number === undefined || asset.page_number === null ||
      typeof asset.page_number === "number" && Number.isInteger(asset.page_number) && asset.page_number >= 1 && asset.page_number <= 10_000) &&
    (asset.sort_order === undefined || typeof asset.sort_order === "number" && Number.isInteger(asset.sort_order) && asset.sort_order >= 0 && asset.sort_order <= 1_000_000);
}

function validateProgramLink(link: unknown): link is BundleProgramLink {
  return isRecord(link) &&
    isNonEmptyString(link.exercise_id, 200) &&
    isNonEmptyString(link.program_entry_id, 200) &&
    PROGRAM_ENTRY_TYPES.has(link.program_entry_type as BundleProgramLink["program_entry_type"]) &&
    typeof link.confidence === "number" &&
    Number.isFinite(link.confidence) &&
    link.confidence >= 0 &&
    link.confidence <= 1 &&
    isNonEmptyString(link.rationale, 5_000);
}

function isArrayWithinLimit(value: unknown, limit: number): value is unknown[] {
  return Array.isArray(value) && value.length <= limit;
}

export function validateExamBundle(value: unknown): ValidationResult<ExamBundle> {
  if (!isRecord(value)) {
    return { ok: false, status: 400, error: "Invalid bundle payload" };
  }

  if (!hasValidMode(value.mode)) {
    return { ok: false, status: 400, error: "Invalid import mode" };
  }

  if (value.sources !== undefined) {
    if (!isArrayWithinLimit(value.sources, 5_000) || !value.sources.every(validateSource)) {
      return { ok: false, status: 400, error: "Invalid sources payload" };
    }
  }

  if (value.papers !== undefined) {
    if (!isArrayWithinLimit(value.papers, 10_000) || !value.papers.every(validatePaper)) {
      return { ok: false, status: 400, error: "Invalid papers payload" };
    }
  }

  if (value.exercises !== undefined) {
    if (!isArrayWithinLimit(value.exercises, 50_000) || !value.exercises.every(validateExercise)) {
      return { ok: false, status: 400, error: "Invalid exercises payload" };
    }
  }

  if (value.exam_assets !== undefined) {
    if (!isArrayWithinLimit(value.exam_assets, 50_000) || !value.exam_assets.every(validateAsset)) {
      return { ok: false, status: 400, error: "Invalid exam assets payload" };
    }
  }

  if (value.exercise_program_links !== undefined) {
    if (!isArrayWithinLimit(value.exercise_program_links, 100_000) || !value.exercise_program_links.every(validateProgramLink)) {
      return { ok: false, status: 400, error: "Invalid exercise program links payload" };
    }
  }

  return { ok: true, data: value as ExamBundle };
}
