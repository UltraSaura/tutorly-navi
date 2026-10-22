import { ANSWER_TYPE_VALUES, validateLessonV21 } from './lesson-v21-contract.ts';
import { pedagogicalIssues, PEDAGOGICAL_CONCEPT_MAX_WORDS, PEDAGOGICAL_TAKEAWAY_MAX_WORDS } from './pedagogical-quality.ts';
import { geometryVisualDataErrors } from './geometry-visual-contract.ts';
import { parseProviderJsonSafely } from './provider-json.ts';

export type StagingLevelMetadata = {
  id: string;
  level_number: number;
  title: string;
  purpose: string;
  difficulty: string;
  objective_ids: string[];
  required_geometry_kinds: string[];
};

export type StagingLevelProgress = {
  level: number;
  status: 'complete' | 'failed';
  providerCalls: number;
  tokenUsage: { promptTokens: number; completionTokens: number; totalTokens: number };
  build?: string;
  promptVersion?: string;
  requestId?: string;
  validation?: StagingValidationSummary;
  diagnostics?: string[];
};

export type StagingDraftResponse = {
  success: true;
  ok: true;
  requestId: string;
  mode: 'staging_draft';
  topic_id: string;
  lesson_content: Record<string, unknown>;
  canonicalValid: boolean;
  pedagogicalValid: boolean;
  prerequisiteValid: boolean;
  geometryValid: boolean;
  interactionValid: boolean;
  validation: StagingValidationSummary;
  providerCalls: number;
  build: string;
  promptVersion: string;
  progress: StagingLevelProgress[];
  levelResults?: StagingLevelProgress[];
};

export type StagingValidation = {
  canonicalIssues: Array<{ path: string; message: string }>;
  pedagogicalIssues: Array<{ path: string; message: string }>;
  geometryIssues: Array<{ path: string; message: string }>;
};

export type StagingValidationSummary = {
  canonicalValid: boolean;
  pedagogicalValid: boolean;
  prerequisiteValid: boolean;
  geometryValid: boolean;
  interactionValid: boolean;
  canonicalIssues: Array<{ path: string; message: string }>;
  pedagogicalIssues: Array<{ path: string; message: string }>;
  prerequisiteIssues: Array<{ path: string; message: string }>;
  geometryIssues: Array<{ path: string; message: string }>;
  interactionIssues: Array<{ path: string; message: string }>;
  diagnostics: string[];
};

export const STAGING_SEQUENCE_BLOCK_TYPES = ['concept', 'concept', 'guided_example', 'student_try', 'mastery_check'] as const;
export const STAGING_INTERACTIVE_TYPES = ['prediction', 'student_try', 'feedback_checkpoint'] as const;

export class StagingLevelContractError extends Error {
  constructor(public readonly issues: Array<{ path: string; message: string }>) {
    super('staging_level_contract_failed: ' + issues.map((issue) => issue.path + ': ' + issue.message).join('; '));
    this.name = 'StagingLevelContractError';
  }
}

function validationCategory(issues: Array<{ path: string; message: string }>): string {
  if (issues.some((issue) => /visual\.data|visual|geometry|clock|timeline|unit conversion/i.test(`${issue.path} ${issue.message}`))) return 'geometry';
  if (issues.some((issue) => /prerequisite/i.test(`${issue.path} ${issue.message}`))) return 'prerequisite';
  if (issues.some((issue) => /answer_type|correct_answer|interaction|mastery/i.test(`${issue.path} ${issue.message}`))) return 'interaction';
  if (issues.some((issue) => /takeaway|key_points|content|pedagogical/i.test(`${issue.path} ${issue.message}`))) return 'pedagogical';
  return 'canonical';
}

export function stagingValidationFailure(level: number, issues: Array<{ path: string; message: string }>, providerCalls: number) {
  return {
    code: 'staging_level_validation_failed',
    level,
    stage: 'level_validation',
    validationCategory: validationCategory(issues),
    technicalDetail: issues.map((issue) => issue.path + ': ' + issue.message).join('; '),
    providerCalls,
  };
}

const object = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;

export const STAGING_LEVEL_COUNT = 4;
export const STAGING_LEVEL_MAX_TOKENS = 3600;
export const STAGING_PROMPT_VERSION = 'staging-v21-prerequisite-contract-v2';

const nonEmpty = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

function requiredStagingField(value: Record<string, unknown>, path: string, field: string, issues: Array<{ path: string; message: string }>) {
  if (!nonEmpty(value[field])) issues.push({ path: `${path}.${field}`, message: 'Required non-empty string' });
}

function requiredStagingKeyPoints(value: Record<string, unknown>, path: string, issues: Array<{ path: string; message: string }>) {
  if (!Array.isArray(value.key_points) || value.key_points.length < 2 || value.key_points.length > 3) {
    issues.push({ path: `${path}.key_points`, message: 'Expected 2–3 concise factual key point objects' });
    return;
  }
  value.key_points.forEach((point, index) => {
    const pointPath = `${path}.key_points[${index}]`;
    const item = object(point);
    if (!item) {
      issues.push({ path: pointPath, message: 'Expected object with label and text' });
      return;
    }
    requiredStagingField(item, pointPath, 'label', issues);
    requiredStagingField(item, pointPath, 'text', issues);
  });
}

function requiredStagingMastery(value: Record<string, unknown>, issues: Array<{ path: string; message: string }>) {
  const mastery = object(value.mastery);
  if (!mastery) {
    issues.push({ path: 'mastery', message: 'Expected object' });
    return;
  }
  if (!Array.isArray(mastery.skills) || mastery.skills.some((skill) => !nonEmpty(skill))) {
    issues.push({ path: 'mastery.skills', message: 'Expected array of non-empty strings' });
  }
  if (typeof mastery.threshold !== 'number' || !Number.isFinite(mastery.threshold) || mastery.threshold < 0 || mastery.threshold > 1) {
    issues.push({ path: 'mastery.threshold', message: 'Expected number between 0 and 1' });
  }
}

function requiredStagingPrerequisites(value: Record<string, unknown>, issues: Array<{ path: string; message: string }>) {
  if (!Array.isArray(value.prerequisites)) return;
  value.prerequisites.forEach((raw, index) => {
    const path = `prerequisites[${index}]`;
    const prerequisite = object(raw);
    if (!prerequisite) { issues.push({ path, message: 'Expected object' }); return; }
    const type = prerequisite.type;
    for (const field of ['id', 'description', 'prompt', 'remediation_hint']) {
      if (!nonEmpty(prerequisite[field])) issues.push({ path: `${path}.${field}`, message: 'Required non-empty string' });
    }
    if (prerequisite.check_question !== undefined || prerequisite.answer_type !== undefined) {
      issues.push({ path, message: 'Legacy prerequisite format rejected; use type, prompt, and expected_answer.' });
    }
    if (!ANSWER_TYPE_VALUES.includes(String(type) as typeof ANSWER_TYPE_VALUES[number])) {
      issues.push({ path: `${path}.type`, message: `Expected one of ${ANSWER_TYPE_VALUES.join(', ')}` });
    }
    if (prerequisite.expected_answer === undefined) issues.push({ path: `${path}.expected_answer`, message: 'Required value' });
    if (type === 'numeric' && (typeof prerequisite.expected_answer !== 'number' || !Number.isFinite(prerequisite.expected_answer))) {
      issues.push({ path: `${path}.expected_answer`, message: 'Numeric prerequisite requires a numeric expected answer' });
    }
    if (['multiple_choice', 'selection'].includes(String(type))) {
      if (!Array.isArray(prerequisite.choices) || prerequisite.choices.length < 2 || prerequisite.choices.some((choice) => !nonEmpty(choice))) {
        issues.push({ path: `${path}.choices`, message: 'Choice prerequisite requires at least two non-empty choices' });
      } else if (!prerequisite.choices.some((choice) => String(choice).trim() === String(prerequisite.expected_answer ?? '').trim())) {
        issues.push({ path: `${path}.expected_answer`, message: 'Expected answer must exactly match one choice' });
      }
    }
  });
}

/** The provider-facing level contract. It is intentionally stricter than the
 * general V2.1 envelope: no block IDs/types/content may be compiler-filled. */
export function stagingSequenceContractIssues(lesson: Record<string, unknown>, metadata: StagingLevelMetadata): Array<{ path: string; message: string }> {
  const issues: Array<{ path: string; message: string }> = [];
  const sequence = lesson.sequence;
  if (!Array.isArray(sequence) || sequence.length !== STAGING_SEQUENCE_BLOCK_TYPES.length) {
    issues.push({ path: 'sequence', message: `Expected exactly ${STAGING_SEQUENCE_BLOCK_TYPES.length} typed blocks.` });
    return issues;
  }
  sequence.forEach((raw, index) => {
    const path = `sequence[${index}]`;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      issues.push({ path, message: 'Expected object' });
      return;
    }
    const block = raw as Record<string, unknown>;
    requiredStagingField(block, path, 'id', issues);
    requiredStagingField(block, path, 'type', issues);
    requiredStagingField(block, path, 'content', issues);
    const expectedType = STAGING_SEQUENCE_BLOCK_TYPES[index];
    if (nonEmpty(block.type) && block.type !== expectedType) issues.push({ path: `${path}.type`, message: `Expected staged block type ${expectedType}.` });
    if (block.type === 'concept') {
      requiredStagingField(block, path, 'title', issues);
      requiredStagingKeyPoints(block, path, issues);
      requiredStagingField(block, path, 'takeaway', issues);
      if (typeof block.content === 'string' && block.content.trim().split(/\s+/).length > PEDAGOGICAL_CONCEPT_MAX_WORDS) {
        issues.push({ path: `${path}.content`, message: `Expected at most ${PEDAGOGICAL_CONCEPT_MAX_WORDS} words for a structured concept` });
      }
      if (typeof block.takeaway === 'string' && block.takeaway.trim().split(/\s+/).length > PEDAGOGICAL_TAKEAWAY_MAX_WORDS) {
        issues.push({ path: `${path}.takeaway`, message: `Expected at most ${PEDAGOGICAL_TAKEAWAY_MAX_WORDS} words` });
      }
    }
    if (block.type === 'guided_example') {
      requiredStagingField(block, path, 'context', issues);
      if (!Array.isArray(block.steps) || block.steps.length < 1) issues.push({ path: `${path}.steps`, message: 'Expected non-empty array' });
    }
    if (block.type === 'student_try') {
      ['question', 'answer_type', 'success_feedback', 'error_feedback'].forEach((field) => requiredStagingField(block, path, field, issues));
      if (block.correct_answer === undefined) issues.push({ path: `${path}.correct_answer`, message: 'Required value' });
    }
    if (block.type === 'mastery_check') {
      if (!Array.isArray(block.questions) || block.questions.length < 1 || block.questions.length > 4) issues.push({ path: `${path}.questions`, message: 'Expected 1–4 questions' });
    }
  });
  const masteryIndex = sequence.findIndex((block) => block && typeof block === 'object' && !Array.isArray(block) && (block as Record<string, unknown>).type === 'mastery_check');
  const interactionIndex = sequence.findIndex((block) => block && typeof block === 'object' && !Array.isArray(block) && STAGING_INTERACTIVE_TYPES.includes(String((block as Record<string, unknown>).type) as typeof STAGING_INTERACTIVE_TYPES[number]));
  if (masteryIndex >= 0 && (interactionIndex < 0 || interactionIndex > masteryIndex)) issues.push({ path: 'sequence', message: 'Required interaction before mastery.' });
  if (metadata.level_number === 1) {
    const conceptsWithVisual = sequence.filter((block) => block && typeof block === 'object' && !Array.isArray(block) && (block as Record<string, unknown>).type === 'concept' && (block as Record<string, unknown>).visual);
    if (conceptsWithVisual.length < 2) issues.push({ path: 'sequence', message: 'Level 1 requires visual concept blocks for rectangle and triangle.' });
  }
  requiredStagingMastery(lesson, issues);
  requiredStagingPrerequisites(lesson, issues);
  return issues;
}

export function stagingTokenUsage(providerMetadata: { finishReason?: string; promptTokens?: number; completionTokens?: number; totalTokens?: number } | null): { promptTokens: number; completionTokens: number; totalTokens: number } {
  if (providerMetadata?.finishReason === 'length') {
    throw new Error('staging_level_provider_output_truncated: finish_reason=length; maxTokens=' + STAGING_LEVEL_MAX_TOKENS + '; completionTokens=' + Number(providerMetadata.completionTokens ?? 0));
  }
  return {
    promptTokens: Number(providerMetadata?.promptTokens ?? 0),
    completionTokens: Number(providerMetadata?.completionTokens ?? 0),
    totalTokens: Number(providerMetadata?.totalTokens ?? 0),
  };
}

function isTimeTopic(topicName: string, objectiveText = ''): boolean {
  return /dur[ée]e|temps|heure|horloge|aiguille|minute|seconde|jour|semaine|mois|ann[ée]e|conversion|unit[ée]s? de dur[ée]e/i.test(`${topicName} ${objectiveText}`);
}

export function stagingLevelMetadata(topicId: string, topicName: string, objectiveIds: string[], objectiveText = ''): StagingLevelMetadata[] {
  if (isTimeTopic(topicName, objectiveText)) {
    return [
      { id: topicId + '-level-1', level_number: 1, title: 'Comprendre les unités de durée', purpose: 'Comparer les unités de temps et leur ordre.', difficulty: 'foundation', objective_ids: objectiveIds, required_geometry_kinds: ['unit_conversion', 'timeline'] },
      { id: topicId + '-level-2', level_number: 2, title: 'Lire l’heure et calculer des durées', purpose: 'Lire une horloge et relier une heure à une durée.', difficulty: 'foundation', objective_ids: objectiveIds, required_geometry_kinds: ['clock', 'timeline'] },
      { id: topicId + '-level-3', level_number: 3, title: 'Convertir des durées', purpose: 'Choisir une unité et effectuer une conversion.', difficulty: 'application', objective_ids: objectiveIds, required_geometry_kinds: ['unit_conversion', 'timeline'] },
      { id: topicId + '-level-4', level_number: 4, title: 'Résoudre des problèmes de durée', purpose: 'Résoudre une situation de durée en justifiant ses choix.', difficulty: 'transfer', objective_ids: objectiveIds, required_geometry_kinds: ['clock', 'unit_conversion'] },
    ];
  }
  return [
    { id: topicId + '-level-1', level_number: 1, title: 'Découvrir les figures', purpose: 'Reconnaître les éléments des figures planes.', difficulty: 'foundation', objective_ids: objectiveIds, required_geometry_kinds: ['rectangle', 'triangle'] },
    { id: topicId + '-level-2', level_number: 2, title: 'Décrire cercle et angle', purpose: 'Décrire un cercle et un angle avec leurs mesures.', difficulty: 'foundation', objective_ids: objectiveIds, required_geometry_kinds: ['circle', 'angle'] },
    { id: topicId + '-level-3', level_number: 3, title: 'Construire une symétrie', purpose: 'Utiliser un axe et un quadrillage pour vérifier une symétrie.', difficulty: 'application', objective_ids: objectiveIds, required_geometry_kinds: ['symmetry'] },
    { id: topicId + '-level-4', level_number: 4, title: 'Mobiliser les propriétés', purpose: 'Résoudre une situation de ' + topicName.toLocaleLowerCase() + ' en justifiant ses choix.', difficulty: 'transfer', objective_ids: objectiveIds, required_geometry_kinds: [] },
  ];
}

type ConceptExample = Record<string, unknown> & { visual: { kind: string; purpose: string; alt_text: string; data: Record<string, unknown> } };

/** Canonical drawable-visual concept examples. Each one must pass the real
 * staging validators (see staging-prompt-consistency.test.ts); the prompt
 * embeds them verbatim so the provider sees exactly the accepted shapes. */
export const STAGING_VISUAL_EXAMPLES: Record<'rectangle' | 'triangle' | 'circle' | 'angle' | 'symmetry' | 'clock' | 'timeline' | 'unit_conversion', ConceptExample> = {
  rectangle: { id: 'rectangle-concept', type: 'concept', title: 'Rectangle ABCD', content: 'Un rectangle est un quadrilatère qui possède quatre angles droits. Ses côtés opposés ont la même longueur.', key_points: [{ label: 'Forme', text: 'La figure possède quatre côtés.' }, { label: 'Angles', text: 'Chaque coin forme un angle droit.' }], takeaway: 'Astuce : pense à une porte.', visual: { kind: 'rectangle', purpose: 'Nommer les sommets et les côtés.', alt_text: 'Rectangle ABCD dessiné avec quatre sommets étiquetés.', data: { shape: 'rectangle', vertices: [{ x: 45, y: 45, label: 'A' }, { x: 255, y: 45, label: 'B' }, { x: 255, y: 155, label: 'C' }, { x: 45, y: 155, label: 'D' }], side_labels: [{ from: 'A', to: 'B', label: 'AB' }, { from: 'B', to: 'C', label: 'BC' }, { from: 'C', to: 'D', label: 'CD' }, { from: 'D', to: 'A', label: 'DA' }] } } },
  triangle: { id: 'triangle-concept', type: 'concept', title: 'Triangle ABC', content: 'Un triangle est un polygone formé de trois côtés et de trois sommets.', key_points: [{ label: 'Côtés', text: 'Trois segments ferment cette figure.' }, { label: 'Sommets', text: 'Chaque jonction constitue un sommet.' }], takeaway: 'Astuce : un doigt par coin.', visual: { kind: 'polygon', purpose: 'Nommer les côtés du triangle.', alt_text: 'Triangle ABC dessiné avec trois sommets étiquetés.', data: { shape: 'triangle', vertices: [{ x: 60, y: 150, label: 'A' }, { x: 150, y: 30, label: 'B' }, { x: 240, y: 150, label: 'C' }], side_labels: [{ from: 'A', to: 'B', label: 'AB' }, { from: 'B', to: 'C', label: 'BC' }, { from: 'C', to: 'A', label: 'CA' }] } } },
  circle: { id: 'circle-concept', type: 'concept', title: 'Cercle de centre O', content: 'Tous les points d’un cercle sont à la même distance du centre O. Le diamètre mesure deux rayons.', key_points: [{ label: 'Rayon', text: 'Un rayon rejoint le bord.' }, { label: 'Diamètre', text: 'Un diamètre traverse le milieu.' }], takeaway: 'Astuce : pense à une roue de vélo.', visual: { kind: 'circle', purpose: 'Montrer le centre, le rayon et le diamètre.', alt_text: 'Cercle de centre O avec un rayon de 3 cm et un diamètre de 6 cm.', data: { center: { x: 150, y: 100, label: 'O' }, radius: 3, diameter: 6, unit: 'cm' } } },
  angle: { id: 'angle-concept', type: 'concept', title: 'Angle de sommet O', content: 'Un angle est formé par deux demi-droites qui partent du même sommet O. On le mesure en degrés.', key_points: [{ label: 'Sommet', text: 'O désigne le sommet commun.' }, { label: 'Mesure', text: 'Le degré quantifie cette ouverture.' }], takeaway: 'Astuce : pense aux aiguilles d’une horloge.', visual: { kind: 'angle', purpose: 'Montrer le sommet, les deux côtés et la mesure.', alt_text: 'Angle AOB de 45 degrés de sommet O.', data: { vertex: { x: 100, y: 150, label: 'O' }, rays: [{ x: 250, y: 150, label: 'A' }, { x: 206, y: 44, label: 'B' }], degrees: 45 } } },
  symmetry: { id: 'symmetry-concept', type: 'concept', title: 'Symétrie axiale', content: 'Une figure et son image symétrique se correspondent de part et d’autre d’un axe vertical.', key_points: [{ label: 'Repère', text: 'L’axe sépare les deux images.' }, { label: 'Correspondance', text: 'Les points correspondants restent équidistants.' }], takeaway: 'Astuce : pense aux ailes d’un papillon.', visual: { kind: 'symmetry', purpose: 'Comparer une figure et sa symétrique sur quadrillage.', alt_text: 'Triangle et son symétrique par rapport à un axe vertical sur un quadrillage de 10 sur 8.', data: { axis: { x: 5 }, grid: { width: 10, height: 8 }, figure: [{ x: 2, y: 2 }, { x: 4, y: 2 }, { x: 4, y: 5 }], symmetric_figure: [{ x: 8, y: 2 }, { x: 6, y: 2 }, { x: 6, y: 5 }] } } },
  clock: { id: 'clock-concept', type: 'concept', title: 'Lire une horloge', content: 'Une horloge indique une heure grâce à ses aiguilles. La petite aiguille montre les heures et la grande les minutes.', key_points: [{ label: 'Heures', text: 'La petite aiguille indique les heures.' }, { label: 'Minutes', text: 'La grande aiguille indique les minutes.' }], takeaway: 'Astuce : observe le cadran avant d’agir.', visual: { kind: 'clock', purpose: 'Lire une heure précise sur un cadran.', alt_text: 'Horloge indiquant 3 heures et 15 minutes.', data: { hour: 3, minute: 15 } } },
  timeline: { id: 'timeline-concept', type: 'concept', title: 'Ordre des unités', content: 'Les unités de durée se suivent de la seconde au jour. Une frise aide à comparer leur ordre.', key_points: [{ label: 'Ordre', text: 'Une minute contient soixante secondes.' }, { label: 'Repère', text: 'Une heure contient soixante minutes.' }], takeaway: 'Astuce : ordonne les cartes avant d’agir.', visual: { kind: 'timeline', purpose: 'Comparer l’ordre des unités de durée.', alt_text: 'Frise des unités seconde, minute et heure.', data: { units: ['seconde', 'minute', 'heure'] } } },
  unit_conversion: { id: 'unit-conversion-concept', type: 'concept', title: 'Convertir une durée', content: 'Pour convertir une durée, on relie les unités par leur facteur. Une minute correspond à 60 secondes.', key_points: [{ label: 'Facteur', text: 'Une minute vaut soixante secondes.' }, { label: 'Sens', text: 'Multiplier donne davantage de secondes.' }], takeaway: 'Astuce : choisis avant d’agir.', visual: { kind: 'unit_conversion', purpose: 'Montrer le facteur entre minute et seconde.', alt_text: 'Conversion d’une minute en secondes.', data: { from: 'minute', to: 'seconde', factor: 60 } } },
};

export const STAGING_ALL_GEOMETRY_KINDS = ['rectangle', 'triangle', 'circle', 'angle', 'symmetry'] as const;

/** Visual kinds the prompt demands for each level. Level 4 has no fixed kind
 * but still must draw every concept, because pedagogical validation requires
 * a figure for any geometric concept. */
export function stagingPromptVisualKinds(metadata: StagingLevelMetadata): string[] {
  return metadata.required_geometry_kinds.length > 0 ? metadata.required_geometry_kinds : [...STAGING_ALL_GEOMETRY_KINDS];
}

/** Numeric prerequisite shown to the provider (validated in tests). */
export const STAGING_NUMERIC_PREREQUISITE_EXAMPLE = { id: 'p-angle-droit', description: 'Connaître la mesure d’un angle droit', type: 'numeric', prompt: 'Combien de degrés mesure un angle droit ?', expected_answer: 90, remediation_hint: 'Un angle droit correspond à un quart de tour.' };

/** Multiple-choice prerequisite shown to the provider (validated in tests). */
export const STAGING_CHOICE_PREREQUISITE_EXAMPLE = { id: 'p-axe', description: 'Reconnaître un axe de symétrie', type: 'multiple_choice', prompt: 'Quelle ligne partage une figure en deux moitiés superposables ?', choices: ['Un axe de symétrie', 'Une diagonale quelconque', 'Un rayon'], expected_answer: 'Un axe de symétrie', remediation_hint: 'Pense au pliage : les deux moitiés se recouvrent.' };

export const PREREQUISITE_ANSWER_RULE = 'expected_answer est OBLIGATOIRE dans CHAQUE prerequisite, quel que soit son type: ne l’omets jamais, ne le remplace jamais par correct_answer ou answer (ces champs sont ignorés et la leçon est rejetée), et ne l’infère pas dans le normalizer. Prerequisite numérique: type:"numeric", prompt et expected_answer numérique (ex. 12 ou 90). Prerequisite à choix (type "multiple_choice" ou "selection"): choices = au moins 2 chaînes, et expected_answer = la COPIE EXACTE, caractère pour caractère, de l’un des choices (jamais une lettre "A"/"B", un index, une reformulation ou une réponse absente des choices). Question de reconnaissance (le prompt contient « reconnaître », « identifier », « quelle forme » ou « aiguille »): type OBLIGATOIRE "multiple_choice" (ou "selection"/"short_text"), JAMAIS "numeric" ni "time"; ex. {"type":"multiple_choice","prompt":"Quelle forme a trois côtés ?","choices":["Le triangle","Le carré","Le cercle"],"expected_answer":"Le triangle"}. Une question numeric demande un nombre (« Combien… ? ») et n’emploie aucun de ces mots: écris « Combien de sommets a un triangle ? », jamais « Comment reconnaître un triangle : combien de sommets ? ». Relis chaque prerequisite avant de répondre: expected_answer présent, pour un choix présent mot pour mot dans choices, et aucun mot de reconnaissance dans un prompt numeric ou time.';

export const TAKEAWAY_RULE = "Le takeaway est une action-mémoire très courte pour l’élève: 8 mots maximum, sous la forme « Astuce : pense à … » avec une image ou un objet du quotidien (porte, roue, papillon, horloge, main). RÈGLE ZÉRO RÉPÉTITION: il ne reformule ni le content ni les key_points et ne réutilise AUCUN mot important (4 lettres ou plus) du content, du title ou des key_points, même conjugué ou au pluriel. Interdit: les étapes de la méthode, les mots de la notion (figure, symétrique, axe, plier, pliage, côté, sommet, angle, rayon, carreaux, compter, reporter, vérifier) et la copie d’un exemple. Exemples REJETÉS: « Je compte les carreaux jusqu’à l’axe puis je reporte de l’autre côté », « Astuce : je compte et je reporte », « Si je plie la figure le long de l’axe, les bords coïncident : elle est symétrique », « Pour reconnaître un triangle, je compte ses trois sommets et ses trois côtés ». Relis chaque concept avant de répondre: si un mot du takeaway apparaît dans le content ou les key_points, remplace-le.";
export const CONCEPT_LENGTH_RULE = 'Le content de chaque concept compte au plus 40 mots (limite stricte 55, au-delà la leçon est rejetée): 1 à 3 phrases courtes. Les détails vont dans key_points, le visual ou un autre concept, jamais dans un long paragraphe.';
export const KEY_POINT_RULE = 'Chaque concept contient exactement 2 ou 3 objets {label:string,text:string}. label nomme brièvement l’idée; text est une phrase complète, courte et porteuse de sens, jamais un mot isolé, un tableau de mots ou un label répété. Chaque phrase exprime un fait pertinent pour le content, sans copier une phrase entière de l’explication. Garde au plus 5 mots importants par label + text; les unités de temps et mots de liaison peuvent naturellement revenir. Les points apportent au moins deux idées réellement différentes, pas deux formulations du même fait. Comparer les text après normalisation (minuscules, accents et ponctuation retirés): aucune paire identique ou quasi identique, même avec des labels différents. REJETÉ: [{"label":"A","text":"multiplier"},{"label":"B","text":"Multiplier !"}]. Pour une conversion, distinguer par exemple le facteur entre unités et le sens de conversion. Relis les phrases avant de retourner le JSON: phrases complètes, lien avec le concept, faits distincts, aucun doublon normalisé. Cette relecture fait partie de la réponse initiale, sans appel supplémentaire.';
export const CLOCK_VISUAL_RULE = 'Pour chaque visual de kind "clock", visual.data.hour doit être un entier JavaScript compris entre 1 et 12 inclus, et visual.data.minute doit être un entier JavaScript compris entre 0 et 59 inclus. Les décimaux, chaînes, valeurs nulles, valeurs manquantes et valeurs hors limites sont interdits et rejetés: ne les arrondis, ne les bloques et ne les inventes jamais. Exemple valide: {"kind":"clock","data":{"hour":3,"minute":15}}.';

/** Complete, valid example level used in the prompt (validated in tests). */
export function stagingFullLevelExample(metadata: StagingLevelMetadata): Record<string, unknown> {
  const kinds = stagingPromptVisualKinds(metadata);
  const first = STAGING_VISUAL_EXAMPLES[(kinds[0] ?? 'rectangle') as keyof typeof STAGING_VISUAL_EXAMPLES];
  const second = STAGING_VISUAL_EXAMPLES[(kinds[1] ?? kinds[0] ?? 'triangle') as keyof typeof STAGING_VISUAL_EXAMPLES];
  return {
    lesson_goal: 'Reconnaître et décrire une figure plane.',
    success_criteria: ['Je sais nommer les éléments de la figure.'],
    prerequisites: metadata.level_number === 1 ? [] : [STAGING_NUMERIC_PREREQUISITE_EXAMPLE, STAGING_CHOICE_PREREQUISITE_EXAMPLE],
    sequence: [
      { ...first, id: 'c1' },
      { ...second, id: 'c2' },
      { id: 'g1', type: 'guided_example', content: 'Je lis les lettres de la figure puis je vérifie la propriété avec un instrument.', context: 'Vérifier une propriété sur une figure.', steps: [{ instruction: 'Je repère les éléments nommés.', reason: 'Les lettres désignent les sommets.' }] },
      { id: 's1', type: 'student_try', content: 'À toi: compte les sommets.', question: 'Combien de sommets possède un triangle ?', answer_type: 'numeric', correct_answer: 3, success_feedback: 'Oui, trois sommets.', error_feedback: 'Compte les points nommés par une lettre.' },
      { id: 'm1', type: 'mastery_check', content: 'Vérifie ta compréhension.', questions: [{ id: 'q1', question: 'Combien d’angles droits possède un rectangle ?', answer_type: 'numeric', correct_answer: 4, skill: 'figures_planes', difficulty: 1, success_feedback: 'Exact.', error_feedback: 'Compte les coins droits.' }] },
    ],
    misconceptions: [],
    mastery: { skills: ['figures planes', 'propriétés'], threshold: 0.8 },
  };
}

const VISUAL_FIELD_RULES = [
  'Champs exacts exigés par le validateur pour visual.data:',
  '- rectangle: kind "rectangle", data.shape "rectangle", data.vertices = exactement 4 objets {x:number,y:number,label:string}, data.side_labels = 4 objets {from,to,label}.',
  '- triangle: kind "polygon", data.shape "triangle", data.vertices = exactement 3 objets {x,y,label}, data.side_labels = 3 objets {from,to,label}.',
  '- circle: kind "circle", data.center = {x:number,y:number,label}, data.radius = nombre > 0 ET data.diameter = nombre > 0 (diamètre = 2 × rayon).',
  '- angle: kind "angle", data.vertex = {x:number,y:number,label}, data.rays = tableau de EXACTEMENT 2 points {x:number,y:number,label} (jamais ray1/ray2, jamais des objets sans x/y), data.degrees = nombre entre 1 et 360 (ou data.rightAngle = true).',
  '- symmetry: kind "symmetry", data.axis = {x:number} pour un axe vertical ou {y:number} pour un axe horizontal (jamais {x1,y1,x2,y2}), data.grid = {width:number,height:number}, data.figure = tableau d\'AU MOINS 2 points {x,y} (jamais un seul point), data.symmetric_figure = tableau d\'AU MOINS 2 points {x,y} (images exactes par la symétrie). MÊME si la leçon parle du symétrique d\'UN point, dessine un segment ou un triangle (2 à 3 points) : un tableau d\'un seul point est INTERDIT et rejeté. Interdit : "figure":[{"x":2,"y":3}]. Correct : "figure":[{"x":2,"y":3},{"x":3,"y":5}], "symmetric_figure":[{"x":8,"y":3},{"x":7,"y":5}] avec axis {x:5}. Compte les points de figure et symmetric_figure avant de répondre (≥ 2 chacun, même nombre).',
  'N’ajoute width/height à une figure que si leurs proportions sont cohérentes avec les coordonnées.',
].join('\n');

export function stagingLevelPrompt(topicName: string, grade: string, language: string, metadata: StagingLevelMetadata, objectiveText: string): string {
  const kinds = stagingPromptVisualKinds(metadata);
  const required = metadata.required_geometry_kinds.length > 0
    ? 'Visuels obligatoires dans ce niveau: ' + metadata.required_geometry_kinds.join(', ') + '. Chaque bloc concept DOIT contenir un visual dessinable complet.'
    : 'Chaque bloc concept DOIT contenir un visual dessinable complet, choisi parmi: ' + kinds.join(', ') + '. Un concept sans figure est refusé.';
  const examples = kinds.map((kind) => 'Exemple de bloc conceptuel ' + kind + ' valide: ' + JSON.stringify(STAGING_VISUAL_EXAMPLES[kind as keyof typeof STAGING_VISUAL_EXAMPLES]));
  const levelOneGeometryCoverage = metadata.level_number === 1
    && metadata.required_geometry_kinds.includes('rectangle')
    && metadata.required_geometry_kinds.includes('triangle')
    ? 'NIVEAU 1 GÉOMÉTRIE — couverture obligatoire, pas un choix entre figures: sequence[0] est un concept avec visual.kind="rectangle" et quatre sommets étiquetés; sequence[1] est un AUTRE concept avec visual.kind="polygon", visual.data.shape="triangle", exactement trois sommets {x:number,y:number,label:string} et trois side_labels {from,to,label}. Les deux figures sont exigées dans CE niveau. Deux rectangles, un carré ou la simple mention du triangle dans le texte, une question ou alt_text ne remplacent pas le dessin du triangle. Utilise le bloc triangle complet de l’exemple ci-dessous comme contrat de structure, avec des données cohérentes avec ton explication. Avant de terminer la réponse initiale, vérifie que les deux visual.data sont complets et que le triangle porte bien data.shape="triangle"; aucun dessin manquant ne sera ajouté après la réponse, aucun autre niveau ne compense cette omission.'
    : '';
  return [
    'LESSON GENERATOR V2.1 — STAGING LEVEL ' + metadata.level_number + '/4 — PROMPT ' + STAGING_PROMPT_VERSION,
    'Sujet: ' + topicName + '; niveau scolaire: ' + grade + '; langue: ' + language + '.',
    'But de ce niveau: ' + metadata.purpose,
    'Objectifs autorisés: ' + (objectiveText || 'aucun objectif précisé'),
    required,
    levelOneGeometryCoverage,
    'Retourne UNIQUEMENT le JSON direct de CE niveau, jamais de wrapper, jamais les autres niveaux.',
    'Le JSON doit contenir lesson_goal, success_criteria, prerequisites, sequence, misconceptions et mastery.',
    'sequence doit contenir exactement cinq blocs, dans cet ordre et avec ces types: concept, concept, guided_example, student_try, mastery_check.',
    'Chaque bloc doit contenir son propre id non vide, type canonique et content: une chaîne destinée à l’élève, non vide après trim. Aucun bloc ne peut contenir uniquement des métadonnées, une question ou des réponses sans content. Ne laisse jamais le compilateur inventer un id, un type ou du contenu.',
    CONCEPT_LENGTH_RULE,
    KEY_POINT_RULE,
    TAKEAWAY_RULE,
    PREREQUISITE_ANSWER_RULE,
    CLOCK_VISUAL_RULE,
    `Le content du concept explique progressivement le concept mathématique en 1 à 3 phrases courtes et en ${PEDAGOGICAL_CONCEPT_MAX_WORDS} mots maximum (limite exacte du validateur pour un concept structuré); key_points contient 2 ou 3 rappels factuels courts, sous forme de phrases complètes, pertinentes et distinctes (jamais des mots isolés); takeaway donne une méthode pratique, une vérification ou une action à faire par l’élève en ${PEDAGOGICAL_TAKEAWAY_MAX_WORDS} mots maximum. Le takeaway ne doit jamais reformuler le content ou les key_points: emploie une formulation différente et centre-toi sur ce que l’élève doit faire. Le content de guided_example explique un exemple résolu de façon concise mais complète; celui de student_try demande une action à l’élève avec une consigne et un feedback concis; celui de mastery_check vérifie sa compréhension avec des questions complètes et concises. Tous les cinq blocs doivent avoir un content réaliste en français.`,
    `Les concepts exigent title, key_points (exactement 2 ou 3 objets {label, text}, rappels factuels courts et distincts, pas une phrase copiée du content), takeaway actionnable de ${PEDAGOGICAL_TAKEAWAY_MAX_WORDS} mots maximum et visual. Tous les blocs interactifs (student_try et les questions de mastery_check) doivent utiliser exactement l’un de ces answer_type: ${ANSWER_TYPE_VALUES.join(', ')}; ne convertis jamais une valeur inconnue. guided_example exige context et steps concis mais complets; student_try exige question, answer_type autorisé, correct_answer, success_feedback et error_feedback concis; mastery_check exige 1 à 4 questions complètes et concises avec answer_type autorisé.`,
    'mastery doit être exactement {"skills":["étiquette courte 1","étiquette courte 2"],"threshold":0.8}: skills est un tableau de chaînes non vides, jamais un tableau d’objets, un objet ou un paragraphe.',
    'prerequisites et misconceptions doivent être des tableaux d’objets complets, jamais des tableaux de chaînes.',
    'Chaque prerequisite numérique doit utiliser exactement type:"numeric", prompt et expected_answer numérique; n’omets jamais expected_answer et ne le remplace jamais par une chaîne. Exemple niveau 2: {"id":"p-angle-droit","description":"Connaître la mesure d’un angle droit","type":"numeric","prompt":"Combien de degrés mesure un angle droit ?","expected_answer":90,"remediation_hint":"Un angle droit correspond à un quart de tour."}',
    'Exemple prerequisite à réponse courte canonique: {"id":"p1","description":"Lire les longueurs","type":"short_text","prompt":"Quel segment mesure 6 cm ?","expected_answer":"AB","remediation_hint":"Repère les lettres des extrémités."}',
    'Exemple misconception valide: {"id":"m1","description":"Confondre rayon et diamètre","detect_if":"L’élève appelle rayon un segment qui traverse le centre","feedback":"Le rayon va du centre au cercle; le diamètre traverse le centre.","remediation_strategy":"Comparer les deux segments sur le dessin."}',
    metadata.level_number === 3
      ? 'Exemples interactifs valides pour la symétrie: student_try {"question":"Quel point est à la même distance de l’axe ?","answer_type":"multiple_choice","choices":["A","B"],"correct_answer":"B","success_feedback":"Oui.","error_feedback":"Compare les carreaux."}; mastery_check question {"id":"q-sym","question":"Explique comment reporter un point.","answer_type":"short_text","correct_answer":"Même nombre de carreaux de l’autre côté","skill":"symétrie","difficulty":1,"success_feedback":"Exact.","error_feedback":"Compte les carreaux."}. '
      : '',
    `answer_type autorisés: ${ANSWER_TYPE_VALUES.join(', ')}.`,
    VISUAL_FIELD_RULES,
    ...examples,
    'Exemple complet des cinq blocs et de mastery.skills (tous les content sont obligatoires): ' + JSON.stringify(stagingFullLevelExample(metadata)),
    'La sequence doit contenir deux explications concises illustrées, un exemple guidé, une question interactive avant mastery_check, un contrôle de compréhension, un takeaway et les métadonnées de maîtrise.',
    levelOneGeometryCoverage,
    'Ne dis jamais «voir la figure». JSON strict, sans Markdown.'
  ].join('\n');
}

export function parseStagingLevelResponse(raw: unknown, metadata?: StagingLevelMetadata): { value: Record<string, unknown>; attemptedRepair: boolean } {
  const parsed = parseProviderJsonSafely(raw);
  if (parsed.ok === false) throw new Error('staging_level_json_parse_failed: ' + parsed.category);
  const value = object(parsed.value);
  if (!value) throw new Error('staging_level_json_parse_failed: response must be an object');
  const level = object(value.lesson) ?? value;
  if (metadata) {
    const contractIssues = stagingSequenceContractIssues(level, metadata);
    if (contractIssues.length > 0) throw new StagingLevelContractError(contractIssues);
  }
  return { value: level, attemptedRepair: parsed.attemptedRepair };
}

function visualGeometryIssues(lesson: Record<string, unknown>): Array<{ path: string; message: string }> {
  const sequence = Array.isArray(lesson.sequence) ? lesson.sequence as Array<Record<string, unknown>> : [];
  return sequence.flatMap((block, index) => {
    const visual = object(block.visual);
    if (!visual) return [];
    const kind = String(visual.kind ?? '');
    const data = object(visual.data);
    const errors = geometryVisualDataErrors(kind, visual.data, 'sequence[' + index + '].visual.data')
      .map((error) => ({ path: error.path, message: error.message }));
    if (data && (kind === 'rectangle' || (kind === 'polygon' && data.shape === 'rectangle'))) {
      const hasSides = (Array.isArray(data.side_labels) && data.side_labels.length >= 4) || (Number.isFinite(Number(data.width)) && Number.isFinite(Number(data.height)));
      if (!hasSides) errors.push({ path: 'sequence[' + index + '].visual.data.side_labels', message: 'Rectangle requires four side labels or numeric width and height.' });
    }
    if (data && (kind === 'triangle' || (kind === 'polygon' && data.shape === 'triangle'))) {
      const hasSides = (Array.isArray(data.side_labels) && data.side_labels.length >= 3) || (Array.isArray(data.side_lengths) && data.side_lengths.length >= 3);
      if (!hasSides) errors.push({ path: 'sequence[' + index + '].visual.data.side_labels', message: 'Triangle requires three side labels or side lengths.' });
    }
    if (data && kind === 'circle') {
      const hasDiameter = (Number.isFinite(Number(data.diameter)) && Number(data.diameter) > 0)
        || object(data.diameterEnd) !== null
        || data.diameter === true;
      if (!hasDiameter) errors.push({ path: 'sequence[' + index + '].visual.data.diameter', message: 'Circle requires explicit diameter data.' });
    }
    if (data && (kind === 'rectangle' || (kind === 'polygon' && data.shape === 'rectangle') || (kind === 'triangle' || (kind === 'polygon' && data.shape === 'triangle')))) {
      const expectedVertices = kind === 'rectangle' || data.shape === 'rectangle' ? 4 : 3;
      const vertices = Array.isArray(data.vertices) ? data.vertices : Array.isArray(data.points) ? data.points : [];
      if (vertices.length !== expectedVertices || vertices.some((point) => !object(point) || !Number.isFinite(Number(point.x)) || !Number.isFinite(Number(point.y)) || !nonEmpty(point.label))) {
        errors.push({ path: 'sequence[' + index + '].visual.data.vertices', message: `Figure requires exactly ${expectedVertices} labelled vertices with numeric coordinates.` });
      }
      const sides = Array.isArray(data.side_labels) ? data.side_labels : Array.isArray(data.segments) ? data.segments : [];
      if (sides.length < expectedVertices || sides.some((side) => !object(side) || !nonEmpty(side.from) || !nonEmpty(side.to) || !nonEmpty(side.label))) {
        errors.push({ path: 'sequence[' + index + '].visual.data.side_labels', message: `Figure requires ${expectedVertices} drawable labelled sides or segments.` });
      }
      if (data.width !== undefined || data.height !== undefined) {
        const width = Number(data.width); const height = Number(data.height);
        const xs = vertices.map((point) => Number((point as Record<string, unknown>).x));
        const ys = vertices.map((point) => Number((point as Record<string, unknown>).y));
        const coordinateRatio = (Math.max(...xs) - Math.min(...xs)) / (Math.max(...ys) - Math.min(...ys));
        if (!(Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0) || !Number.isFinite(coordinateRatio) || Math.abs((width / height) - coordinateRatio) > 0.05) {
          errors.push({ path: 'sequence[' + index + '].visual.data.width', message: 'Figure dimensions must be positive and proportionally consistent with numeric coordinates.' });
        }
      }
    }
    return errors;
  });
}

export function validateStagingLevel(lesson: Record<string, unknown>, metadata: StagingLevelMetadata, topicName: string, grade: string): StagingValidation {
  const candidate = { version: '2.1', topic_goal: topicName, levels: [{ ...metadata, lesson }] };
  const canonical = validateLessonV21(candidate, { prerequisiteFormat: 'staging' });
  const localPath = (path: string) => path.replace(/^levels\[0\]\.lesson\.?/, '');
  return {
    canonicalIssues: [...(canonical.success === false ? canonical.issues.map((issue) => ({ path: localPath(issue.path), message: issue.message })) : []), ...stagingSequenceContractIssues(lesson, metadata)],
    pedagogicalIssues: pedagogicalIssues(lesson, grade, topicName),
    geometryIssues: visualGeometryIssues(lesson),
  };
}

function isPrerequisiteIssue(issue: { path: string; message: string }): boolean {
  return /(^|\.)prerequisites(?:\[|\.)/i.test(issue.path) || /prerequisite/i.test(issue.message);
}

function isInteractionIssue(issue: { path: string; message: string }): boolean {
  return /answer_type|correct_answer|questions|interaction|mastery/i.test(issue.path) || /interaction|answer type|answer|mastery/i.test(issue.message);
}

export function summarizeStagingValidation(validation: StagingValidation, extraGeometryIssues: Array<{ path: string; message: string }> = []): StagingValidationSummary {
  const geometryIssues = [...validation.geometryIssues, ...extraGeometryIssues];
  const prerequisiteIssues = validation.canonicalIssues.filter(isPrerequisiteIssue);
  const interactionIssues = validation.canonicalIssues.filter(isInteractionIssue);
  const diagnostics = [
    ...validation.canonicalIssues,
    ...validation.pedagogicalIssues,
    ...geometryIssues,
  ].map((issue) => `${issue.path}: ${issue.message}`);
  return {
    canonicalValid: validation.canonicalIssues.length === 0,
    pedagogicalValid: validation.pedagogicalIssues.length === 0,
    prerequisiteValid: prerequisiteIssues.length === 0,
    geometryValid: geometryIssues.length === 0,
    interactionValid: interactionIssues.length === 0,
    canonicalIssues: validation.canonicalIssues,
    pedagogicalIssues: validation.pedagogicalIssues,
    prerequisiteIssues,
    geometryIssues,
    interactionIssues,
    diagnostics,
  };
}

export function requiredGeometryIssues(lesson: Record<string, unknown>, requiredKinds: readonly string[] = [...STAGING_ALL_GEOMETRY_KINDS]): Array<{ path: string; message: string }> {
  const sequence = (Array.isArray(lesson.levels) ? lesson.levels : []).flatMap((level: any) => Array.isArray(level?.lesson?.sequence) ? level.lesson.sequence : []);
  const visuals = sequence.map((block: any) => block?.visual).filter(Boolean);
  const has = (kind: string) => visuals.some((visual: any) => visual.kind === kind || (kind === 'triangle' && visual.kind === 'polygon' && visual.data?.shape === 'triangle'));
  return requiredKinds.filter((kind) => !has(kind)).map((kind) => ({ path: 'levels', message: 'Missing required drawable visual: ' + kind + '.' }));
}

export function requiredGeometryKindsIssues(lesson: Record<string, unknown>, requiredKinds: string[]): Array<{ path: string; message: string }> {
  const sequence = Array.isArray(lesson.sequence) ? lesson.sequence as Array<Record<string, unknown>> : [];
  const visuals = sequence.map((block) => object(block.visual)).filter(Boolean) as Array<Record<string, unknown>>;
  return requiredKinds.filter((kind) => !visuals.some((visual) => visual.kind === kind || (kind === 'triangle' && visual.kind === 'polygon' && object(visual.data)?.shape === 'triangle')))
    .map((kind) => ({ path: 'lesson.sequence', message: 'Missing required drawable visual for this level: ' + kind + '.' }));
}

export function assembleStagingLesson(topicName: string, levels: Array<{ metadata: StagingLevelMetadata; lesson: Record<string, unknown> }>): Record<string, unknown> {
  if (levels.length !== STAGING_LEVEL_COUNT) throw new Error('staging_assembly_failed: expected 4 levels, received ' + levels.length);
  const ordered = [...levels].sort((a, b) => a.metadata.level_number - b.metadata.level_number);
  if (ordered.some((item, index) => item.metadata.level_number !== index + 1)) throw new Error('staging_assembly_failed: levels must be numbered 1 through 4');
  return { version: '2.1', topic_goal: topicName, levels: ordered.map(({ metadata, lesson }) => ({ ...metadata, lesson })) };
}

export type StagingErrorClassification = { status: number; code: string; message: string; stage?: string };

/** Map a known staging/generation failure to a structured HTTP outcome.
 * 422 = output rejected by validation; 502 = provider protocol problem;
 * 500 only for unexpected server exceptions. */
export function classifyGenerationFailure(error: unknown, stagingStage?: string): StagingErrorClassification {
  const detail = error instanceof Error ? error.message : String(error ?? '');
  if (/Unauthorized|Missing authorization/i.test(detail)) return { status: 401, code: 'unauthorized', message: 'Authentication required.' };
  if (/Forbidden|role required/i.test(detail)) return { status: 403, code: 'forbidden', message: 'Admin or teacher role required.' };
  if (stagingStage === 'level_validation' || error instanceof StagingLevelContractError || /^staging_level_contract_failed/.test(detail)) {
    return { status: 422, code: 'staging_level_validation_failed', message: 'A staging level failed canonical, pedagogical, or geometry validation.', stage: 'level_validation' };
  }
  if (/^staging_assembly_/.test(detail)) return { status: 422, code: 'staging_assembly_validation_failed', message: 'The assembled staging lesson failed validation.', stage: 'assembly_validation' };
  if (/staging_level_json_parse_failed|provider JSON|malformed JSON|malformed_json/i.test(detail)) return { status: 502, code: 'provider_malformed_json', message: 'The AI provider returned malformed JSON.', stage: 'provider_parse' };
  if (/provider_output_truncated|finish_reason=length/.test(detail)) return { status: 502, code: 'provider_output_truncated', message: 'The AI provider output was truncated.', stage: 'provider_call' };
  if (/staging_level_provider_unavailable/.test(detail)) return { status: 502, code: 'provider_unavailable', message: 'The AI provider could not be reached.', stage: 'provider_call' };
  if (/staging_level_provider_http_|AI generation failed|provider/i.test(detail)) return { status: 502, code: 'provider_error', message: 'The AI provider failed to generate content.', stage: 'provider_call' };
  if (/timeout|timed out/i.test(detail)) return { status: 502, code: 'timeout', message: 'The AI provider timed out.', stage: 'provider_call' };
  if (/canonical validation|correct_answer|contract/i.test(detail)) return { status: 422, code: 'canonical_validation_failed', message: 'The generated lesson does not match the contract.' };
  if (/pedagogical quality|pedagogical validation/i.test(detail)) return { status: 422, code: 'pedagogical_validation_failed', message: 'The generated lesson failed pedagogical validation.' };
  return { status: 500, code: 'unknown', message: 'Unexpected server error.' };
}
