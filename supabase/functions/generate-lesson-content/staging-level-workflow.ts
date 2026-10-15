import { validateLessonV21 } from './lesson-v21-contract.ts';
import { pedagogicalIssues } from './pedagogical-quality.ts';
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
  status: 'complete';
  providerCalls: number;
  tokenUsage: { promptTokens: number; completionTokens: number; totalTokens: number };
};

export type StagingValidation = {
  canonicalIssues: Array<{ path: string; message: string }>;
  pedagogicalIssues: Array<{ path: string; message: string }>;
  geometryIssues: Array<{ path: string; message: string }>;
};

export const STAGING_SEQUENCE_BLOCK_TYPES = ['concept', 'concept', 'guided_example', 'student_try', 'mastery_check'] as const;
export const STAGING_INTERACTIVE_TYPES = ['prediction', 'student_try', 'feedback_checkpoint'] as const;

export class StagingLevelContractError extends Error {
  constructor(public readonly issues: Array<{ path: string; message: string }>) {
    super('staging_level_contract_failed: ' + issues.map((issue) => issue.path + ': ' + issue.message).join('; '));
    this.name = 'StagingLevelContractError';
  }
}

export function stagingValidationFailure(level: number, issues: Array<{ path: string; message: string }>, providerCalls: number) {
  return {
    code: 'staging_level_validation_failed',
    level,
    stage: 'level_validation',
    technicalDetail: issues.map((issue) => issue.path + ': ' + issue.message).join('; '),
    providerCalls,
  };
}

const object = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;

export const STAGING_LEVEL_COUNT = 4;
export const STAGING_LEVEL_MAX_TOKENS = 3600;

const nonEmpty = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

function requiredStagingField(value: Record<string, unknown>, path: string, field: string, issues: Array<{ path: string; message: string }>) {
  if (!nonEmpty(value[field])) issues.push({ path: `${path}.${field}`, message: 'Required non-empty string' });
}

function requiredStagingKeyPoints(value: Record<string, unknown>, path: string, issues: Array<{ path: string; message: string }>) {
  if (!Array.isArray(value.key_points) || value.key_points.length < 1 || value.key_points.length > 4) {
    issues.push({ path: `${path}.key_points`, message: 'Expected 1–4 concise key point objects' });
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

export function stagingLevelMetadata(topicId: string, topicName: string, objectiveIds: string[]): StagingLevelMetadata[] {
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
export const STAGING_VISUAL_EXAMPLES: Record<'rectangle' | 'triangle' | 'circle' | 'angle' | 'symmetry', ConceptExample> = {
  rectangle: { id: 'rectangle-concept', type: 'concept', title: 'Rectangle ABCD', content: 'Un rectangle est un quadrilatère dont les quatre angles sont droits. Ses côtés opposés ont la même longueur.', key_points: [{ label: 'Angles', text: '4 angles droits' }, { label: 'Longueurs', text: 'Côtés opposés égaux' }], takeaway: 'Je vérifie les angles puis les côtés opposés.', visual: { kind: 'rectangle', purpose: 'Nommer les sommets et les côtés.', alt_text: 'Rectangle ABCD dessiné avec quatre sommets étiquetés.', data: { shape: 'rectangle', vertices: [{ x: 45, y: 45, label: 'A' }, { x: 255, y: 45, label: 'B' }, { x: 255, y: 155, label: 'C' }, { x: 45, y: 155, label: 'D' }], side_labels: [{ from: 'A', to: 'B', label: 'AB' }, { from: 'B', to: 'C', label: 'BC' }, { from: 'C', to: 'D', label: 'CD' }, { from: 'D', to: 'A', label: 'DA' }] } } },
  triangle: { id: 'triangle-concept', type: 'concept', title: 'Triangle ABC', content: 'Un triangle possède trois sommets et trois côtés.', key_points: [{ label: 'Côtés', text: 'AB, BC et CA' }], takeaway: 'Pour reconnaître la figure, je pose le doigt sur chaque coin nommé.', visual: { kind: 'polygon', purpose: 'Nommer les côtés du triangle.', alt_text: 'Triangle ABC dessiné avec trois sommets étiquetés.', data: { shape: 'triangle', vertices: [{ x: 60, y: 150, label: 'A' }, { x: 150, y: 30, label: 'B' }, { x: 240, y: 150, label: 'C' }], side_labels: [{ from: 'A', to: 'B', label: 'AB' }, { from: 'B', to: 'C', label: 'BC' }, { from: 'C', to: 'A', label: 'CA' }] } } },
  circle: { id: 'circle-concept', type: 'concept', title: 'Cercle de centre O', content: 'Tous les points d’un cercle sont à la même distance du centre O. Le diamètre mesure deux rayons.', key_points: [{ label: 'Rayon', text: 'Du centre au cercle' }, { label: 'Diamètre', text: 'Deux rayons alignés' }], takeaway: 'Je mesure le rayon puis je le double pour le diamètre.', visual: { kind: 'circle', purpose: 'Montrer le centre, le rayon et le diamètre.', alt_text: 'Cercle de centre O avec un rayon de 3 cm et un diamètre de 6 cm.', data: { center: { x: 150, y: 100, label: 'O' }, radius: 3, diameter: 6, unit: 'cm' } } },
  angle: { id: 'angle-concept', type: 'concept', title: 'Angle de sommet O', content: 'Un angle est formé par deux demi-droites qui partent du même sommet O. On le mesure en degrés.', key_points: [{ label: 'Sommet', text: 'Le point O' }, { label: 'Mesure', text: 'En degrés' }], takeaway: 'Je place le centre du rapporteur sur le sommet.', visual: { kind: 'angle', purpose: 'Montrer le sommet, les deux côtés et la mesure.', alt_text: 'Angle AOB de 45 degrés de sommet O.', data: { vertex: { x: 100, y: 150, label: 'O' }, rays: [{ x: 250, y: 150, label: 'A' }, { x: 206, y: 44, label: 'B' }], degrees: 45 } } },
  symmetry: { id: 'symmetry-concept', type: 'concept', title: 'Symétrie axiale', content: 'Une figure et sa symétrique sont à la même distance de l’axe, de part et d’autre.', key_points: [{ label: 'Axe', text: 'Droite verticale x = 5' }, { label: 'Distance', text: 'Même nombre de carreaux' }], takeaway: 'Je compte les carreaux jusqu’à l’axe puis je reporte de l’autre côté.', visual: { kind: 'symmetry', purpose: 'Comparer une figure et sa symétrique sur quadrillage.', alt_text: 'Triangle et son symétrique par rapport à un axe vertical sur un quadrillage de 10 sur 8.', data: { axis: { x: 5 }, grid: { width: 10, height: 8 }, figure: [{ x: 2, y: 2 }, { x: 4, y: 2 }, { x: 4, y: 5 }], symmetric_figure: [{ x: 8, y: 2 }, { x: 6, y: 2 }, { x: 6, y: 5 }] } } },
};

export const STAGING_ALL_GEOMETRY_KINDS = ['rectangle', 'triangle', 'circle', 'angle', 'symmetry'] as const;

/** Visual kinds the prompt demands for each level. Level 4 has no fixed kind
 * but still must draw every concept, because pedagogical validation requires
 * a figure for any geometric concept. */
export function stagingPromptVisualKinds(metadata: StagingLevelMetadata): string[] {
  return metadata.required_geometry_kinds.length > 0 ? metadata.required_geometry_kinds : [...STAGING_ALL_GEOMETRY_KINDS];
}

/** Numeric prerequisite shown to the provider (validated in tests). */
export const STAGING_NUMERIC_PREREQUISITE_EXAMPLE = { id: 'p1', description: 'Compter les sommets', check_question: 'Combien de sommets possède un carré ?', answer_type: 'numeric', expected_answer: '4', remediation_hint: 'Pose le doigt sur chaque coin et compte.' };

export const PREREQUISITE_ANSWER_RULE = 'Chaque prerequisite DOIT contenir expected_answer (jamais correct_answer ni answer). Si answer_type vaut "numeric", expected_answer est OBLIGATOIRE et ne contient que des chiffres (ex. "4", "90", "2,5"), sans unité ni mot. Si la réponse n’est pas un nombre, utilise answer_type "short_text".';

export const TAKEAWAY_RULE = 'Le takeaway est une ACTION que l’élève fait (verbe à la 1re personne: "Je pose…", "Je vérifie…"), en au plus 12 mots, et partage au plus 2 mots importants avec le content et les key_points: ne répète jamais le nom de la figure ni ses éléments déjà cités (interdit: "Pour reconnaître un triangle, je compte ses trois sommets et ses trois côtés" si le content dit déjà "trois sommets et trois côtés"; correct: "Je pose le doigt sur chaque coin nommé.").';
export const CONCEPT_LENGTH_RULE = 'Le content de chaque concept compte au plus 40 mots (limite stricte 55, au-delà la leçon est rejetée): 1 à 3 phrases courtes. Les détails vont dans key_points, le visual ou un autre concept, jamais dans un long paragraphe.';
export const KEY_POINT_RULE = 'Chaque key_point (label + text ensemble) contient au plus 5 mots importants et ne réutilise pas les mots du content: il nomme l’idée en 2 à 4 mots (ex. {"label":"Sommet","text":"Le point O"}), jamais une reformulation de la phrase du content (interdit: {"label":"Sommet","text":"Point de départ des deux demi-droites"} si le content parle déjà des deux demi-droites).';

/** Complete, valid example level used in the prompt (validated in tests). */
export function stagingFullLevelExample(metadata: StagingLevelMetadata): Record<string, unknown> {
  const kinds = stagingPromptVisualKinds(metadata);
  const first = STAGING_VISUAL_EXAMPLES[(kinds[0] ?? 'rectangle') as keyof typeof STAGING_VISUAL_EXAMPLES];
  const second = STAGING_VISUAL_EXAMPLES[(kinds[1] ?? kinds[0] ?? 'triangle') as keyof typeof STAGING_VISUAL_EXAMPLES];
  return {
    lesson_goal: 'Reconnaître et décrire une figure plane.',
    success_criteria: ['Je sais nommer les éléments de la figure.'],
    prerequisites: [STAGING_NUMERIC_PREREQUISITE_EXAMPLE],
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
  '- symmetry: kind "symmetry", data.axis = {x:number} pour un axe vertical ou {y:number} pour un axe horizontal (jamais {x1,y1,x2,y2}), data.grid = {width:number,height:number}, data.figure = tableau de points {x,y}, data.symmetric_figure = tableau de points {x,y} (images exactes par la symétrie).',
  'N’ajoute width/height à une figure que si leurs proportions sont cohérentes avec les coordonnées.',
].join('\n');

export function stagingLevelPrompt(topicName: string, grade: string, language: string, metadata: StagingLevelMetadata, objectiveText: string): string {
  const kinds = stagingPromptVisualKinds(metadata);
  const required = metadata.required_geometry_kinds.length > 0
    ? 'Visuels obligatoires dans ce niveau: ' + metadata.required_geometry_kinds.join(', ') + '. Chaque bloc concept DOIT contenir un visual dessinable complet.'
    : 'Chaque bloc concept DOIT contenir un visual dessinable complet, choisi parmi: ' + kinds.join(', ') + '. Un concept sans figure est refusé.';
  const examples = kinds.map((kind) => 'Exemple de bloc conceptuel ' + kind + ' valide: ' + JSON.stringify(STAGING_VISUAL_EXAMPLES[kind as keyof typeof STAGING_VISUAL_EXAMPLES]));
  return [
    'LESSON GENERATOR V2.1 — STAGING LEVEL ' + metadata.level_number + '/4',
    'Sujet: ' + topicName + '; niveau scolaire: ' + grade + '; langue: ' + language + '.',
    'But de ce niveau: ' + metadata.purpose,
    'Objectifs autorisés: ' + (objectiveText || 'aucun objectif précisé'),
    required,
    'Retourne UNIQUEMENT le JSON direct de CE niveau, jamais de wrapper, jamais les autres niveaux.',
    'Le JSON doit contenir lesson_goal, success_criteria, prerequisites, sequence, misconceptions et mastery.',
    'sequence doit contenir exactement cinq blocs, dans cet ordre et avec ces types: concept, concept, guided_example, student_try, mastery_check.',
    'Chaque bloc doit contenir son propre id non vide, type canonique et content: une chaîne destinée à l’élève, non vide après trim. Aucun bloc ne peut contenir uniquement des métadonnées, une question ou des réponses sans content. Ne laisse jamais le compilateur inventer un id, un type ou du contenu.',
    'Le content du concept explique la notion; celui de guided_example explique un exemple résolu; celui de student_try demande une action à l’élève; celui de mastery_check vérifie sa compréhension. Tous les cinq blocs doivent avoir un content réaliste en français.',
    'Les concepts exigent title, key_points (1 à 4 objets {label, text}, rappels courts et distincts, pas une phrase copiée du content), takeaway et visual. guided_example exige context et steps; student_try exige question, answer_type, correct_answer, success_feedback et error_feedback; mastery_check exige 1 à 4 questions complètes.',
    CONCEPT_LENGTH_RULE,
    KEY_POINT_RULE,
    TAKEAWAY_RULE,
    'mastery doit être exactement {"skills":["étiquette courte 1","étiquette courte 2"],"threshold":0.8}: skills est un tableau de chaînes non vides, jamais un tableau d’objets, un objet ou un paragraphe.',
    'prerequisites et misconceptions doivent être des tableaux d’objets complets, jamais des tableaux de chaînes.',
    PREREQUISITE_ANSWER_RULE,
    'Exemple prerequisite valide: {"id":"p1","description":"Lire les longueurs","check_question":"Quel segment mesure 6 cm ?","answer_type":"short_text","expected_answer":"AB","remediation_hint":"Repère les lettres des extrémités."}',
    'Exemple prerequisite numeric valide: ' + JSON.stringify(STAGING_NUMERIC_PREREQUISITE_EXAMPLE),
    'Exemple misconception valide: {"id":"m1","description":"Confondre rayon et diamètre","detect_if":"L’élève appelle rayon un segment qui traverse le centre","feedback":"Le rayon va du centre au cercle; le diamètre traverse le centre.","remediation_strategy":"Comparer les deux segments sur le dessin."}',
    VISUAL_FIELD_RULES,
    ...examples,
    'Exemple complet des cinq blocs et de mastery.skills (tous les content sont obligatoires): ' + JSON.stringify(stagingFullLevelExample(metadata)),
    'La sequence doit contenir deux explications concises illustrées, un exemple guidé, une question interactive avant mastery_check, un contrôle de compréhension, un takeaway et les métadonnées de maîtrise.',
    'Ne dis jamais «voir la figure». JSON strict, sans Markdown.'
  ].join('\n');
}

export function parseStagingLevelResponse(raw: unknown, metadata?: StagingLevelMetadata): { value: Record<string, unknown>; attemptedRepair: boolean } {
  const parsed = parseProviderJsonSafely(raw);
  if (!parsed.ok) throw new Error('staging_level_json_parse_failed: ' + parsed.category);
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
  const canonical = validateLessonV21(candidate);
  return {
    canonicalIssues: [...(canonical.success ? [] : canonical.issues.map((issue) => ({ path: issue.path, message: issue.message }))), ...stagingSequenceContractIssues(lesson, metadata)],
    pedagogicalIssues: pedagogicalIssues(lesson, grade, topicName),
    geometryIssues: visualGeometryIssues(lesson),
  };
}

export function requiredGeometryIssues(lesson: Record<string, unknown>): Array<{ path: string; message: string }> {
  const sequence = (Array.isArray(lesson.levels) ? lesson.levels : []).flatMap((level: any) => Array.isArray(level?.lesson?.sequence) ? level.lesson.sequence : []);
  const visuals = sequence.map((block: any) => block?.visual).filter(Boolean);
  const has = (kind: string) => visuals.some((visual: any) => visual.kind === kind || (kind === 'triangle' && visual.kind === 'polygon' && visual.data?.shape === 'triangle'));
  return ['rectangle', 'triangle', 'circle', 'angle', 'symmetry'].filter((kind) => !has(kind)).map((kind) => ({ path: 'levels', message: 'Missing required drawable visual: ' + kind + '.' }));
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
