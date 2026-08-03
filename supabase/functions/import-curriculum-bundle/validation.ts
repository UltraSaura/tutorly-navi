export interface BundleSubject {
  id: string;
  slug: string;
  name: string;
  language?: string;
  color_scheme?: string;
  icon_name?: string;
}

export interface BundleDomain {
  id: string;
  subject_id: string;
  code: string;
  label: string;
  domain?: string;
}

export interface BundleSubdomain {
  id: string;
  subject_id: string;
  domain_id: string;
  code: string;
  label: string;
  domain?: string;
  subdomain?: string;
}

export interface BundleObjective {
  id: string;
  subject_id: string;
  domain_id: string;
  subdomain_id: string;
  level: string;
  text: string;
  notes_from_prog?: string;
  keywords?: string[];
  legacy_id?: string;
  domain?: string;
  subdomain?: string;
}

export interface BundleSuccessCriterion {
  id: string;
  objective_id: string;
  subject_id?: string;
  domain_id?: string;
  subdomain_id?: string;
  text: string;
  legacy_id?: string;
}

export interface BundleTask {
  id: string;
  success_criterion_id: string;
  subject_id?: string;
  domain_id?: string;
  subdomain_id?: string;
  type: string;
  stem: string;
  solution?: string;
  rubric?: string;
  difficulty?: string;
  tags?: string[];
  source?: string;
  legacy_id?: string;
}

export interface BundleTopicLink {
  id?: string;
  topic_id: string;
  objective_id: string;
  order_index?: number;
}

export interface BundleLesson {
  id: string;
  topic_id?: string;
  title: string;
  objective_ids?: unknown[];
  success_criterion_ids?: unknown[];
  materials?: string;
  misconceptions?: string;
  teacher_talk?: string;
  student_worksheet?: string;
  legacy_id?: string;
}

export interface BundleData {
  mode?: "replace" | "upsert";
  subjects?: BundleSubject[];
  domains?: BundleDomain[];
  subdomains?: BundleSubdomain[];
  objectives?: BundleObjective[];
  success_criteria?: BundleSuccessCriterion[];
  tasks?: BundleTask[];
  topic_objective_links?: BundleTopicLink[];
  lessons?: BundleLesson[];
}

type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown, maxLength = 20_000): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}

function isOptionalString(value: unknown, maxLength = 20_000): value is string | undefined {
  return value === undefined || typeof value === "string" && value.length <= maxLength;
}

function isOptionalStringArray(value: unknown, maxItems = 1_000): value is string[] | undefined {
  return value === undefined || Array.isArray(value) &&
    value.length <= maxItems &&
    value.every((item) => typeof item === "string" && item.length <= 2_000);
}

function isOptionalUnknownArray(value: unknown, maxItems = 1_000): value is unknown[] | undefined {
  return value === undefined || Array.isArray(value) && value.length <= maxItems;
}

function isValidMode(value: unknown): value is "replace" | "upsert" | undefined {
  return value === undefined || value === "replace" || value === "upsert";
}

function isArrayWithinLimit(value: unknown, limit: number): value is unknown[] {
  return Array.isArray(value) && value.length <= limit;
}

function validateSubject(subject: unknown): subject is BundleSubject {
  return isRecord(subject) &&
    isNonEmptyString(subject.id, 200) &&
    isNonEmptyString(subject.slug, 200) &&
    isNonEmptyString(subject.name, 500) &&
    isOptionalString(subject.language, 20) &&
    isOptionalString(subject.color_scheme, 100) &&
    isOptionalString(subject.icon_name, 100);
}

function validateDomain(domain: unknown): domain is BundleDomain {
  return isRecord(domain) &&
    isNonEmptyString(domain.id, 200) &&
    isNonEmptyString(domain.subject_id, 200) &&
    isNonEmptyString(domain.code, 100) &&
    isNonEmptyString(domain.label, 500) &&
    isOptionalString(domain.domain, 500);
}

function validateSubdomain(subdomain: unknown): subdomain is BundleSubdomain {
  return isRecord(subdomain) &&
    isNonEmptyString(subdomain.id, 200) &&
    isNonEmptyString(subdomain.subject_id, 200) &&
    isNonEmptyString(subdomain.domain_id, 200) &&
    isNonEmptyString(subdomain.code, 100) &&
    isNonEmptyString(subdomain.label, 500) &&
    isOptionalString(subdomain.domain, 500) &&
    isOptionalString(subdomain.subdomain, 500);
}

function validateObjective(objective: unknown): objective is BundleObjective {
  return isRecord(objective) &&
    isNonEmptyString(objective.id, 200) &&
    isNonEmptyString(objective.subject_id, 200) &&
    isNonEmptyString(objective.domain_id, 200) &&
    isNonEmptyString(objective.subdomain_id, 200) &&
    isNonEmptyString(objective.level, 100) &&
    isNonEmptyString(objective.text, 20_000) &&
    isOptionalString(objective.notes_from_prog, 20_000) &&
    isOptionalStringArray(objective.keywords, 500) &&
    isOptionalString(objective.legacy_id, 200) &&
    isOptionalString(objective.domain, 500) &&
    isOptionalString(objective.subdomain, 500);
}

function validateSuccessCriterion(successCriterion: unknown): successCriterion is BundleSuccessCriterion {
  return isRecord(successCriterion) &&
    isNonEmptyString(successCriterion.id, 200) &&
    isNonEmptyString(successCriterion.objective_id, 200) &&
    isOptionalString(successCriterion.subject_id, 200) &&
    isOptionalString(successCriterion.domain_id, 200) &&
    isOptionalString(successCriterion.subdomain_id, 200) &&
    isNonEmptyString(successCriterion.text, 20_000) &&
    isOptionalString(successCriterion.legacy_id, 200);
}

function validateTask(task: unknown): task is BundleTask {
  return isRecord(task) &&
    isNonEmptyString(task.id, 200) &&
    isNonEmptyString(task.success_criterion_id, 200) &&
    isOptionalString(task.subject_id, 200) &&
    isOptionalString(task.domain_id, 200) &&
    isOptionalString(task.subdomain_id, 200) &&
    isNonEmptyString(task.type, 100) &&
    isNonEmptyString(task.stem, 50_000) &&
    isOptionalString(task.solution, 50_000) &&
    isOptionalString(task.rubric, 20_000) &&
    isOptionalString(task.difficulty, 100) &&
    isOptionalStringArray(task.tags, 500) &&
    isOptionalString(task.source, 200) &&
    isOptionalString(task.legacy_id, 200);
}

function validateTopicLink(link: unknown): link is BundleTopicLink {
  return isRecord(link) &&
    isOptionalString(link.id, 200) &&
    isNonEmptyString(link.topic_id, 200) &&
    isNonEmptyString(link.objective_id, 200) &&
    (link.order_index === undefined || typeof link.order_index === "number" && Number.isInteger(link.order_index));
}

function validateLesson(lesson: unknown): lesson is BundleLesson {
  return isRecord(lesson) &&
    isNonEmptyString(lesson.id, 200) &&
    isOptionalString(lesson.topic_id, 200) &&
    isNonEmptyString(lesson.title, 500) &&
    isOptionalUnknownArray(lesson.objective_ids, 2_000) &&
    isOptionalUnknownArray(lesson.success_criterion_ids, 2_000) &&
    isOptionalString(lesson.materials, 50_000) &&
    isOptionalString(lesson.misconceptions, 50_000) &&
    isOptionalString(lesson.teacher_talk, 50_000) &&
    isOptionalString(lesson.student_worksheet, 50_000) &&
    isOptionalString(lesson.legacy_id, 200);
}

export function validateCurriculumBundle(value: unknown): ValidationResult<BundleData> {
  if (!isRecord(value)) {
    return { ok: false, status: 400, error: "Invalid bundle payload" };
  }

  if (!isValidMode(value.mode)) {
    return { ok: false, status: 400, error: "Invalid import mode" };
  }

  if (value.subjects !== undefined) {
    if (!isArrayWithinLimit(value.subjects, 5_000) || !value.subjects.every(validateSubject)) {
      return { ok: false, status: 400, error: "Invalid subjects payload" };
    }
  }

  if (value.domains !== undefined) {
    if (!isArrayWithinLimit(value.domains, 10_000) || !value.domains.every(validateDomain)) {
      return { ok: false, status: 400, error: "Invalid domains payload" };
    }
  }

  if (value.subdomains !== undefined) {
    if (!isArrayWithinLimit(value.subdomains, 20_000) || !value.subdomains.every(validateSubdomain)) {
      return { ok: false, status: 400, error: "Invalid subdomains payload" };
    }
  }

  if (value.objectives !== undefined) {
    if (!isArrayWithinLimit(value.objectives, 50_000) || !value.objectives.every(validateObjective)) {
      return { ok: false, status: 400, error: "Invalid objectives payload" };
    }
  }

  if (value.success_criteria !== undefined) {
    if (!isArrayWithinLimit(value.success_criteria, 100_000) || !value.success_criteria.every(validateSuccessCriterion)) {
      return { ok: false, status: 400, error: "Invalid success criteria payload" };
    }
  }

  if (value.tasks !== undefined) {
    if (!isArrayWithinLimit(value.tasks, 100_000) || !value.tasks.every(validateTask)) {
      return { ok: false, status: 400, error: "Invalid tasks payload" };
    }
  }

  if (value.topic_objective_links !== undefined) {
    if (!isArrayWithinLimit(value.topic_objective_links, 50_000) || !value.topic_objective_links.every(validateTopicLink)) {
      return { ok: false, status: 400, error: "Invalid topic objective links payload" };
    }
  }

  if (value.lessons !== undefined) {
    if (!isArrayWithinLimit(value.lessons, 20_000) || !value.lessons.every(validateLesson)) {
      return { ok: false, status: 400, error: "Invalid lessons payload" };
    }
  }

  return { ok: true, data: value as BundleData };
}
