/**
 * Pure-function health evaluator for curriculum/admin tables.
 * Status reflects how well the row is "wired up" — i.e. whether
 * required FKs have been resolved during the import pipeline.
 */

export type RowStatus = 'ok' | 'partial' | 'issue' | 'unknown';

export interface RowHealth {
  status: RowStatus;
  issues: string[];   // hard problems → contributes to 'issue'
  warnings: string[]; // soft problems → contributes to 'partial'
  checks: { label: string; ok: boolean }[]; // for the drawer
}

export type AdminTable =
  | 'subjects'
  | 'domains'
  | 'subdomains'
  | 'objectives'
  | 'success_criteria'
  | 'tasks'
  | 'lessons'
  | 'topics'
  | 'videos';

const isPresent = (v: unknown) =>
  v !== null && v !== undefined && v !== '' &&
  !(Array.isArray(v) && v.length === 0);

function evalSubject(row: any): RowHealth {
  const checks = [
    { label: 'name present', ok: isPresent(row.name) },
    { label: 'slug present', ok: isPresent(row.slug) },
    { label: 'country_code present', ok: isPresent(row.country_code) },
  ];
  const issues = checks.filter(c => !c.ok && c.label !== 'country_code present').map(c => c.label);
  const warnings = !isPresent(row.country_code) ? ['country_code missing'] : [];
  return finalize(checks, issues, warnings);
}

function evalDomain(row: any): RowHealth {
  const checks = [
    { label: 'domain text present', ok: isPresent(row.domain) },
    { label: 'subject_id resolved', ok: isPresent(row.subject_id) },
    { label: 'label present', ok: isPresent(row.label) },
    { label: 'code present', ok: isPresent(row.code) },
  ];
  const issues = !isPresent(row.subject_id) ? ['subject_id is null'] : [];
  const warnings = [
    !isPresent(row.label) ? 'label missing' : null,
    !isPresent(row.code) ? 'code missing' : null,
  ].filter(Boolean) as string[];
  return finalize(checks, issues, warnings);
}

function evalSubdomain(row: any): RowHealth {
  const checks = [
    { label: 'subdomain text present', ok: isPresent(row.subdomain) },
    { label: 'subject_id resolved', ok: isPresent(row.subject_id) },
    { label: 'domain_id_new resolved', ok: isPresent(row.domain_id_new) },
    { label: 'label present', ok: isPresent(row.label) },
  ];
  const issues = [
    !isPresent(row.subject_id) ? 'subject_id is null' : null,
    !isPresent(row.domain_id_new) ? 'domain_id_new is null' : null,
  ].filter(Boolean) as string[];
  const warnings = !isPresent(row.label) ? ['label missing'] : [];
  return finalize(checks, issues, warnings);
}

function evalObjective(row: any): RowHealth {
  const hasSubdomainAnyKind = isPresent(row.subdomain_id_uuid) || isPresent(row.subdomain_id);
  const checks = [
    { label: 'text present', ok: isPresent(row.text) },
    { label: 'level present', ok: isPresent(row.level) },
    { label: 'subject_id_uuid resolved', ok: isPresent(row.subject_id_uuid) },
    { label: 'domain_id_uuid resolved', ok: isPresent(row.domain_id_uuid) },
    { label: 'subdomain_id_uuid resolved', ok: isPresent(row.subdomain_id_uuid) },
    { label: 'keywords present', ok: isPresent(row.keywords) },
  ];
  const issues = [
    !isPresent(row.text) ? 'text is null' : null,
    !isPresent(row.level) ? 'level is null' : null,
    !hasSubdomainAnyKind ? 'no subdomain link (uuid or text)' : null,
  ].filter(Boolean) as string[];
  const warnings = [
    !isPresent(row.subject_id_uuid) ? 'subject_id_uuid unresolved' : null,
    !isPresent(row.domain_id_uuid) ? 'domain_id_uuid unresolved' : null,
    !isPresent(row.subdomain_id_uuid) && isPresent(row.subdomain_id) ? 'subdomain_id_uuid unresolved' : null,
    !isPresent(row.keywords) ? 'keywords missing' : null,
  ].filter(Boolean) as string[];
  return finalize(checks, issues, warnings);
}

function evalSuccessCriterion(row: any): RowHealth {
  const hasObjective = isPresent(row.objective_id_uuid) || isPresent(row.objective_id);
  const checks = [
    { label: 'text present', ok: isPresent(row.text) },
    { label: 'objective link present', ok: hasObjective },
    { label: 'objective_id_uuid resolved', ok: isPresent(row.objective_id_uuid) },
    { label: 'subject_id_uuid resolved', ok: isPresent(row.subject_id_uuid) },
    { label: 'subdomain_id_uuid resolved', ok: isPresent(row.subdomain_id_uuid) },
  ];
  const issues = [
    !isPresent(row.text) ? 'text is null' : null,
    !hasObjective ? 'no objective link' : null,
  ].filter(Boolean) as string[];
  const warnings = [
    !isPresent(row.objective_id_uuid) && isPresent(row.objective_id) ? 'objective_id_uuid unresolved' : null,
    !isPresent(row.subject_id_uuid) ? 'subject_id_uuid unresolved' : null,
    !isPresent(row.subdomain_id_uuid) ? 'subdomain_id_uuid unresolved' : null,
  ].filter(Boolean) as string[];
  return finalize(checks, issues, warnings);
}

function evalTask(row: any): RowHealth {
  const hasCriterion = isPresent(row.success_criterion_id_uuid) || isPresent(row.success_criterion_id);
  const checks = [
    { label: 'stem present', ok: isPresent(row.stem) },
    { label: 'type present', ok: isPresent(row.type) },
    { label: 'success_criterion link present', ok: hasCriterion },
    { label: 'success_criterion_id_uuid resolved', ok: isPresent(row.success_criterion_id_uuid) },
    { label: 'subject_id_uuid resolved', ok: isPresent(row.subject_id_uuid) },
  ];
  const issues = [
    !isPresent(row.stem) ? 'stem is null' : null,
    !isPresent(row.type) ? 'type is null' : null,
    !hasCriterion ? 'no success_criterion link' : null,
  ].filter(Boolean) as string[];
  const warnings = [
    !isPresent(row.success_criterion_id_uuid) && isPresent(row.success_criterion_id) ? 'success_criterion_id_uuid unresolved' : null,
    !isPresent(row.subject_id_uuid) ? 'subject_id_uuid unresolved' : null,
  ].filter(Boolean) as string[];
  return finalize(checks, issues, warnings);
}

function evalLesson(row: any): RowHealth {
  const objIds = Array.isArray(row.objective_ids) ? row.objective_ids : [];
  const hasObjective = objIds.length > 0 || isPresent(row.topic_id);
  const checks = [
    { label: 'title present', ok: isPresent(row.title) },
    { label: 'topic_id present', ok: isPresent(row.topic_id) },
    { label: 'objective_ids present', ok: objIds.length > 0 },
    { label: 'success_criterion_ids present', ok: Array.isArray(row.success_criterion_ids) && row.success_criterion_ids.length > 0 },
  ];
  const issues = [
    !isPresent(row.title) ? 'title is null' : null,
    !hasObjective ? 'no topic_id and no objective_ids' : null,
  ].filter(Boolean) as string[];
  const warnings = [
    !isPresent(row.topic_id) ? 'topic_id missing' : null,
    objIds.length === 0 ? 'objective_ids empty' : null,
  ].filter(Boolean) as string[];
  return finalize(checks, issues, warnings);
}

function evalTopic(row: any): RowHealth {
  const checks = [
    { label: 'name present', ok: isPresent(row.name) },
    { label: 'slug present', ok: isPresent(row.slug) },
    { label: 'category_id present', ok: isPresent(row.category_id) },
  ];
  const issues = !isPresent(row.name) ? ['name is null'] : [];
  const warnings = [
    !isPresent(row.category_id) ? 'category_id missing' : null,
    !isPresent(row.curriculum_subject_id_uuid) ? 'curriculum_subject_id_uuid unresolved' : null,
  ].filter(Boolean) as string[];
  return finalize(checks, issues, warnings);
}

function evalVideo(row: any): RowHealth {
  const checks = [
    { label: 'title present', ok: isPresent(row.title) },
    { label: 'topic_id present', ok: isPresent(row.topic_id) },
  ];
  const issues = [
    !isPresent(row.title) ? 'title is null' : null,
  ].filter(Boolean) as string[];
  const warnings = !isPresent(row.topic_id) ? ['topic_id missing'] : [];
  return finalize(checks, issues, warnings);
}

function finalize(
  checks: { label: string; ok: boolean }[],
  issues: string[],
  warnings: string[],
): RowHealth {
  let status: RowStatus = 'ok';
  if (issues.length > 0) status = 'issue';
  else if (warnings.length > 0) status = 'partial';
  return { status, issues, warnings, checks };
}

export function evaluateRow(table: AdminTable, row: any): RowHealth {
  if (!row) return { status: 'unknown', issues: [], warnings: [], checks: [] };
  switch (table) {
    case 'subjects': return evalSubject(row);
    case 'domains': return evalDomain(row);
    case 'subdomains': return evalSubdomain(row);
    case 'objectives': return evalObjective(row);
    case 'success_criteria': return evalSuccessCriterion(row);
    case 'tasks': return evalTask(row);
    case 'lessons': return evalLesson(row);
    case 'topics': return evalTopic(row);
    case 'videos': return evalVideo(row);
    default: return { status: 'unknown', issues: [], warnings: [], checks: [] };
  }
}

export const STATUS_LABEL: Record<RowStatus, string> = {
  ok: 'OK',
  partial: 'Partial',
  issue: 'Issue',
  unknown: 'Unknown',
};
