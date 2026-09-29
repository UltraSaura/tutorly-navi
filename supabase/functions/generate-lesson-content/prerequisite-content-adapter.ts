import { isSupportedVisualKind } from './visual-policy.ts';
import type { BlueprintAnswerType, PrerequisiteSlot } from './lesson-blueprint.ts';
import type { StructuralSlot } from './lesson-assembly.ts';

export type PrerequisiteSlotContent = {
  description: string;
  check_question: string;
  answer_type: BlueprintAnswerType;
  choices?: string[];
  expected_answer: string | number | string[];
  remediation_hint: string;
  visual?: { kind: string; purpose?: string; alt_text?: string; data: unknown };
};

export type PrerequisiteAdapterSlot = Pick<StructuralSlot, 'slotId' | 'priorSkill' | 'source' | 'diagnosticSkillStatus' | 'forbiddenTargetObjectiveIds' | 'answerTypes'> | (Pick<PrerequisiteSlot, 'slotId' | 'priorSkill' | 'source' | 'forbiddenTargetObjectiveIds' | 'allowedAnswerTypes'> & { diagnosticSkillStatus?: 'resolved' | 'generic' | 'missing' });
export type PrerequisiteAdapterError = { field: string; code: string; message: string };
export type PrerequisiteAdapterResult = { ok: true; content: PrerequisiteSlotContent; diagnosticSkillStatus: 'resolved' | 'generic' | 'missing' } | { ok: false; errors: PrerequisiteAdapterError[]; diagnosticSkillStatus: 'resolved' | 'generic' | 'missing' };

export type PrerequisiteAdapterMetrics = {
  prerequisite_slots_total: number;
  prerequisite_slots_resolved: number;
  prerequisite_slots_generic: number;
  prerequisite_slots_missing_skill: number;
  prerequisite_content_valid: number;
  prerequisite_content_rejected: number;
  prerequisite_answer_errors: number;
};

const structuralFields = new Set(['slotId', 'id', 'type', 'objectiveIds', 'objective_ids', 'mustPrecedeObjectiveIds', 'forbiddenTargetObjectiveIds', 'priorSkill', 'source', 'diagnosticSkill', 'diagnosticSkillStatus', 'level', 'levelNumber', 'level_number', 'sequence', 'ordering', 'mastery', 'visualRequirement', 'allowedVisualKinds']);
const answerTypes = new Set(['multiple_choice', 'numeric', 'time', 'short_text', 'selection', 'ordering']);
const placeholder = /^(?:todo|tbd|placeholder|lorem ipsum|n\/a|na)$/i;
const rawJson = /```|^[\[{]|(?:"(?:objectiveIds|forbiddenTargetObjectiveIds|diagnosticSkill)"\s*:)/i;
const nonEmpty = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown): string => String(value).trim();
const error = (field: string, code: string, message: string): PrerequisiteAdapterError => ({ field, code, message });
function skillStatus(slot: PrerequisiteAdapterSlot): 'resolved' | 'generic' | 'missing' {
  return slot.diagnosticSkillStatus ?? (slot.source === 'previous-level-objectives' ? 'generic' : slot.source === 'unresolved-curriculum-metadata' ? 'missing' : ('priorSkill' in slot && slot.priorSkill ? 'resolved' : 'missing'));
}

function textErrors(field: string, value: unknown): PrerequisiteAdapterError[] {
  if (!nonEmpty(value)) return [error(field, 'required', 'Expected a non-empty string.')];
  const valueText = text(value);
  if (placeholder.test(valueText)) return [error(field, 'placeholder', 'Placeholder content is not accepted.')];
  if (rawJson.test(valueText)) return [error(field, 'raw_json', 'Raw JSON/Markdown content is not accepted.')];
  return [];
}

function timeValue(value: unknown): boolean {
  return /^\s*\d{1,2}\s*(?:h|heures?)\s*\d{1,2}\s*(?:min|minutes?)?\.?\s*$/i.test(String(value)) || /^\s*\d{1,2}\s*(?:h|heures?)\s*$/i.test(String(value)) || /^\s*\d{1,2}:\d{2}\s*$/.test(String(value));
}

function numericValue(value: unknown): boolean {
  return (typeof value === 'number' && Number.isFinite(value)) || /^[-+]?\d+(?:[.,]\d+)?$/.test(String(value).trim());
}

function answerErrors(slot: PrerequisiteAdapterSlot, raw: Record<string, unknown>): PrerequisiteAdapterError[] {
  const errors: PrerequisiteAdapterError[] = [];
  const allowed = 'answerTypes' in slot && slot.answerTypes ? slot.answerTypes : 'allowedAnswerTypes' in slot ? slot.allowedAnswerTypes : [];
  const answerType = String(raw.answer_type ?? '');
  if (!answerTypes.has(answerType) || !allowed.includes(answerType as BlueprintAnswerType)) errors.push(error('answer_type', 'answer_type_mismatch', `Answer type must be one of: ${allowed.join(', ')}.`));
  const expected = raw.expected_answer;
  if (expected === undefined || (typeof expected === 'string' && !nonEmpty(expected))) errors.push(error('expected_answer', 'required', 'A prerequisite expected answer is required.'));
  if (answerType === 'numeric') {
    if (!numericValue(expected)) errors.push(error('expected_answer', 'numeric_format', 'Numeric prerequisites require a numeric answer without a unit.'));
    if (typeof expected === 'string' && /\b(?:s|sec|seconde|secondes|min|minute|minutes|h|heure|heures|j|jour|jours)\b/i.test(expected)) errors.push(error('expected_answer', 'unit_ambiguity', 'Unit-bearing quantities are not safely represented by the numeric prerequisite contract.'));
  }
  if (answerType === 'time' && !timeValue(expected)) errors.push(error('expected_answer', 'time_format', 'Time prerequisites require a time of day such as 14 h 30 or 14:30.'));
  if (['multiple_choice', 'selection'].includes(answerType)) {
    if (!Array.isArray(raw.choices) || raw.choices.length < 2 || raw.choices.some((choice) => !nonEmpty(choice))) errors.push(error('choices', 'choices_required', 'Choice prerequisites require at least two non-empty options.'));
    else if (!raw.choices.some((choice) => text(choice).toLocaleLowerCase('fr') === text(expected).toLocaleLowerCase('fr'))) errors.push(error('expected_answer', 'choice_membership', 'The expected answer must be one of the choices.'));
  }
  if (answerType === 'ordering') {
    if (!Array.isArray(raw.choices) || raw.choices.length < 2 || raw.choices.some((choice) => !nonEmpty(choice))) errors.push(error('choices', 'choices_required', 'Ordering prerequisites require at least two options.'));
    if (!Array.isArray(expected) || expected.length !== raw.choices?.length || new Set(expected.map(String)).size !== expected.length || !expected.every((value) => raw.choices?.map(String).includes(String(value)))) errors.push(error('expected_answer', 'ordering_format', 'Ordering expected_answer must be a complete permutation of the choices.'));
  }
  if (answerType === 'short_text' && !nonEmpty(expected)) errors.push(error('expected_answer', 'text_format', 'Short-text prerequisites require a non-empty text answer.'));
  const question = text(raw.check_question).toLocaleLowerCase('fr');
  if (/(?:convert|conversion|combien|durée|secondes?|minutes?|heures?)/i.test(question) && !/(?:quelle heure|à quelle heure|heure indique)/i.test(question)) errors.push(error('check_question', 'target_objective_risk', 'This question appears to test duration/unit content rather than prior knowledge.'));
  if (answerType === 'time' && /(?:combien|convert|conversion|durée|secondes?|minutes?)/i.test(question)) errors.push(error('answer_type', 'time_quantity_conflict', 'Time-of-day answers cannot represent a quantity with units.'));
  return errors;
}

function visualErrors(raw: Record<string, unknown>): PrerequisiteAdapterError[] {
  if (raw.visual === undefined) return [];
  if (!object(raw.visual)) return [error('visual', 'invalid_type', 'Expected a visual object.')];
  const visual = raw.visual;
  const errors: PrerequisiteAdapterError[] = [];
  if (!isSupportedVisualKind(visual.kind)) errors.push(error('visual.kind', 'unsupported_visual_kind', `Unsupported visual kind: ${String(visual.kind)}.`));
  if (!object(visual.data) || Object.keys(visual.data).length === 0) errors.push(error('visual.data', 'malformed_visual_data', 'Visual data must be non-empty structured data.'));
  return errors;
}

export function adaptPrerequisiteContent(slot: PrerequisiteAdapterSlot, raw: unknown): PrerequisiteAdapterResult {
  const status = skillStatus(slot);
  if (!object(raw)) return { ok: false, errors: [error('', 'invalid_input', 'Prerequisite content must be an object.')], diagnosticSkillStatus: status };
  const errors: PrerequisiteAdapterError[] = [];
  Object.keys(raw).forEach((field) => { if (structuralFields.has(field)) errors.push(error(field, 'structural_field', 'Blueprint-owned prerequisite fields cannot be supplied by the content provider.')); });
  for (const field of ['description', 'check_question', 'remediation_hint']) errors.push(...textErrors(field, raw[field]));
  errors.push(...answerErrors(slot, raw), ...visualErrors(raw));
  if (errors.length) return { ok: false, errors, diagnosticSkillStatus: status };
  const content: PrerequisiteSlotContent = {
    description: text(raw.description), check_question: text(raw.check_question), answer_type: raw.answer_type as BlueprintAnswerType,
    ...(Array.isArray(raw.choices) ? { choices: raw.choices.map(text) } : {}), expected_answer: Array.isArray(raw.expected_answer) ? raw.expected_answer.map(text) : (typeof raw.expected_answer === 'string' ? text(raw.expected_answer) : raw.expected_answer as number), remediation_hint: text(raw.remediation_hint),
    ...(object(raw.visual) ? { visual: { kind: text(raw.visual.kind), ...(raw.visual.purpose !== undefined ? { purpose: text(raw.visual.purpose) } : {}), ...(raw.visual.alt_text !== undefined ? { alt_text: text(raw.visual.alt_text) } : {}), data: raw.visual.data } } : {}),
  };
  return { ok: true, content, diagnosticSkillStatus: status };
}

export function prerequisiteAdapterMetrics(results: PrerequisiteAdapterResult[], slots: PrerequisiteAdapterSlot[]): PrerequisiteAdapterMetrics {
  return {
    prerequisite_slots_total: results.length,
    prerequisite_slots_resolved: slots.filter((slot) => skillStatus(slot) === 'resolved').length,
    prerequisite_slots_generic: slots.filter((slot) => skillStatus(slot) === 'generic').length,
    prerequisite_slots_missing_skill: slots.filter((slot) => skillStatus(slot) === 'missing').length,
    prerequisite_content_valid: results.filter((result) => result.ok).length,
    prerequisite_content_rejected: results.filter((result) => !result.ok).length,
    prerequisite_answer_errors: results.reduce((total, result) => result.ok ? total : total + result.errors.filter((entry) => ['answer_type', 'expected_answer', 'choices', 'check_question'].some((prefix) => entry.field.startsWith(prefix))).length, 0),
  };
}
