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

export function stagingLevelPrompt(topicName: string, grade: string, language: string, metadata: StagingLevelMetadata, objectiveText: string): string {
  const required = metadata.required_geometry_kinds.length > 0
    ? 'Visuels obligatoires dans ce niveau: ' + metadata.required_geometry_kinds.join(', ') + '.'
    : 'Ajoute seulement les visuels utiles et entièrement dessinables.';
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
    'Les concepts exigent title et key_points: un tableau de 1 à 4 objets {label, text}; chaque key_point est un rappel court et distinct, pas une phrase copiée du content. guided_example exige context et steps; student_try exige question, answer_type, correct_answer, success_feedback et error_feedback; mastery_check exige 1 à 4 questions complètes.',
    'mastery doit être exactement {"skills":["étiquette courte 1","étiquette courte 2"],"threshold":0.8}: skills est un tableau de chaînes non vides, jamais un tableau d’objets, un objet ou un paragraphe.',
    'prerequisites et misconceptions doivent être des tableaux d’objets complets, jamais des tableaux de chaînes.',
    'Exemple prerequisite valide: {"id":"p1","description":"Lire les longueurs","check_question":"Quel segment mesure 6 cm ?","answer_type":"short_text","expected_answer":"AB","remediation_hint":"Repère les lettres des extrémités."}',
    'Exemple misconception valide: {"id":"m1","description":"Confondre rayon et diamètre","detect_if":"L’élève appelle rayon un segment qui traverse le centre","feedback":"Le rayon va du centre au cercle; le diamètre traverse le centre.","remediation_strategy":"Comparer les deux segments sur le dessin."}',
    'Exemple de bloc conceptuel rectangle valide: {"id":"rectangle-concept","type":"concept","title":"Rectangle ABCD","content":"Un rectangle est un quadrilatère dont les quatre angles sont droits. Ses côtés opposés ont la même longueur.","key_points":[{"label":"Angles","text":"4 angles droits"},{"label":"Longueurs","text":"Côtés opposés de même longueur"}],"takeaway":"Je vérifie les angles puis les côtés opposés.","visual":{"kind":"rectangle","purpose":"Nommer les sommets et les côtés.","alt_text":"Rectangle ABCD dessiné avec quatre sommets étiquetés.","data":{"shape":"rectangle","vertices":[{"x":45,"y":45,"label":"A"},{"x":255,"y":45,"label":"B"},{"x":255,"y":155,"label":"C"},{"x":45,"y":155,"label":"D"}],"side_labels":[{"from":"A","to":"B","label":"AB"},{"from":"B","to":"C","label":"BC"},{"from":"C","to":"D","label":"CD"},{"from":"D","to":"A","label":"DA"}]}}}',
    'Exemple de bloc conceptuel triangle valide: {"id":"triangle-concept","type":"concept","title":"Triangle ABC","content":"Un triangle possède trois sommets et trois côtés.","key_points":[{"label":"Côtés","text":"AB, BC et CA sont les trois côtés."}],"takeaway":"Je compte trois sommets et trois côtés.","visual":{"kind":"polygon","purpose":"Nommer les côtés du triangle.","alt_text":"Triangle ABC dessiné avec trois sommets étiquetés.","data":{"shape":"triangle","vertices":[{"x":60,"y":150,"label":"A"},{"x":150,"y":30,"label":"B"},{"x":240,"y":150,"label":"C"}],"side_labels":[{"from":"A","to":"B","label":"AB"},{"from":"B","to":"C","label":"BC"},{"from":"C","to":"A","label":"CA"}]}}}',
    'Exemple complet des cinq blocs et de mastery.skills (tous les content sont obligatoires): {"lesson_goal":"Reconnaître les propriétés d’un rectangle.","success_criteria":["Je sais identifier un rectangle."],"prerequisites":[],"sequence":[{"id":"c1","type":"concept","title":"Rectangle ABCD","content":"Un rectangle est un quadrilatère dont les quatre angles sont droits.","key_points":[{"label":"Angles","text":"4 angles droits"}],"takeaway":"Je vérifie les angles droits.","visual":{"kind":"rectangle","purpose":"Voir les angles et les côtés.","alt_text":"Rectangle ABCD avec quatre sommets étiquetés.","data":{"shape":"rectangle","vertices":[{"x":45,"y":45,"label":"A"},{"x":255,"y":45,"label":"B"},{"x":255,"y":155,"label":"C"},{"x":45,"y":155,"label":"D"}],"side_labels":[{"from":"A","to":"B","label":"AB"},{"from":"B","to":"C","label":"BC"},{"from":"C","to":"D","label":"CD"},{"from":"D","to":"A","label":"DA"}]} }},{"id":"c2","type":"concept","title":"Côtés opposés","content":"Les côtés opposés d’un rectangle ont la même longueur.","key_points":[{"label":"Longueurs","text":"Opposés égaux"}],"takeaway":"Je compare les côtés opposés."},{"id":"g1","type":"guided_example","content":"Je lis les lettres puis je compare les côtés opposés.","context":"Vérifier un rectangle.","steps":[{"instruction":"Je repère les côtés AB et CD.","reason":"Ils sont opposés."}]},{"id":"s1","type":"student_try","content":"À toi: indique la propriété des côtés opposés.","question":"Que peux-tu dire de AB et CD ?","answer_type":"short_text","correct_answer":"Ils ont la même longueur.","success_feedback":"Oui, ils sont de même longueur.","error_feedback":"Compare les côtés opposés."},{"id":"m1","type":"mastery_check","content":"Vérifie ta compréhension des deux propriétés.","questions":[{"id":"q1","question":"Combien d’angles droits possède un rectangle ?","answer_type":"numeric","correct_answer":4,"skill":"figures_planes","difficulty":1,"success_feedback":"Exact.","error_feedback":"Compte les quatre coins droits."}]}],"misconceptions":[],"mastery":{"skills":["angles droits","côtés opposés"],"threshold":0.8}}',
    'La sequence doit contenir deux explications concises, un exemple guidé, une question interactive avant mastery_check, un contrôle de compréhension, un takeaway et les métadonnées de maîtrise.',
    'Toutes les données de dessin sont obligatoires: rectangle avec exactement 4 sommets à coordonnées numériques, labels de points et 4 side_labels ou segments; triangle avec exactement 3 sommets à coordonnées numériques, labels de points et 3 side_labels ou segments; cercle avec centre, rayon et diamètre; angle avec sommet, deux rayons et degrés; symétrie avec axe, grille, figure originale et figure réfléchie. N’ajoute width/height que si leurs proportions sont cohérentes avec les coordonnées.',
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
