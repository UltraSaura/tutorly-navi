import { validateLessonV21, type ContractIssue } from './lesson-v21-contract.ts';
import {
  validateLessonBlueprint,
  type BlueprintAnswerType,
  type BlueprintIssue,
  type ConceptSlot,
  type InteractionSlot,
  type LessonBlueprint,
  type LevelBlueprint,
  type MasterySlot,
  type PrerequisiteSlot,
} from './lesson-blueprint.ts';

export type AssemblyRequirement = 'mandatory' | 'optional';
export type AssemblyStatus = 'pending' | 'complete';
export type AssemblySlotKind = 'level_content' | 'prerequisite' | 'concept' | 'interaction' | 'mastery';

export type StructuralSlot = {
  slotId: string;
  kind: AssemblySlotKind;
  levelNumber: number;
  requirement: AssemblyRequirement;
  objectiveIds: string[];
  status: AssemblyStatus;
  content?: Record<string, unknown>;
  visualRequirement?: string;
  allowedVisualKinds?: string[];
  requiresKeyPoints?: boolean;
  keyPointCount?: { min: number; max: number };
  requiresTakeaway?: boolean;
  blockType?: string;
  answerTypes?: BlueprintAnswerType[];
  priorSkill?: string;
  source?: string;
  diagnosticSkillStatus?: 'resolved' | 'generic' | 'missing';
  mustPrecedeObjectiveIds?: string[];
  forbiddenTargetObjectiveIds?: string[];
  questionCount?: { min: number; max: number };
  placement?: string;
};

export type AssemblyLevel = {
  levelId: string;
  levelNumber: number;
  title: string;
  purpose: string;
  difficulty: string;
  objectiveIds: string[];
  slots: StructuralSlot[];
};

export type LessonAssemblyDraft = {
  kind: 'lesson-assembly-draft';
  version: 'internal-v1';
  topicId: string;
  topicGoal: string;
  levels: AssemblyLevel[];
};

export type AssemblyMetricSnapshot = {
  draft_valid: boolean;
  mandatory_slot_count: number;
  optional_slot_count: number;
  missing_content_field_count: number;
  materializable: boolean;
  mutation_rejections: number;
};

export type AssemblyIssue = { path: string; message: string };
export type FillResult = { success: true; draft: LessonAssemblyDraft } | { success: false; issues: AssemblyIssue[]; draft: LessonAssemblyDraft };
export type MaterializeResult = { success: true; value: Record<string, unknown> } | { success: false; issues: AssemblyIssue[] };

const ANSWER_TYPES: BlueprintAnswerType[] = ['multiple_choice', 'numeric', 'time', 'short_text', 'selection', 'ordering'];
const CONTENT_FIELDS: Record<AssemblySlotKind, string[]> = {
  level_content: ['lesson_goal', 'success_criteria', 'misconceptions'],
  prerequisite: ['description', 'check_question', 'answer_type', 'choices', 'expected_answer', 'remediation_hint', 'visual'],
  concept: ['title', 'content', 'representation', 'key_points', 'takeaway', 'visual'],
  interaction: ['context', 'steps', 'question', 'answer_type', 'choices', 'correct_answer', 'explanation', 'hints', 'success_feedback', 'error_feedback'],
  mastery: ['questions', 'skills', 'threshold'],
};

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const isObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const nonEmpty = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const array = (value: unknown): value is unknown[] => Array.isArray(value);
const issue = (path: string, message: string): AssemblyIssue => ({ path, message });

function requiredFields(slot: StructuralSlot): string[] {
  if (slot.kind === 'level_content') return ['lesson_goal', 'success_criteria', 'misconceptions'];
  if (slot.kind === 'concept') return ['title', 'content', ...(slot.requiresKeyPoints ? ['key_points'] : []), ...(slot.requiresTakeaway ? ['takeaway'] : []), ...(slot.visualRequirement === 'required' ? ['visual.data'] : [])];
  if (slot.kind === 'prerequisite') return ['description', 'check_question', 'answer_type', 'expected_answer', 'remediation_hint'];
  if (slot.kind === 'interaction') {
    if (slot.blockType === 'guided_example') return ['context', 'steps'];
    if (slot.blockType === 'prediction') return ['question', 'choices', 'correct_answer', 'explanation'];
    return ['question', 'answer_type', 'correct_answer', 'success_feedback', 'error_feedback'];
  }
  return ['questions', 'skills', 'threshold'];
}

function structuralSlot(levelNumber: number, slot: ConceptSlot | InteractionSlot | PrerequisiteSlot | MasterySlot, kind: AssemblySlotKind, objectiveIds: string[]): StructuralSlot {
  const base: StructuralSlot = { slotId: slot.slotId, kind, levelNumber, requirement: kind === 'prerequisite' && 'source' in slot && slot.source !== 'deterministic-domain-rule' ? 'optional' : 'mandatory', objectiveIds: [...objectiveIds], status: 'pending' };
  if (kind === 'concept' && slot.type === 'concept') return { ...base, visualRequirement: slot.visualRequirement, allowedVisualKinds: [...slot.allowedVisualKinds], requiresKeyPoints: slot.requiresKeyPoints, keyPointCount: { ...slot.keyPointCount }, requiresTakeaway: slot.requiresTakeaway };
  if (kind === 'interaction' && 'type' in slot) return { ...base, blockType: slot.type, answerTypes: slot.answerTypes ? [...slot.answerTypes] : undefined };
  if (kind === 'prerequisite' && 'priorSkill' in slot) return { ...base, priorSkill: slot.priorSkill, source: slot.source, diagnosticSkillStatus: slot.source === 'deterministic-domain-rule' ? 'resolved' : slot.source === 'previous-level-objectives' ? 'generic' : 'missing', mustPrecedeObjectiveIds: [...slot.mustPrecedeObjectiveIds], forbiddenTargetObjectiveIds: [...slot.forbiddenTargetObjectiveIds], answerTypes: [...slot.allowedAnswerTypes] };
  if (kind === 'mastery' && 'placement' in slot) return { ...base, questionCount: { ...slot.questionCount }, answerTypes: [...slot.allowedAnswerTypes], placement: slot.placement };
  return base;
}

export function assembleLessonBlueprint(blueprint: LessonBlueprint, knownObjectiveIds: Iterable<string>): { success: true; draft: LessonAssemblyDraft } | { success: false; issues: BlueprintIssue[] } {
  const validated = validateLessonBlueprint(blueprint, knownObjectiveIds);
  if (!validated.success) return validated;
  const levels: AssemblyLevel[] = blueprint.levels.map((level: LevelBlueprint) => {
    const slots: StructuralSlot[] = [{ slotId: `level-${level.levelNumber}-content`, kind: 'level_content', levelNumber: level.levelNumber, requirement: 'mandatory', objectiveIds: [...level.objectiveIds], status: 'pending' }];
    level.prerequisiteSlots.forEach((slot) => slots.push(structuralSlot(level.levelNumber, slot, 'prerequisite', level.objectiveIds)));
    level.sequenceSlots.forEach((slot) => slots.push(structuralSlot(level.levelNumber, slot, slot.type === 'concept' ? 'concept' : 'interaction', slot.objectiveIds)));
    slots.push(structuralSlot(level.levelNumber, level.masterySlot, 'mastery', level.objectiveIds));
    return { levelId: `level-${level.levelNumber}`, levelNumber: level.levelNumber, title: level.title, purpose: level.purpose, difficulty: level.difficulty, objectiveIds: [...level.objectiveIds], slots };
  });
  return { success: true, draft: { kind: 'lesson-assembly-draft', version: 'internal-v1', topicId: blueprint.topicId, topicGoal: blueprint.topicGoal, levels } };
}

function validateContent(slot: StructuralSlot, content: Record<string, unknown>): AssemblyIssue[] {
  const errors: AssemblyIssue[] = [];
  const allowed = new Set(CONTENT_FIELDS[slot.kind]);
  Object.keys(content).forEach((key) => { if (!allowed.has(key)) errors.push(issue(`${slot.slotId}.${key}`, 'Unexpected content field; structural fields are immutable')); });
  for (const field of requiredFields(slot)) {
    const value = field === 'visual.data' ? (isObject(content.visual) ? content.visual.data : undefined) : content[field];
    if (value === undefined || (typeof value === 'string' && !nonEmpty(value))) errors.push(issue(`${slot.slotId}.${field}`, 'Missing required content'));
  }
  if (slot.kind === 'level_content') {
    if (!array(content.success_criteria) || content.success_criteria.length < 1 || content.success_criteria.length > 5 || content.success_criteria.some((v) => !nonEmpty(v))) errors.push(issue(`${slot.slotId}.success_criteria`, 'Expected 1–5 non-empty strings'));
    if (!array(content.misconceptions) || content.misconceptions.some((v) => !isObject(v))) errors.push(issue(`${slot.slotId}.misconceptions`, 'Expected misconception objects'));
  }
  if (slot.kind === 'concept') {
    if (content.key_points !== undefined && (!array(content.key_points) || content.key_points.length < 1 || content.key_points.length > 6 || content.key_points.some((v) => !isObject(v) || !nonEmpty(v.label) || !nonEmpty(v.text)))) errors.push(issue(`${slot.slotId}.key_points`, 'Expected key-point objects'));
    if (slot.requiresKeyPoints && (!array(content.key_points) || content.key_points.length < (slot.keyPointCount?.min ?? 1) || content.key_points.length > (slot.keyPointCount?.max ?? 4))) errors.push(issue(`${slot.slotId}.key_points`, 'Key-point count violates blueprint bounds'));
    if (slot.requiresTakeaway && !nonEmpty(content.takeaway)) errors.push(issue(`${slot.slotId}.takeaway`, 'Required takeaway'));
    if (content.visual !== undefined) {
      if (!isObject(content.visual)) errors.push(issue(`${slot.slotId}.visual`, 'Expected visual object'));
      else {
        if (!nonEmpty(content.visual.kind) || !(slot.allowedVisualKinds ?? []).includes(String(content.visual.kind))) errors.push(issue(`${slot.slotId}.visual.kind`, 'Visual kind violates blueprint policy'));
        if (!nonEmpty(content.visual.alt_text) || !nonEmpty(content.visual.purpose)) errors.push(issue(`${slot.slotId}.visual`, 'Visual requires purpose and alt_text'));
        if (slot.visualRequirement === 'required' && (!isObject(content.visual.data) || Object.keys(content.visual.data).length === 0)) errors.push(issue(`${slot.slotId}.visual.data`, 'Required visual data is missing'));
      }
    }
  }
  if (slot.kind === 'prerequisite') {
    if (!ANSWER_TYPES.includes(String(content.answer_type) as BlueprintAnswerType) || !(slot.answerTypes ?? []).includes(String(content.answer_type) as BlueprintAnswerType)) errors.push(issue(`${slot.slotId}.answer_type`, 'Answer type violates prerequisite constraint'));
    if (['objectiveIds', 'mustPrecedeObjectiveIds', 'forbiddenTargetObjectiveIds'].some((field) => content[field] !== undefined)) errors.push(issue(slot.slotId, 'Prerequisite target controls are immutable and cannot be supplied as content'));
    if (content.answer_type === 'numeric' && !/^[-+]?\d+(?:[.,]\d+)?$/.test(String(content.expected_answer ?? '').trim())) errors.push(issue(`${slot.slotId}.expected_answer`, 'Numeric prerequisite requires a numeric expected answer'));
    if (['multiple_choice', 'selection'].includes(String(content.answer_type)) && (!array(content.choices) || content.choices.length < 2 || !content.choices.some((choice) => String(choice).trim().toLowerCase() === String(content.expected_answer ?? '').trim().toLowerCase()))) errors.push(issue(`${slot.slotId}.choices`, 'Expected answer must be one of the choices'));
  }
  if (slot.kind === 'interaction' && slot.blockType !== 'guided_example') {
    if (slot.blockType !== 'prediction' && (!ANSWER_TYPES.includes(String(content.answer_type) as BlueprintAnswerType) || (slot.answerTypes?.length && !slot.answerTypes.includes(String(content.answer_type) as BlueprintAnswerType)))) errors.push(issue(`${slot.slotId}.answer_type`, 'Answer type violates interaction constraint'));
    if (slot.blockType === 'prediction' && content.answer_type !== undefined && (!ANSWER_TYPES.includes(String(content.answer_type) as BlueprintAnswerType) || (slot.answerTypes?.length && !slot.answerTypes.includes(String(content.answer_type) as BlueprintAnswerType)))) errors.push(issue(`${slot.slotId}.answer_type`, 'Answer type violates interaction constraint'));
    if (slot.blockType !== 'prediction' && (!nonEmpty(content.success_feedback) || !nonEmpty(content.error_feedback))) errors.push(issue(`${slot.slotId}`, 'Feedback checkpoint requires success and error feedback'));
    if (slot.blockType === 'prediction' && (!array(content.choices) || content.choices.length < 2 || content.choices.some((choice) => !nonEmpty(choice)))) errors.push(issue(`${slot.slotId}.choices`, 'Prediction requires at least two choices'));
  }
  if (slot.kind === 'mastery') {
    if (!array(content.questions) || content.questions.length < (slot.questionCount?.min ?? 1) || content.questions.length > (slot.questionCount?.max ?? 4)) errors.push(issue(`${slot.slotId}.questions`, 'Question count violates mastery bounds'));
    if (!array(content.skills) || content.skills.length < 1 || content.skills.some((v) => !nonEmpty(v))) errors.push(issue(`${slot.slotId}.skills`, 'Mastery skills are required'));
    if (typeof content.threshold !== 'number' || content.threshold < 0 || content.threshold > 1) errors.push(issue(`${slot.slotId}.threshold`, 'Mastery threshold must be between 0 and 1'));
  }
  return errors;
}

export function getMissingContentSlots(draft: LessonAssemblyDraft): Array<{ levelNumber: number; slotId: string; kind: AssemblySlotKind; requirement: AssemblyRequirement; fields: string[] }> {
  return draft.levels.flatMap((level) => level.slots.filter((slot) => slot.status === 'pending').map((slot) => ({ levelNumber: level.levelNumber, slotId: slot.slotId, kind: slot.kind, requirement: slot.requirement, fields: requiredFields(slot) })));
}

export function fillSlot(draft: LessonAssemblyDraft, slotId: string, generatedContent: Record<string, unknown>): FillResult {
  const next = clone(draft);
  const slot = next.levels.flatMap((level) => level.slots).find((candidate) => candidate.slotId === slotId);
  if (!slot) return { success: false, issues: [issue(slotId, 'Unknown slot ID')], draft };
  if (slot.status === 'complete') return { success: false, issues: [issue(slotId, 'Slot is already complete')], draft };
  const errors = validateContent(slot, generatedContent);
  if (errors.length) return { success: false, issues: errors, draft };
  slot.content = clone(generatedContent);
  slot.status = 'complete';
  return { success: true, draft: next };
}

function blockFromSlot(slot: StructuralSlot): Record<string, unknown> {
  const content = slot.content ?? {};
  if (slot.kind === 'concept') return { id: slot.slotId, type: 'concept', ...content };
  if (slot.kind === 'interaction') return { id: slot.slotId, type: slot.blockType, ...content };
  return { id: slot.slotId, type: 'mastery_check', questions: content.questions };
}

export function materializeV21(draft: LessonAssemblyDraft): MaterializeResult {
  const missing = getMissingContentSlots(draft).filter((slot) => slot.requirement === 'mandatory');
  if (missing.length) return { success: false, issues: missing.flatMap((slot) => slot.fields.map((field) => issue(`${slot.slotId}.${field}`, 'Content is not complete'))) };
  const value: Record<string, unknown> = { version: '2.1', topic_goal: draft.topicGoal, levels: draft.levels.map((level) => {
    const metadata = level.slots.find((slot) => slot.kind === 'level_content')?.content ?? {};
    const prerequisites = level.slots.filter((slot) => slot.kind === 'prerequisite' && slot.status === 'complete').map((slot) => ({ id: slot.slotId, ...(slot.content ?? {}) }));
    const sequence = level.slots.filter((slot) => ['concept', 'interaction', 'mastery'].includes(slot.kind)).filter((slot) => slot.status === 'complete').map(blockFromSlot);
    const masteryContent = level.slots.find((slot) => slot.kind === 'mastery')?.content ?? {};
    return { id: level.levelId, level_number: level.levelNumber, title: level.title, purpose: level.purpose, difficulty: level.difficulty, objective_ids: [...level.objectiveIds], lesson: { lesson_goal: metadata.lesson_goal, success_criteria: metadata.success_criteria, prerequisites, misconceptions: metadata.misconceptions, sequence, mastery: { skills: masteryContent.skills, threshold: masteryContent.threshold } } };
  }) };
  const canonical = validateLessonV21(value);
  if (!canonical.success) return { success: false, issues: canonical.issues.map((entry: ContractIssue) => issue(entry.path, entry.message)) };
  return { success: true, value };
}

export function assemblyMetrics(draft: LessonAssemblyDraft, mutationRejections = 0): AssemblyMetricSnapshot {
  const slots = draft.levels.flatMap((level) => level.slots);
  const missing = getMissingContentSlots(draft);
  return { draft_valid: true, mandatory_slot_count: slots.filter((slot) => slot.requirement === 'mandatory').length, optional_slot_count: slots.filter((slot) => slot.requirement === 'optional').length, missing_content_field_count: missing.reduce((total, slot) => total + slot.fields.length, 0), materializable: missing.every((slot) => slot.requirement !== 'mandatory'), mutation_rejections: mutationRejections };
}
