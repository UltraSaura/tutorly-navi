import { fillSlot, type FillResult, type LessonAssemblyDraft, type StructuralSlot } from './lesson-assembly.ts';

export type LevelContentAdapterSlot = Pick<StructuralSlot, 'slotId' | 'kind' | 'objectiveIds' | 'levelNumber'>;
export type LevelMisconceptionContent = {
  id: string;
  description: string;
  detect_if: string;
  feedback: string;
  remediation_strategy: string;
};
export type LevelContent = {
  lesson_goal: string;
  success_criteria: string[];
  misconceptions: LevelMisconceptionContent[];
};
export type LevelContentAdapterError = { field: string; code: string; message: string };
export type LevelContentAdapterResult =
  | { ok: true; content: LevelContent }
  | { ok: false; errors: LevelContentAdapterError[] };

const ALLOWED_FIELDS = new Set(['lesson_goal', 'success_criteria', 'misconceptions']);
const STRUCTURAL_FIELDS = new Set([
  'slotId', 'id', 'type', 'kind', 'objectiveIds', 'objective_ids', 'level', 'levelNumber', 'level_number',
  'title', 'purpose', 'difficulty', 'sequence', 'sequenceOrder', 'ordering', 'mandatory', 'requirement',
  'curriculumScope', 'curriculum_metadata', 'prerequisites', 'prerequisite', 'mastery', 'masterySlot',
  'visualPolicy', 'visualRequirement', 'allowedVisualKinds', 'answerTypes', 'questionCount', 'threshold',
]);
const MISCONCEPTION_FIELDS = new Set(['id', 'description', 'detect_if', 'feedback', 'remediation_strategy']);
const PLACEHOLDER = /^(?:todo|tbd|placeholder|lorem ipsum|n\/a|na)$/i;
const RAW_JSON = /```|^[\[{]|(?:^|\s)[{"'](?:slotId|objectiveIds|level|sequence|mandatory|visualPolicy|mastery)\s*:/i;

const error = (field: string, code: string, message: string): LevelContentAdapterError => ({ field, code, message });
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const nonEmpty = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const text = (value: unknown): string => String(value).trim();
const normalized = (value: unknown): string => text(value).toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');

function textErrors(field: string, value: unknown): LevelContentAdapterError[] {
  if (!nonEmpty(value)) return [error(field, 'required', 'Expected a non-empty string.')];
  const valueText = text(value);
  if (PLACEHOLDER.test(valueText)) return [error(field, 'placeholder', 'Placeholder content is not accepted.')];
  if (RAW_JSON.test(valueText)) return [error(field, 'raw_json', 'Raw JSON/Markdown content is not accepted.')];
  return [];
}

export function adaptLevelContent(_slot: LevelContentAdapterSlot, raw: unknown): LevelContentAdapterResult {
  if (!object(raw)) return { ok: false, errors: [error('', 'invalid_input', 'Level content must be an object.')] };
  const errors: LevelContentAdapterError[] = [];
  Object.keys(raw).forEach((field) => {
    if (!ALLOWED_FIELDS.has(field)) errors.push(error(field, STRUCTURAL_FIELDS.has(field) ? 'structural_mutation' : 'unexpected_field', STRUCTURAL_FIELDS.has(field) ? 'Blueprint-owned level fields cannot be supplied by the content provider.' : 'Field is not part of the level-content contract.'));
  });
  errors.push(...textErrors('lesson_goal', raw.lesson_goal));
  if (!Array.isArray(raw.success_criteria) || raw.success_criteria.length < 1 || raw.success_criteria.length > 5) {
    errors.push(error('success_criteria', 'invalid_count', 'success_criteria must contain 1–5 items.'));
  } else {
    const seen = new Set<string>();
    raw.success_criteria.forEach((criterion, index) => {
      errors.push(...textErrors(`success_criteria[${index}]`, criterion));
      const key = normalized(criterion);
      if (seen.has(key)) errors.push(error(`success_criteria[${index}]`, 'duplicate', 'Success criteria must be distinct.'));
      seen.add(key);
    });
  }
  if (!Array.isArray(raw.misconceptions)) errors.push(error('misconceptions', 'invalid_type', 'misconceptions must be an array.'));
  else {
    const seen = new Set<string>();
    raw.misconceptions.forEach((misconception, index) => {
      const path = `misconceptions[${index}]`;
      if (!object(misconception)) {
        errors.push(error(path, 'invalid_type', 'Each misconception must be an object.'));
        return;
      }
      Object.keys(misconception).forEach((field) => { if (!MISCONCEPTION_FIELDS.has(field)) errors.push(error(`${path}.${field}`, 'unexpected_field', 'Field is not part of the misconception contract.')); });
      for (const field of MISCONCEPTION_FIELDS) errors.push(...textErrors(`${path}.${field}`, misconception[field]));
      const key = [misconception.description, misconception.detect_if, misconception.feedback, misconception.remediation_strategy].map(normalized).join('|');
      if (seen.has(key)) errors.push(error(path, 'duplicate', 'Misconceptions must be distinct.'));
      seen.add(key);
    });
  }
  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    content: {
      lesson_goal: text(raw.lesson_goal),
      success_criteria: (raw.success_criteria as unknown[]).map(text),
      misconceptions: (raw.misconceptions as Record<string, unknown>[]).map((misconception) => ({
        id: text(misconception.id),
        description: text(misconception.description),
        detect_if: text(misconception.detect_if),
        feedback: text(misconception.feedback),
        remediation_strategy: text(misconception.remediation_strategy),
      })),
    },
  };
}

export function fillLevelContentSlot(draft: LessonAssemblyDraft, slotId: string, raw: unknown): FillResult {
  const slot = draft.levels.flatMap((level) => level.slots).find((candidate) => candidate.slotId === slotId);
  if (!slot || slot.kind !== 'level_content') return { success: false, issues: [{ path: slotId, message: 'Slot is not a level-content slot' }], draft };
  const adapted = adaptLevelContent(slot, raw);
  if (!adapted.ok) return { success: false, issues: adapted.errors.map((entry) => ({ path: `${slotId}.${entry.field}`.replace(/\.$/, ''), message: entry.message })), draft };
  return fillSlot(draft, slotId, adapted.content);
}
