import { determineVisualRequirement, isSupportedVisualKind } from './visual-policy.ts';

export type BlueprintObjective = {
  id: string;
  text: string;
  orderIndex?: number;
};

export type BlueprintTopic = {
  id: string;
  name: string;
  levelCode: string;
};

export type BlueprintDifficulty = 'foundation' | 'application' | 'transfer';
export type BlueprintAnswerType = 'multiple_choice' | 'numeric' | 'time' | 'short_text' | 'selection' | 'ordering';

export type ConceptSlot = {
  slotId: string;
  type: 'concept';
  objectiveIds: string[];
  pedagogicalRole: 'foundation' | 'application' | 'transfer';
  requiresContent: true;
  visualRequirement: 'required' | 'preferred' | 'optional';
  allowedVisualKinds: string[];
  requiresKeyPoints: boolean;
  keyPointCount: { min: number; max: number };
  requiresTakeaway: boolean;
};

export type InteractionSlot = {
  slotId: string;
  type: 'guided_example' | 'prediction' | 'student_try' | 'feedback_checkpoint';
  objectiveIds: string[];
  answerTypes?: BlueprintAnswerType[];
};

export type PrerequisiteSlot = {
  slotId: string;
  priorSkill: string;
  source: 'deterministic-domain-rule' | 'previous-level-objectives' | 'unresolved-curriculum-metadata';
  mustPrecedeObjectiveIds: string[];
  forbiddenTargetObjectiveIds: string[];
  allowedAnswerTypes: BlueprintAnswerType[];
};

export type MasterySlot = {
  slotId: string;
  objectiveIds: string[];
  questionCount: { min: number; max: number };
  allowedAnswerTypes: BlueprintAnswerType[];
  placement: 'after_sequence';
};

export type LevelBlueprint = {
  levelNumber: number;
  title: string;
  purpose: string;
  difficulty: BlueprintDifficulty;
  objectiveIds: string[];
  prerequisiteSlots: PrerequisiteSlot[];
  sequenceSlots: Array<ConceptSlot | InteractionSlot>;
  masterySlot: MasterySlot;
};

export type LessonBlueprint = {
  version: 'internal-v1';
  topicId: string;
  topicGoal: string;
  levels: LevelBlueprint[];
};

export type BlueprintMetricSnapshot = {
  blueprint_valid: boolean;
  blueprint_errors: number;
  slot_count: number;
  visual_required_count: number;
  prerequisite_slot_count: number;
  mastery_slot_count: number;
};

export type BlueprintIssue = { path: string; message: string };

const SUPPORTED_ANSWER_TYPES: BlueprintAnswerType[] = ['multiple_choice', 'numeric', 'time', 'short_text', 'selection', 'ordering'];
const DIFFICULTY_LABELS: Array<{ difficulty: BlueprintDifficulty; title: string; purpose: string }> = [
  { difficulty: 'foundation', title: 'Fondations', purpose: 'Construire les notions et représentations essentielles.' },
  { difficulty: 'application', title: 'Application', purpose: 'Appliquer les notions dans des situations guidées puis variées.' },
  { difficulty: 'transfer', title: 'Transfert et résolution de problèmes', purpose: 'Mobiliser les notions dans des problèmes nouveaux.' },
];

function normalized(value: string): string {
  return value.toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function roleForObjective(text: string): BlueprintDifficulty {
  const value = normalized(text);
  if (/probleme|probl[eè]mes|resoudre|raisonner|transfert|situation/.test(value)) return 'transfer';
  // Duration-unit vocabulary and conversions establish the foundation. Keep
  // this before the generic "lire" rule so a clock objective is not treated
  // as foundational merely because it contains the verb lire.
  if (/unites? de duree|conversion|convertir/.test(value) && /seconde|minute|heure|jour|semaine|mois|annee|siecle|millenaire|unites?/.test(value)) return 'foundation';
  if (/fraction.*quotient|interpreter|representer|ecrire/.test(value)) return 'foundation';
  if (/horloge|lire l'?heure|calculer des durees/.test(value)) return 'application';
  if (/comparer|ordonner|encadrer|placer|reperer/.test(value)) return 'application';
  if (/additionner|soustraire|produit|quantite|operateur/.test(value)) return 'transfer';
  if (/calculer|conversion|convertir|comparer|ordonner|effectuer|operation|additionner|soustraire|produit/.test(value)) return 'application';
  return 'foundation';
}

function priorSkillFor(topic: BlueprintTopic, objective: BlueprintObjective, levelNumber: number): Pick<PrerequisiteSlot, 'priorSkill' | 'source' | 'allowedAnswerTypes'> {
  const value = normalized(`${topic.name} ${objective.text}`);
  if (levelNumber > 1) {
    return { priorSkill: 'Réussir les notions du niveau précédent.', source: 'previous-level-objectives', allowedAnswerTypes: ['multiple_choice', 'short_text'] };
  }
  if (/duree|heure|minute|seconde|jour|semaine|mois|annee/.test(value)) {
    return { priorSkill: 'Lire et comparer des nombres entiers et effectuer des calculs simples.', source: 'deterministic-domain-rule', allowedAnswerTypes: ['multiple_choice', 'numeric'] };
  }
  if (/fraction/.test(value)) {
    return { priorSkill: 'Lire des nombres entiers et partager une quantité en parts égales.', source: 'deterministic-domain-rule', allowedAnswerTypes: ['multiple_choice', 'numeric'] };
  }
  if (/angle|triangle|rectangle|geometr|figure|solide/.test(value)) {
    return { priorSkill: 'Reconnaître des figures et utiliser un vocabulaire spatial élémentaire.', source: 'deterministic-domain-rule', allowedAnswerTypes: ['multiple_choice', 'short_text'] };
  }
  return { priorSkill: `Compétence préalable non déclarée pour « ${objective.text} ».`, source: 'unresolved-curriculum-metadata', allowedAnswerTypes: ['multiple_choice', 'short_text'] };
}

function answerTypesFor(text: string): BlueprintAnswerType[] {
  const value = normalized(text);
  if (/heure|duree|minute|seconde|jour|semaine|mois|annee/.test(value)) return ['time', 'numeric', 'multiple_choice'];
  if (/fraction|calcul|addition|soustraction|produit|quotient|conversion|nombre/.test(value)) return ['numeric', 'multiple_choice', 'short_text'];
  return ['multiple_choice', 'short_text'];
}

function allocateObjectives(objectives: BlueprintObjective[]): BlueprintObjective[][] {
  const ordered = [...objectives].sort((a, b) => {
    const roleDiff = ({ foundation: 0, application: 1, transfer: 2 }[roleForObjective(a.text)] - { foundation: 0, application: 1, transfer: 2 }[roleForObjective(b.text)]);
    return roleDiff || (a.orderIndex ?? 0) - (b.orderIndex ?? 0);
  });
  const levelCount = Math.min(3, Math.max(1, ordered.length));
  const groups: BlueprintObjective[][] = Array.from({ length: levelCount }, () => []);
  ordered.forEach((objective, index) => groups[Math.min(levelCount - 1, Math.floor(index * levelCount / ordered.length))].push(objective));
  return groups;
}

export function buildLessonBlueprint(topic: BlueprintTopic, objectives: BlueprintObjective[]): LessonBlueprint {
  const groups = allocateObjectives(objectives);
  const levels: LevelBlueprint[] = groups.map((group, index) => {
    const levelNumber = index + 1;
    const meta = DIFFICULTY_LABELS[Math.min(index, DIFFICULTY_LABELS.length - 1)];
    const objectiveIds = group.map((objective) => objective.id);
    const concepts: ConceptSlot[] = group.map((objective, objectiveIndex) => {
      const policy = determineVisualRequirement({ title: objective.text, content: objective.text });
      const structured = policy.requirement !== 'optional';
      return {
        slotId: `level-${levelNumber}-concept-${objectiveIndex + 1}`,
        type: 'concept',
        objectiveIds: [objective.id],
        pedagogicalRole: meta.difficulty,
        requiresContent: true,
        visualRequirement: policy.requirement,
        allowedVisualKinds: policy.suggestedKinds,
        requiresKeyPoints: structured,
        keyPointCount: structured ? { min: 1, max: 4 } : { min: 0, max: 0 },
        requiresTakeaway: structured,
      };
    });
    const interactionTypes: InteractionSlot['type'][] = ['guided_example', 'prediction', 'student_try', 'feedback_checkpoint'];
    const interactions: InteractionSlot[] = interactionTypes.map((type) => ({
      slotId: `level-${levelNumber}-${type}`,
      type,
      objectiveIds,
      ...(type === 'prediction' || type === 'student_try' || type === 'feedback_checkpoint'
        ? { answerTypes: [...new Set(group.flatMap((objective) => answerTypesFor(objective.text)))] }
        : {}),
    }));
    const prereq = group[0] ?? { id: `missing-objective-${levelNumber}`, text: 'Objectif non fourni' };
    const prior = priorSkillFor(topic, prereq, levelNumber);
    return {
      levelNumber,
      title: `Niveau ${levelNumber} — ${meta.title}`,
      purpose: meta.purpose,
      difficulty: meta.difficulty,
      objectiveIds,
      prerequisiteSlots: [{
        slotId: `level-${levelNumber}-prerequisite-1`,
        ...prior,
        mustPrecedeObjectiveIds: objectiveIds,
        forbiddenTargetObjectiveIds: objectiveIds,
      }],
      sequenceSlots: [...concepts, ...interactions],
      masterySlot: {
        slotId: `level-${levelNumber}-mastery`,
        objectiveIds,
        questionCount: { min: 1, max: 4 },
        allowedAnswerTypes: [...new Set(group.flatMap((objective) => answerTypesFor(objective.text)))],
        placement: 'after_sequence',
      },
    };
  });
  return {
    version: 'internal-v1',
    topicId: topic.id,
    topicGoal: `Maîtriser ${topic.name}.`,
    levels,
  };
}

export function validateLessonBlueprint(blueprint: unknown, knownObjectiveIds: Iterable<string>): { success: true; metrics: BlueprintMetricSnapshot } | { success: false; issues: BlueprintIssue[]; metrics: BlueprintMetricSnapshot } {
  const issues: BlueprintIssue[] = [];
  const known = new Set(knownObjectiveIds);
  const add = (path: string, message: string) => issues.push({ path, message });
  const isObject = (value: unknown): value is Record<string, any> => !!value && typeof value === 'object' && !Array.isArray(value);
  let slotCount = 0;
  let visualRequiredCount = 0;
  let prerequisiteSlotCount = 0;
  let masterySlotCount = 0;
  if (!isObject(blueprint)) add('', 'Blueprint must be an object');
  const value = isObject(blueprint) ? blueprint : {};
  if (value.version !== 'internal-v1') add('version', 'Expected internal-v1');
  if (!Array.isArray(value.levels) || value.levels.length < 1 || value.levels.length > 3) add('levels', 'Expected 1–3 levels');
  const levels = Array.isArray(value.levels) ? value.levels : [];
  const levelNumbers = new Set<number>();
  const allocated = new Set<string>();
  const allSlotIds = new Set<string>();
  levels.forEach((level: any, li: number) => {
    const path = `levels[${li}]`;
    if (!isObject(level)) return add(path, 'Expected object');
    if (!Number.isInteger(level.levelNumber) || level.levelNumber < 1) add(`${path}.levelNumber`, 'Expected positive integer');
    if (levelNumbers.has(level.levelNumber)) add(`${path}.levelNumber`, 'Duplicate level number');
    levelNumbers.add(level.levelNumber);
    if (!Array.isArray(level.objectiveIds) || level.objectiveIds.length < 1) add(`${path}.objectiveIds`, 'Expected at least one objective');
    for (const objectiveId of level.objectiveIds ?? []) {
      if (!known.has(objectiveId)) add(`${path}.objectiveIds`, `Unknown objective ${objectiveId}`);
      if (allocated.has(objectiveId)) add(`${path}.objectiveIds`, `Objective allocated more than once: ${objectiveId}`);
      allocated.add(objectiveId);
    }
    const prereqs = Array.isArray(level.prerequisiteSlots) ? level.prerequisiteSlots : [];
    prerequisiteSlotCount += prereqs.length;
    prereqs.forEach((slot: any, si: number) => {
      const p = `${path}.prerequisiteSlots[${si}]`;
      slotCount++;
      if (!slot?.slotId) add(`${p}.slotId`, 'Missing slot ID');
      else if (allSlotIds.has(slot.slotId)) add(`${p}.slotId`, 'Duplicate slot ID');
      else allSlotIds.add(slot.slotId);
      if (!slot?.priorSkill) add(`${p}.priorSkill`, 'Missing prior skill');
      const forbidden = new Set(slot?.forbiddenTargetObjectiveIds ?? []);
      for (const objectiveId of slot?.mustPrecedeObjectiveIds ?? []) if (!forbidden.has(objectiveId)) add(`${p}`, `Prerequisite must explicitly forbid testing target objective: ${objectiveId}`);
      if (!Array.isArray(slot?.allowedAnswerTypes) || slot.allowedAnswerTypes.some((type: string) => !SUPPORTED_ANSWER_TYPES.includes(type))) add(`${p}.allowedAnswerTypes`, 'Unsupported answer type');
    });
    const sequence = Array.isArray(level.sequenceSlots) ? level.sequenceSlots : [];
    if (sequence.length < 1) add(`${path}.sequenceSlots`, 'Sequence cannot be empty');
    const ids = new Set<string>();
    let seenInteraction = false;
    sequence.forEach((slot: any, si: number) => {
      const p = `${path}.sequenceSlots[${si}]`;
      slotCount++;
      if (!slot?.slotId) add(`${p}.slotId`, 'Missing slot ID');
      else if (ids.has(slot.slotId)) add(`${p}.slotId`, 'Duplicate slot ID');
      else if (allSlotIds.has(slot.slotId)) add(`${p}.slotId`, 'Duplicate slot ID');
      else { ids.add(slot.slotId); allSlotIds.add(slot.slotId); }
      if (slot?.type === 'concept') {
        if (seenInteraction) add(p, 'Concept slot must precede interaction slots');
        if (slot.requiresContent !== true) add(`${p}.requiresContent`, 'Concept content must be required');
        if (slot.visualRequirement === 'required') visualRequiredCount++;
        if (!Array.isArray(slot.allowedVisualKinds) || slot.visualRequirement === 'required' && slot.allowedVisualKinds.length === 0) add(`${p}.allowedVisualKinds`, 'Required visual needs allowed kinds');
        if ((slot.allowedVisualKinds ?? []).some((kind: string) => !isSupportedVisualKind(kind))) add(`${p}.allowedVisualKinds`, 'Unsupported visual kind');
        if (typeof slot.keyPointCount?.min !== 'number' || typeof slot.keyPointCount?.max !== 'number' || slot.keyPointCount.min < 0 || slot.keyPointCount.max > 4 || slot.keyPointCount.min > slot.keyPointCount.max) add(`${p}.keyPointCount`, 'Invalid key-point bounds');
        if (slot.requiresKeyPoints && slot.keyPointCount?.min < 1) add(`${p}.keyPointCount`, 'Required key points need min >= 1');
        if (slot.requiresTakeaway && slot.visualRequirement === 'optional') add(`${p}.requiresTakeaway`, 'Takeaway requirement must match a structured concept');
      } else if (['guided_example', 'prediction', 'student_try', 'feedback_checkpoint'].includes(slot?.type)) {
        seenInteraction = true;
        if (slot.type !== 'guided_example' && (!Array.isArray(slot.answerTypes) || slot.answerTypes.length === 0)) add(`${p}.answerTypes`, 'Interactive slot needs answer types');
      } else add(`${p}.type`, 'Unsupported block type');
    });
    const mastery = level.masterySlot;
    masterySlotCount += mastery ? 1 : 0;
    if (!mastery) add(`${path}.masterySlot`, 'Missing mastery slot');
    else {
      slotCount++;
      if (mastery.slotId && allSlotIds.has(mastery.slotId)) add(`${path}.masterySlot.slotId`, 'Duplicate slot ID');
      else if (mastery.slotId) allSlotIds.add(mastery.slotId);
      if (mastery.placement !== 'after_sequence') add(`${path}.masterySlot.placement`, 'Mastery must be after sequence');
      if (!Number.isInteger(mastery.questionCount?.min) || !Number.isInteger(mastery.questionCount?.max) || mastery.questionCount.min < 1 || mastery.questionCount.max > 4 || mastery.questionCount.min > mastery.questionCount.max) add(`${path}.masterySlot.questionCount`, 'Invalid mastery question bounds');
      const covered = new Set(mastery.objectiveIds ?? []);
      for (const objectiveId of level.objectiveIds ?? []) if (!covered.has(objectiveId)) add(`${path}.masterySlot.objectiveIds`, `Mastery does not cover ${objectiveId}`);
    }
  });
  const metrics: BlueprintMetricSnapshot = { blueprint_valid: issues.length === 0, blueprint_errors: issues.length, slot_count: slotCount, visual_required_count: visualRequiredCount, prerequisite_slot_count: prerequisiteSlotCount, mastery_slot_count: masterySlotCount };
  return issues.length ? { success: false, issues, metrics } : { success: true, metrics };
}

export function blueprintMetrics(blueprint: LessonBlueprint, validation: ReturnType<typeof validateLessonBlueprint>): BlueprintMetricSnapshot {
  return validation.metrics;
}
