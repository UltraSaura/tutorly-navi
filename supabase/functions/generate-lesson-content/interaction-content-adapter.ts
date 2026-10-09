import type { BlueprintAnswerType, InteractionSlot } from './lesson-blueprint.ts';
import { fillSlot, type FillResult, type LessonAssemblyDraft, type StructuralSlot } from './lesson-assembly.ts';

export type InteractionBlockType = 'guided_example' | 'prediction' | 'student_try' | 'feedback_checkpoint';

export type GeneratedInteractionContent = Record<string, unknown>;
export type InteractionAdapterError = { field: string; code: string; message: string };
export type InteractionAdapterResult =
  | { ok: true; blockType: InteractionBlockType; content: GeneratedInteractionContent }
  | { ok: false; blockType: InteractionBlockType; errors: InteractionAdapterError[] };

export type InteractionAdapterSlot = Pick<StructuralSlot, 'slotId' | 'blockType' | 'answerTypes'> | Pick<InteractionSlot, 'slotId' | 'type' | 'answerTypes'>;

export type InteractionAdapterMetrics = {
  interaction_slots_total: number;
  guided_example_valid: number;
  prediction_valid: number;
  student_try_valid: number;
  feedback_checkpoint_valid: number;
  interaction_content_rejected: number;
  answer_type_errors: number;
  unsupported_quantity_answers: number;
  structural_mutation_rejections: number;
};

const ANSWER_TYPES = new Set<BlueprintAnswerType>(['multiple_choice', 'numeric', 'time', 'short_text', 'selection', 'ordering']);
const STRUCTURAL_FIELDS = new Set([
  'slotId', 'id', 'type', 'blockType', 'objectiveIds', 'objective_ids', 'level', 'levelNumber', 'level_number',
  'sequence', 'sequenceOrder', 'ordering', 'mandatory', 'requirement', 'pedagogicalRole', 'role', 'curriculumScope',
  'visualPolicy', 'visualRequirement', 'allowedVisualKinds', 'prerequisites', 'prerequisite', 'prerequisiteSlots',
  'mastery', 'masterySlot', 'answerTypes', 'objectiveId', 'objective_id',
]);
const PLACEHOLDER = /^(?:todo|tbd|placeholder|lorem ipsum|n\/a|na)$/i;
const RAW_JSON = /```|^[\[{]|(?:^|\s)[{"'](?:slotId|objectiveIds|level|sequence|mandatory|visualPolicy)\s*:/i;
const UNIT_TOKEN = /(?:\b(?:ms|millisecondes?|s|sec|seconde?s?|min|minute?s?|h|heure?s?|j|jour?s?|semaine?s?|mois|annee?s?|si[eè]cle?s?|mill[eé]naire?s?|kg|g|cm|m|mm|km)\b|\d\s*[/:]\s*\d\s*(?:h|min|s))/i;
const DURATION_PROMPT = /\b(?:convert(?:is|ir)?|conversion|combien\s+(?:de|font)|dur[ée]e|unit[ée]s?\s+de\s+dur[ée]e)\b/i;

const error = (field: string, code: string, message: string): InteractionAdapterError => ({ field, code, message });
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const nonEmpty = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const text = (value: unknown): string => String(value).trim();
const normalized = (value: unknown): string => text(value).toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');

function textErrors(field: string, value: unknown): InteractionAdapterError[] {
  if (!nonEmpty(value)) return [error(field, 'required', 'Expected a non-empty string.')];
  const valueText = text(value);
  if (PLACEHOLDER.test(valueText)) return [error(field, 'placeholder', 'Placeholder content is not accepted.')];
  if (RAW_JSON.test(valueText)) return [error(field, 'raw_json', 'Raw JSON/Markdown content is not accepted.')];
  return [];
}

function blockType(slot: InteractionAdapterSlot): InteractionBlockType {
  return ((('blockType' in slot ? slot.blockType : undefined) ?? ('type' in slot ? slot.type : undefined)) as InteractionBlockType);
}

function commonObjectErrors(raw: Record<string, unknown>, allowedFields: Set<string>): InteractionAdapterError[] {
  const errors: InteractionAdapterError[] = [];
  Object.keys(raw).forEach((field) => {
    if (STRUCTURAL_FIELDS.has(field)) errors.push(error(field, 'structural_mutation', 'Blueprint-owned structural fields cannot be supplied by the content provider.'));
    else if (!allowedFields.has(field)) errors.push(error(field, 'unexpected_field', 'Field is not part of this interaction contract.'));
  });
  return errors;
}

function stringArrayErrors(field: string, value: unknown, min = 0, max = Infinity): InteractionAdapterError[] {
  if (!Array.isArray(value) || value.length < min || value.length > max || value.some((item) => !nonEmpty(item) || PLACEHOLDER.test(text(item)) || RAW_JSON.test(text(item)))) {
    return [error(field, 'invalid_array', `Expected ${min}–${max === Infinity ? 'many' : max} meaningful strings.`)];
  }
  return [];
}

function choicesErrors(choices: unknown, field = 'choices', requireChoices = true): InteractionAdapterError[] {
  if (choices === undefined && !requireChoices) return [];
  if (!Array.isArray(choices) || choices.length < 2 || choices.some((choice) => !nonEmpty(choice))) return [error(field, 'choices_required', 'Expected at least two non-empty choices.')];
  const seen = new Set<string>();
  const errors: InteractionAdapterError[] = [];
  choices.forEach((choice, index) => {
    const key = normalized(choice);
    if (seen.has(key)) errors.push(error(`${field}[${index}]`, 'duplicate_choice', 'Choices must be distinct after normalization.'));
    seen.add(key);
  });
  return errors;
}

function timeOfDay(value: unknown): boolean {
  return /^\s*\d{1,2}\s*(?:h|heures?)\s*\d{1,2}\s*(?:min|minutes?)?\s*$/i.test(String(value)) || /^\s*\d{1,2}:\d{2}\s*$/.test(String(value));
}

function plainNumeric(value: unknown): boolean {
  return (typeof value === 'number' && Number.isFinite(value)) || (typeof value === 'string' && /^[-+]?\d+(?:[.,]\d+)?$/.test(value.trim()));
}

function quantityRequired(question: unknown, answer: unknown): boolean {
  if (object(answer) && ('unit' in answer || 'value' in answer)) return true;
  const questionText = typeof question === 'string' ? question : '';
  const durationQuestion = DURATION_PROMPT.test(questionText) && UNIT_TOKEN.test(questionText);
  // `08 h 45` is a valid time-of-day answer. It becomes a quantity only
  // when the question explicitly asks for a duration or conversion.
  if (timeOfDay(answer) && !durationQuestion && /(?:quelle heure|à quelle heure|heure indique)/i.test(questionText)) return false;
  if (typeof answer === 'string' && UNIT_TOKEN.test(answer)) return true;
  return durationQuestion;
}

function answerErrors(slot: InteractionAdapterSlot, raw: Record<string, unknown>): InteractionAdapterError[] {
  const errors: InteractionAdapterError[] = [];
  const type = String(raw.answer_type ?? '') as BlueprintAnswerType;
  const allowed = slot.answerTypes ?? [];
  if (!ANSWER_TYPES.has(type) || (allowed.length > 0 && !allowed.includes(type))) {
    errors.push(error('answer_type', 'answer_type_mismatch', `Answer type must be one of: ${allowed.join(', ')}.`));
    return errors;
  }
  const answer = raw.correct_answer;
  if (answer === undefined || answer === null || (typeof answer === 'string' && !nonEmpty(answer))) errors.push(error('correct_answer', 'required', 'A correct answer is required.'));
  if (quantityRequired(raw.question, answer) && (type === 'numeric' || type === 'time')) {
    errors.push(error('correct_answer', 'UNSUPPORTED_QUANTITY_ANSWER', 'Unit-bearing quantities require a typed value plus unit; numeric/time cannot represent them safely.'));
    return errors;
  }
  if (type === 'numeric' && !plainNumeric(answer)) errors.push(error('correct_answer', 'numeric_format', 'Numeric answers must be plain numbers without units.'));
  if (type === 'time' && !timeOfDay(answer)) errors.push(error('correct_answer', 'time_of_day_format', 'Time answers must represent time of day, such as 14 h 30 or 14:30.'));
  if (['multiple_choice', 'selection'].includes(type)) {
    errors.push(...choicesErrors(raw.choices));
    if (Array.isArray(raw.choices) && !raw.choices.some((choice) => normalized(choice) === normalized(answer))) errors.push(error('correct_answer', 'choice_membership', 'The correct answer must be one of the choices.'));
  }
  if (type === 'ordering') {
    errors.push(...choicesErrors(raw.choices));
    if (!Array.isArray(answer) || !Array.isArray(raw.choices) || answer.length !== raw.choices.length || new Set(answer.map(normalized)).size !== answer.length || !answer.every((item) => raw.choices!.map(normalized).includes(normalized(item)))) errors.push(error('correct_answer', 'ordering_format', 'Ordering answers must be a complete permutation of the choices.'));
  }
  if (type === 'short_text' && !nonEmpty(answer)) errors.push(error('correct_answer', 'text_format', 'Short-text answers require non-empty text.'));
  if (raw.choices !== undefined && !Array.isArray(raw.choices)) errors.push(error('choices', 'invalid_type', 'choices must be an array when supplied.'));
  if (Array.isArray(raw.choices) && raw.choices.some((choice) => !nonEmpty(choice))) errors.push(error('choices', 'invalid_choice', 'Choices must be non-empty strings.'));
  return errors;
}

function normalizeTextFields(raw: Record<string, unknown>, fields: string[]): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  fields.forEach((field) => { if (raw[field] !== undefined) output[field] = text(raw[field]); });
  if (Array.isArray(raw.choices)) output.choices = raw.choices.map(text);
  if (Array.isArray(raw.hints)) output.hints = raw.hints.map(text);
  if (raw.correct_answer !== undefined) output.correct_answer = Array.isArray(raw.correct_answer) ? raw.correct_answer.map(text) : raw.correct_answer;
  return output;
}

export function adaptInteractionContent(slot: InteractionAdapterSlot, raw: unknown): InteractionAdapterResult {
  const type = blockType(slot);
  if (!['guided_example', 'prediction', 'student_try', 'feedback_checkpoint'].includes(type)) return { ok: false, blockType: type, errors: [error('type', 'unsupported_slot', 'Unsupported interaction slot family.')] };
  if (!object(raw)) return { ok: false, blockType: type, errors: [error('', 'invalid_input', 'Interaction content must be an object.')] };
  const allowed = type === 'guided_example'
    ? new Set(['context', 'steps'])
    : type === 'prediction'
      ? new Set(['question', 'choices', 'correct_answer', 'explanation', 'hints'])
      : new Set(['question', 'answer_type', 'choices', 'correct_answer', 'hints', 'success_feedback', 'error_feedback']);
  const errors = commonObjectErrors(raw, allowed);
  if (type === 'guided_example') {
    errors.push(...textErrors('context', raw.context));
    if (!Array.isArray(raw.steps) || raw.steps.length < 1 || raw.steps.length > 8) errors.push(error('steps', 'invalid_steps', 'steps must contain 1–8 items.'));
    else raw.steps.forEach((step, index) => {
      if (!object(step)) return errors.push(error(`steps[${index}]`, 'invalid_step', 'Each step must be an object.'));
      errors.push(...textErrors(`steps[${index}].instruction`, step.instruction), ...textErrors(`steps[${index}].reason`, step.reason));
      if (step.representation !== undefined) errors.push(...textErrors(`steps[${index}].representation`, step.representation));
      Object.keys(step).filter((field) => !['instruction', 'reason', 'representation'].includes(field)).forEach((field) => errors.push(error(`steps[${index}].${field}`, 'unexpected_field', 'Step field is not part of the guided-example contract.')));
    });
    if (errors.length) return { ok: false, blockType: type, errors };
    return { ok: true, blockType: type, content: { context: text(raw.context), steps: (raw.steps as Record<string, unknown>[]).map((step) => ({ instruction: text(step.instruction), reason: text(step.reason), ...(step.representation !== undefined ? { representation: text(step.representation) } : {}) })) } };
  }
  errors.push(...textErrors('question', raw.question));
  if (type === 'prediction') {
    errors.push(...choicesErrors(raw.choices), ...textErrors('explanation', raw.explanation));
    if (Array.isArray(raw.choices) && !raw.choices.some((choice) => normalized(choice) === normalized(raw.correct_answer))) errors.push(error('correct_answer', 'choice_membership', 'The correct answer must be one of the choices.'));
  } else {
    errors.push(...answerErrors(slot, raw), ...textErrors('success_feedback', raw.success_feedback), ...textErrors('error_feedback', raw.error_feedback));
    if (raw.hints !== undefined) errors.push(...stringArrayErrors('hints', raw.hints, 0));
  }
  if (type === 'prediction' && raw.hints !== undefined) errors.push(...stringArrayErrors('hints', raw.hints, 0));
  if (errors.length) return { ok: false, blockType: type, errors };
  const fields = type === 'prediction' ? ['question', 'explanation'] : ['question', 'answer_type', 'success_feedback', 'error_feedback'];
  return { ok: true, blockType: type, content: { ...normalizeTextFields(raw, fields), ...(Array.isArray(raw.choices) ? { choices: raw.choices.map(text) } : {}), ...(raw.correct_answer !== undefined ? { correct_answer: Array.isArray(raw.correct_answer) ? raw.correct_answer.map(text) : raw.correct_answer } : {}), ...(Array.isArray(raw.hints) ? { hints: raw.hints.map(text) } : {}) } };
}

export function fillInteractionSlot(draft: LessonAssemblyDraft, slotId: string, raw: unknown): FillResult {
  const slot = draft.levels.flatMap((level) => level.slots).find((candidate) => candidate.slotId === slotId);
  if (!slot || slot.kind !== 'interaction') return { success: false, issues: [{ path: slotId, message: 'Slot is not an interaction slot' }], draft };
  const adapted = adaptInteractionContent(slot, raw);
  if (!adapted.ok) return { success: false, issues: adapted.errors.map((entry) => ({ path: `${slotId}.${entry.field}`.replace(/\.$/, ''), message: entry.message })), draft };
  return fillSlot(draft, slotId, adapted.content);
}

export function interactionAdapterMetrics(results: InteractionAdapterResult[], slots: InteractionAdapterSlot[]): InteractionAdapterMetrics {
  const rejected = results.filter((result) => !result.ok);
  return {
    interaction_slots_total: slots.length,
    guided_example_valid: results.filter((result) => result.ok && result.blockType === 'guided_example').length,
    prediction_valid: results.filter((result) => result.ok && result.blockType === 'prediction').length,
    student_try_valid: results.filter((result) => result.ok && result.blockType === 'student_try').length,
    feedback_checkpoint_valid: results.filter((result) => result.ok && result.blockType === 'feedback_checkpoint').length,
    interaction_content_rejected: rejected.length,
    answer_type_errors: rejected.reduce((count, result) => count + result.errors.filter((entry) => ['answer_type', 'correct_answer', 'choices'].some((prefix) => entry.field.startsWith(prefix))).length, 0),
    unsupported_quantity_answers: rejected.reduce((count, result) => count + result.errors.filter((entry) => entry.code === 'UNSUPPORTED_QUANTITY_ANSWER').length, 0),
    structural_mutation_rejections: rejected.reduce((count, result) => count + result.errors.filter((entry) => entry.code === 'structural_mutation').length, 0),
  };
}
