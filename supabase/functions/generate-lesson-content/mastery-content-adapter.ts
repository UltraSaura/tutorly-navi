import type { BlueprintAnswerType, MasterySlot } from './lesson-blueprint.ts';
import { fillSlot, type FillResult, type LessonAssemblyDraft, type StructuralSlot } from './lesson-assembly.ts';

export type MasteryAdapterSlot = Pick<StructuralSlot, 'slotId' | 'kind' | 'objectiveIds' | 'questionCount' | 'answerTypes'> | Pick<MasterySlot, 'slotId' | 'objectiveIds' | 'questionCount' | 'allowedAnswerTypes'>;
export type MasteryQuestionContent = {
  id: string;
  question: string;
  answer_type: BlueprintAnswerType;
  choices?: string[];
  correct_answer: string | number | string[];
  skill: string;
  difficulty: string | number;
  success_feedback: string;
  error_feedback: string;
};
export type MasterySlotContent = { questions: MasteryQuestionContent[] };
export type MasteryAdapterError = { field: string; code: string; message: string };
export type MasteryAdapterResult =
  | { ok: true; content: MasterySlotContent }
  | { ok: false; errors: MasteryAdapterError[] };

export type MasteryAdapterMetrics = {
  mastery_slots_total: number;
  mastery_content_valid: number;
  mastery_content_rejected: number;
  mastery_question_count_errors: number;
  mastery_answer_type_errors: number;
  unsupported_quantity_answers: number;
  duplicate_question_errors: number;
  answer_leakage_errors: number;
  structural_mutation_rejections: number;
};

const ANSWER_TYPES = new Set<BlueprintAnswerType>(['multiple_choice', 'numeric', 'time', 'short_text', 'selection', 'ordering']);
const STRUCTURAL_FIELDS = new Set([
  'slotId', 'id', 'type', 'blockType', 'objectiveIds', 'objective_ids', 'level', 'levelNumber', 'level_number',
  'sequence', 'sequenceOrder', 'ordering', 'mandatory', 'requirement', 'pedagogicalRole', 'role', 'curriculumScope',
  'mastery', 'masterySlot', 'questionCount', 'question_count', 'threshold', 'skills', 'answerTypes', 'allowedAnswerTypes',
  'prerequisites', 'prerequisite', 'visualPolicy', 'visualRequirement', 'allowedVisualKinds', 'objectiveId', 'objective_id',
]);
const ALLOWED_FIELDS = new Set(['questions']);
const QUESTION_FIELDS = new Set(['id', 'question', 'answer_type', 'choices', 'correct_answer', 'skill', 'difficulty', 'success_feedback', 'error_feedback']);
const PLACEHOLDER = /^(?:todo|tbd|placeholder|lorem ipsum|n\/a|na)$/i;
const RAW_JSON = /```|^[\[{]|(?:^|\s)[{"'](?:slotId|objectiveIds|level|sequence|mandatory|threshold|skills)\s*:/i;
const UNIT_TOKEN = /(?:\b(?:ms|millisecondes?|s|sec|seconde?s?|min|minute?s?|h|heure?s?|j|jour?s?|semaine?s?|mois|annee?s?|si[eè]cle?s?|mill[eé]naire?s?|kg|g|cm|m|mm|km)\b|\d\s*[/:]\s*\d\s*(?:h|min|s))/i;
const DURATION_PROMPT = /\b(?:convert(?:is|ir)?|conversion|combien\s+(?:de|font)|dur[ée]e|unit[ée]s?\s+de\s+dur[ée]e)\b/i;

const error = (field: string, code: string, message: string): MasteryAdapterError => ({ field, code, message });
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const nonEmpty = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const text = (value: unknown): string => String(value).trim();
const normalized = (value: unknown): string => text(value).toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');
const plainNumeric = (value: unknown): boolean => (typeof value === 'number' && Number.isFinite(value)) || (typeof value === 'string' && /^[-+]?\d+(?:[.,]\d+)?$/.test(value.trim()));
const timeOfDay = (value: unknown): boolean => /^\s*\d{1,2}\s*(?:h|heures?)\s*\d{1,2}\s*(?:min|minutes?)?\s*$/i.test(String(value)) || /^\s*\d{1,2}:\d{2}\s*$/.test(String(value));

function quantityRequired(question: unknown, answer: unknown): boolean {
  if (object(answer) && ('unit' in answer || 'value' in answer)) return true;
  const questionText = typeof question === 'string' ? question : '';
  const durationQuestion = DURATION_PROMPT.test(questionText) && UNIT_TOKEN.test(questionText);
  if (timeOfDay(answer) && !durationQuestion && /(?:quelle heure|à quelle heure|heure indique)/i.test(questionText)) return false;
  if (typeof answer === 'string' && UNIT_TOKEN.test(answer)) return true;
  return durationQuestion;
}

function textErrors(field: string, value: unknown): MasteryAdapterError[] {
  if (!nonEmpty(value)) return [error(field, 'required', 'Expected a non-empty string.')];
  const valueText = text(value);
  if (PLACEHOLDER.test(valueText)) return [error(field, 'placeholder', 'Placeholder content is not accepted.')];
  if (RAW_JSON.test(valueText)) return [error(field, 'raw_json', 'Raw JSON/Markdown content is not accepted.')];
  return [];
}

function slotAnswerTypes(slot: MasteryAdapterSlot): BlueprintAnswerType[] {
  return 'answerTypes' in slot ? slot.answerTypes ?? [] : slot.allowedAnswerTypes;
}

function questionErrors(slot: MasteryAdapterSlot, raw: unknown, index: number, seenQuestions: Set<string>): MasteryAdapterError[] {
  const path = `questions[${index}]`;
  if (!object(raw)) return [error(path, 'invalid_question', 'Each mastery question must be an object.')];
  const errors: MasteryAdapterError[] = [];
  Object.keys(raw).forEach((field) => { if (!QUESTION_FIELDS.has(field)) errors.push(error(`${path}.${field}`, STRUCTURAL_FIELDS.has(field) ? 'structural_mutation' : 'unexpected_field', STRUCTURAL_FIELDS.has(field) ? 'Blueprint-owned mastery fields cannot be supplied by the content provider.' : 'Field is not part of the mastery question contract.')); });
  errors.push(...textErrors(`${path}.id`, raw.id), ...textErrors(`${path}.question`, raw.question), ...textErrors(`${path}.skill`, raw.skill), ...textErrors(`${path}.success_feedback`, raw.success_feedback), ...textErrors(`${path}.error_feedback`, raw.error_feedback));
  const questionKey = normalized(raw.question);
  if (questionKey && seenQuestions.has(questionKey)) errors.push(error(`${path}.question`, 'duplicate_question', 'Mastery questions must be distinct after normalization.'));
  if (questionKey) seenQuestions.add(questionKey);
  const answerType = String(raw.answer_type ?? '') as BlueprintAnswerType;
  const allowed = slotAnswerTypes(slot);
  if (!ANSWER_TYPES.has(answerType) || (allowed.length > 0 && !allowed.includes(answerType))) errors.push(error(`${path}.answer_type`, 'answer_type_mismatch', `Answer type must be one of: ${allowed.join(', ')}.`));
  if (raw.correct_answer === undefined || raw.correct_answer === null || (typeof raw.correct_answer === 'string' && !nonEmpty(raw.correct_answer))) errors.push(error(`${path}.correct_answer`, 'required', 'A correct answer is required.'));
  if (quantityRequired(raw.question, raw.correct_answer) && (object(raw.correct_answer) || answerType === 'numeric' || answerType === 'time')) errors.push(error(`${path}.correct_answer`, 'UNSUPPORTED_QUANTITY_ANSWER', 'Unit-bearing quantities require a typed value plus unit; the current contract cannot represent them safely.'));
  if (answerType === 'numeric' && !plainNumeric(raw.correct_answer)) errors.push(error(`${path}.correct_answer`, 'numeric_format', 'Numeric mastery answers must be plain numbers without units.'));
  if (answerType === 'time' && !timeOfDay(raw.correct_answer)) errors.push(error(`${path}.correct_answer`, 'time_of_day_format', 'Time answers must represent time of day, such as 14 h 30 or 14:30.'));
  if (raw.difficulty === undefined || (typeof raw.difficulty !== 'string' && typeof raw.difficulty !== 'number') || (typeof raw.difficulty === 'string' && !nonEmpty(raw.difficulty))) errors.push(error(`${path}.difficulty`, 'invalid_difficulty', 'Difficulty must be a non-empty string or number.'));
  if (raw.choices !== undefined && (!Array.isArray(raw.choices) || raw.choices.length < 2 || raw.choices.some((choice) => !nonEmpty(choice)))) errors.push(error(`${path}.choices`, 'invalid_choices', 'Choices must contain at least two non-empty strings.'));
  if (Array.isArray(raw.choices)) {
    const choices = raw.choices.map(normalized);
    if (new Set(choices).size !== choices.length) errors.push(error(`${path}.choices`, 'duplicate_choice', 'Choices must be distinct after normalization.'));
    if (['multiple_choice', 'selection'].includes(answerType) && !choices.includes(normalized(raw.correct_answer))) errors.push(error(`${path}.correct_answer`, 'choice_membership', 'The correct answer must be one of the choices.'));
  }
  if (answerType === 'ordering' && (!Array.isArray(raw.correct_answer) || !Array.isArray(raw.choices) || raw.correct_answer.length !== raw.choices.length || new Set(raw.correct_answer.map(normalized)).size !== raw.correct_answer.length || !raw.correct_answer.every((value) => raw.choices!.map(normalized).includes(normalized(value))))) errors.push(error(`${path}.correct_answer`, 'ordering_format', 'Ordering answers must be a complete permutation of the choices.'));
  const answerText = typeof raw.correct_answer === 'string' ? normalized(raw.correct_answer) : '';
  if (answerText.length >= 2 && questionKey && (plainNumeric(raw.correct_answer) ? new RegExp(`(?:^|\\D)${answerText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\D|$)`).test(questionKey) : questionKey.includes(answerText))) errors.push(error(`${path}.question`, 'answer_leakage', 'The question exposes its exact answer.'));
  return errors;
}

export function adaptMasteryContent(slot: MasteryAdapterSlot, raw: unknown): MasteryAdapterResult {
  if (!object(raw)) return { ok: false, errors: [error('', 'invalid_input', 'Mastery content must be an object.')] };
  const errors: MasteryAdapterError[] = [];
  Object.keys(raw).forEach((field) => { if (!ALLOWED_FIELDS.has(field)) errors.push(error(field, STRUCTURAL_FIELDS.has(field) ? 'structural_mutation' : 'unexpected_field', STRUCTURAL_FIELDS.has(field) ? 'Blueprint-owned mastery fields cannot be supplied by the content provider.' : 'Field is not part of the mastery content contract.')); });
  if (!Array.isArray(raw.questions)) return { ok: false, errors: [...errors, error('questions', 'question_count', 'Mastery content requires a questions array.')] };
  const bounds = slot.questionCount;
  if (raw.questions.length < bounds.min || raw.questions.length > bounds.max) errors.push(error('questions', 'question_count', `Mastery requires ${bounds.min}–${bounds.max} questions.`));
  const seenQuestions = new Set<string>();
  raw.questions.forEach((question, index) => errors.push(...questionErrors(slot, question, index, seenQuestions)));
  if (errors.length) return { ok: false, errors };
  return { ok: true, content: { questions: raw.questions.map((question) => ({
    id: text((question as Record<string, unknown>).id), question: text((question as Record<string, unknown>).question), answer_type: (question as Record<string, unknown>).answer_type as BlueprintAnswerType,
    ...(Array.isArray((question as Record<string, unknown>).choices) ? { choices: ((question as Record<string, unknown>).choices as unknown[]).map(text) } : {}),
    correct_answer: Array.isArray((question as Record<string, unknown>).correct_answer) ? ((question as Record<string, unknown>).correct_answer as unknown[]).map(text) : (question as Record<string, unknown>).correct_answer as string | number,
    skill: text((question as Record<string, unknown>).skill), difficulty: (question as Record<string, unknown>).difficulty as string | number,
    success_feedback: text((question as Record<string, unknown>).success_feedback), error_feedback: text((question as Record<string, unknown>).error_feedback),
  })) } };
}

export function fillMasterySlot(draft: LessonAssemblyDraft, slotId: string, raw: unknown): FillResult {
  const slot = draft.levels.flatMap((level) => level.slots).find((candidate) => candidate.slotId === slotId);
  if (!slot || slot.kind !== 'mastery') return { success: false, issues: [{ path: slotId, message: 'Slot is not a mastery slot' }], draft };
  const adapted = adaptMasteryContent(slot, raw);
  if (!adapted.ok) return { success: false, issues: adapted.errors.map((entry) => ({ path: `${slotId}.${entry.field}`.replace(/\.$/, ''), message: entry.message })), draft };
  // Skills and threshold are code-owned assembly values. The current assembly
  // contract still requires them, so derive them here rather than accepting
  // provider-supplied structural values.
  return fillSlot(draft, slotId, { ...adapted.content, skills: [...slot.objectiveIds], threshold: 0.8 });
}

export function masteryAdapterMetrics(results: MasteryAdapterResult[], slots: MasteryAdapterSlot[]): MasteryAdapterMetrics {
  const rejected = results.filter((result) => !result.ok);
  return {
    mastery_slots_total: slots.length,
    mastery_content_valid: results.filter((result) => result.ok).length,
    mastery_content_rejected: rejected.length,
    mastery_question_count_errors: rejected.reduce((count, result) => count + result.errors.filter((entry) => entry.code === 'question_count').length, 0),
    mastery_answer_type_errors: rejected.reduce((count, result) => count + result.errors.filter((entry) => entry.code === 'answer_type_mismatch' || entry.code === 'numeric_format' || entry.code === 'time_of_day_format' || entry.code === 'choice_membership' || entry.code === 'ordering_format').length, 0),
    unsupported_quantity_answers: rejected.reduce((count, result) => count + result.errors.filter((entry) => entry.code === 'UNSUPPORTED_QUANTITY_ANSWER').length, 0),
    duplicate_question_errors: rejected.reduce((count, result) => count + result.errors.filter((entry) => entry.code === 'duplicate_question' || entry.code === 'duplicate_choice').length, 0),
    answer_leakage_errors: rejected.reduce((count, result) => count + result.errors.filter((entry) => entry.code === 'answer_leakage').length, 0),
    structural_mutation_rejections: rejected.reduce((count, result) => count + result.errors.filter((entry) => entry.code === 'structural_mutation').length, 0),
  };
}
