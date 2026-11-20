import type { StagingLevelMetadata, StagingTopicKind } from './staging-level-workflow.ts';
import { SOLID_GALLERY_FIXTURES } from '../../../shared/solid-visual-contract.ts';
import { VALID_CUBE_NET } from '../../../shared/solid-net-contract.ts';

export type StagingObjective = { id: string; text: string };
export type ObjectiveProvenance = 'linked' | 'suggested' | 'absent';

export type ObjectiveSelection = {
  linked: StagingObjective[];
  suggested: StagingObjective[];
  selected: StagingObjective[];
  provenance: ObjectiveProvenance;
  missingLinkedIds: string[];
};

export type StagingSpecificationLevel = {
  levelNumber: 1 | 2 | 3 | 4;
  title: string;
  purpose: string;
  objectiveIds: string[];
  successCriteria?: string[];
  teachingObjectiveIds: string[];
  assessmentObjectiveIds: string[];
  exerciseObjectiveIds: string[];
  masteryObjectiveIds: string[];
  visualKinds: string[];
  visualsRequired: boolean;
  evaluationStatus: 'planned' | 'assessed' | 'not_assessed';
  evaluationNote: string;
};

export type StagingSpecification = {
  version: string;
  topicId: string;
  curriculum: string;
  language: string;
  topicKind: StagingTopicKind;
  objectiveProvenance: ObjectiveProvenance;
  objectiveSource: 'topic_objective_links' | 'curriculum_domain_suggestions' | 'none';
  levels: StagingSpecificationLevel[];
  rendererCapabilities: string[];
  review: {
    status: 'proposed' | 'approved' | 'rejected';
    reviewedBy?: string;
    reviewedAt?: string;
  };
};

export type StagingPreflight = {
  providerAllowed: boolean;
  errors: Array<{ code: string; path: string; message: string }>;
  objectiveSelection: ObjectiveSelection;
  specification: StagingSpecification;
};

export const STAGING_SPECIFICATION_VERSION = 'staging-spec-v1';

// This is a capability declaration, not an approval of any topic specification.
// It must stay in sync with the actual renderer before a reviewed specification
// can be approved.
export const RENDERER_CAPABILITIES = [
  'clock', 'timeline', 'number_line', 'fraction_bar', 'fraction_circle',
  'triangle', 'rectangle', 'circle', 'polygon', 'angle', 'symmetry',
  'coordinate_plane', 'geometric_solid', 'solid_section', 'measurement',
  'unit_conversion', 'groups', 'comparison', 'part_whole', 'table',
  'equation', 'diagram', 'sequence',
] as const;

/** Explicit links are authoritative. Suggested domain objectives are never a replacement. */
export function resolveObjectiveSelection(
  linkedIds: string[],
  linkedRows: StagingObjective[],
  suggestedRows: StagingObjective[],
): ObjectiveSelection {
  const rowById = new Map(linkedRows.map((row) => [row.id, row]));
  const uniqueLinkedIds = [...new Set(linkedIds.map((id) => id.trim()).filter(Boolean))];
  if (uniqueLinkedIds.length > 0) {
    const linked = uniqueLinkedIds.flatMap((id) => {
      const row = rowById.get(id);
      return row?.text?.trim() ? [{ id, text: row.text }] : [];
    });
    return {
      linked,
      suggested: suggestedRows,
      selected: linked,
      provenance: 'linked',
      missingLinkedIds: uniqueLinkedIds.filter((id) => !rowById.has(id)),
    };
  }
  const suggested = suggestedRows.filter((row) => row.id.trim() && row.text.trim());
  return {
    linked: [],
    suggested,
    selected: suggested,
    provenance: suggested.length > 0 ? 'suggested' : 'absent',
    missingLinkedIds: [],
  };
}

export function buildProposedSpecification(input: {
  topicId: string;
  curriculum: string;
  language: string;
  topicKind: StagingTopicKind;
  objectiveSelection: ObjectiveSelection;
  metadata: StagingLevelMetadata[];
  levelAssignments?: Array<{ teachingObjectiveIds: string[]; assessmentObjectiveIds: string[]; exerciseObjectiveIds?: string[]; masteryObjectiveIds?: string[] }>;
}): StagingSpecification {
  const levels = input.metadata.map((level, index) => ({
    levelNumber: level.level_number as 1 | 2 | 3 | 4,
    title: level.title,
    purpose: level.purpose,
    objectiveIds: [...level.objective_ids],
    // Existing metadata does not prove objective coverage. These are proposals
    // and remain empty until a reviewer assigns teaching and assessment IDs.
    teachingObjectiveIds: input.levelAssignments?.[index]?.teachingObjectiveIds ?? [],
    assessmentObjectiveIds: input.levelAssignments?.[index]?.assessmentObjectiveIds ?? [],
    exerciseObjectiveIds: input.levelAssignments?.[index]?.exerciseObjectiveIds ?? [],
    masteryObjectiveIds: input.levelAssignments?.[index]?.masteryObjectiveIds ?? [],
    visualKinds: level.required_geometry_kinds.length > 0
      ? [...level.required_geometry_kinds]
      : [...new Set((level.required_geometry_alternatives ?? []).flat())],
    visualsRequired: level.required_geometry_kinds.length > 0 || (level.required_geometry_alternatives ?? []).some((items) => items.length > 0),
    evaluationStatus: 'planned' as const,
    evaluationNote: 'Correspondance proposée, à confirmer par revue humaine.',
  }));
  return {
    version: STAGING_SPECIFICATION_VERSION,
    topicId: input.topicId,
    curriculum: input.curriculum,
    language: input.language,
    topicKind: input.topicKind,
    objectiveProvenance: input.objectiveSelection.provenance,
    objectiveSource: input.objectiveSelection.provenance === 'linked'
      ? 'topic_objective_links'
      : input.objectiveSelection.provenance === 'suggested'
        ? 'curriculum_domain_suggestions'
        : 'none',
    levels,
    rendererCapabilities: [...RENDERER_CAPABILITIES],
    review: { status: 'proposed' },
  };
}

/** Test-only fixture helper. Production must never use this path. */
export function buildProviderFreeApprovedSpecification(input: {
  topicId: string;
  curriculum: string;
  language: string;
  topicKind: StagingTopicKind;
  objectiveSelection: ObjectiveSelection;
  metadata: StagingLevelMetadata[];
}): StagingSpecification {
  const proposal = buildProposedSpecification(input);
  const ids = input.objectiveSelection.selected.length > 0
    ? input.objectiveSelection.selected.map((objective) => objective.id)
    : ['provider-free-objective'];
  return {
    ...proposal,
    objectiveProvenance: 'linked',
    levels: proposal.levels.map((level) => ({
      ...level,
      objectiveIds: ids,
      teachingObjectiveIds: [ids[0]],
      assessmentObjectiveIds: [ids[0]],
      exerciseObjectiveIds: [ids[0]],
      masteryObjectiveIds: [ids[0]],
      evaluationStatus: 'assessed' as const,
      evaluationNote: 'Fixture provider-free uniquement ; ne constitue pas une approbation pédagogique.',
    })),
    review: { status: 'approved', reviewedBy: 'provider-free-test', reviewedAt: 'test' },
  };
}

/**
 * Read-only proposal for the CM2 solids topic. The UUIDs below are the
 * read-only objective references collected for this topic; callers must still
 * verify the links and review the proposal. The progression and visual kinds
 * are proposals, never approval.
 */
export const SOLIDS_TOPIC_ID = 'eba99c31-838a-4880-9eee-0c9a648f742e';
export const SOLIDS_LINKED_OBJECTIVES: StagingObjective[] = [
  { id: '13d3e65a-0463-438d-936f-902cecb89f03', text: 'Nommer un cube, une boule, un pavé, un cône, une pyramide, un cylindre ou un prisme droit' },
  { id: '3d63ffb9-9410-494c-b21a-c8f1e96cda00', text: 'Décrire un cube, un pavé, une pyramide ou un prisme droit en faisant référence à des propriétés et en utilisant le vocabulaire approprié' },
  { id: 'da3c4186-ce97-4b2c-aca6-1fe5119a6018', text: "Reconnaître un patron d'un cube" },
  { id: 'dc7008bb-18e3-4288-94da-4292aafb0957', text: "Construire un patron d'un cube" },
  { id: 'eff71ca4-14a9-4e81-a00f-7315bd7a3d30', text: "Reconnaître un patron d'un pavé" },
];

/** Renderer-compatible examples used for review only. A patron is represented
 * as a coordinate diagram with named points and segments; it is not a section.
 * geometric_solid uses the shared explicit solid contract. */
export const SOLIDS_VISUAL_EXAMPLES = {
  geometric_solid: {
    kind: 'geometric_solid', purpose: 'Identifier un solide en perspective.', alt_text: 'Cube représenté en perspective.',
    data: SOLID_GALLERY_FIXTURES.cube,
  },
  diagram: {
    kind: 'diagram', purpose: 'Représenter les six faces d’un patron de cube.', alt_text: 'Patron de cube avec six carrés reliés.',
    data: VALID_CUBE_NET,
  },
} as const;

export function buildSolidsSpecificationProposal(
  objectiveSelection: ObjectiveSelection = resolveObjectiveSelection(
    SOLIDS_LINKED_OBJECTIVES.map((objective) => objective.id),
    SOLIDS_LINKED_OBJECTIVES,
    [],
  ),
): StagingSpecification {
  const [naming, describing, recogniseCubeNet, buildCubeNet, recogniseCuboidNet] = objectiveSelection.selected.map((objective) => objective.id);
  const metadata: StagingLevelMetadata[] = [
    { id: `${SOLIDS_TOPIC_ID}-level-1`, level_number: 1, title: 'Nommer les solides', purpose: 'Nommer des solides usuels à partir de représentations et de propriétés simples.', difficulty: 'foundation', objective_ids: naming ? [naming] : [], required_geometry_kinds: ['geometric_solid'] },
    { id: `${SOLIDS_TOPIC_ID}-level-2`, level_number: 2, title: 'Décrire les propriétés', purpose: 'Décrire un cube, un pavé, une pyramide ou un prisme droit avec le vocabulaire approprié.', difficulty: 'foundation', objective_ids: describing ? [describing] : [], required_geometry_kinds: ['geometric_solid'] },
    { id: `${SOLIDS_TOPIC_ID}-level-3`, level_number: 3, title: 'Reconnaître un patron de cube', purpose: 'Reconnaître un patron de cube à partir d’un diagramme de faces reliées.', difficulty: 'application', objective_ids: recogniseCubeNet ? [recogniseCubeNet] : [], required_geometry_kinds: ['diagram'] },
    { id: `${SOLIDS_TOPIC_ID}-level-4`, level_number: 4, title: 'Reconnaître des patrons', purpose: 'Reconnaître un patron de cube ou de pavé ; la construction interactive d’un patron n’est pas évaluée par ce parcours.', difficulty: 'transfer', objective_ids: [buildCubeNet, recogniseCuboidNet].filter(Boolean), required_geometry_kinds: ['diagram'] },
  ];
  const proposal = buildProposedSpecification({
    topicId: SOLIDS_TOPIC_ID,
    curriculum: 'CM2',
    language: 'fr',
    topicKind: 'geometry',
    objectiveSelection,
    metadata,
    levelAssignments: [
      { teachingObjectiveIds: naming ? [naming] : [], assessmentObjectiveIds: naming ? [naming] : [], exerciseObjectiveIds: naming ? [naming] : [], masteryObjectiveIds: naming ? [naming] : [] },
      { teachingObjectiveIds: describing ? [describing] : [], assessmentObjectiveIds: describing ? [describing] : [], exerciseObjectiveIds: describing ? [describing] : [], masteryObjectiveIds: describing ? [describing] : [] },
      { teachingObjectiveIds: recogniseCubeNet ? [recogniseCubeNet] : [], assessmentObjectiveIds: recogniseCubeNet ? [recogniseCubeNet] : [], exerciseObjectiveIds: recogniseCubeNet ? [recogniseCubeNet] : [], masteryObjectiveIds: recogniseCubeNet ? [recogniseCubeNet] : [] },
      { teachingObjectiveIds: [buildCubeNet, recogniseCuboidNet].filter(Boolean), assessmentObjectiveIds: [recogniseCuboidNet].filter(Boolean), exerciseObjectiveIds: [recogniseCuboidNet].filter(Boolean), masteryObjectiveIds: [recogniseCuboidNet].filter(Boolean) },
    ],
  });
  return {
    ...proposal,
    levels: proposal.levels.map((level) => level.levelNumber === 4
      ? {
        ...level,
        evaluationStatus: 'not_assessed',
        evaluationNote: 'L’objectif « construire un patron » est enseigné comme proposition, mais aucune activité interactive de construction n’est disponible pour l’évaluer dans ce parcours.',
      }
      : level),
  };
}

/** Server-controlled reviewed specifications. Empty until a human-reviewed
 * specification is added in code; request-body fields cannot populate it. */
export const SERVER_APPROVED_STAGING_SPECIFICATIONS: Readonly<Record<string, StagingSpecification>> = {
  'ce93a21e-fce2-4f19-b4b8-4979afe69dc7': {
    version: STAGING_SPECIFICATION_VERSION,
    topicId: 'ce93a21e-fce2-4f19-b4b8-4979afe69dc7',
    curriculum: 'CM2',
    language: 'fr',
    topicKind: 'general',
    objectiveProvenance: 'linked',
    objectiveSource: 'topic_objective_links',
    levels: [
      {
        levelNumber: 1,
        title: 'Repérer une situation proportionnelle',
        purpose: 'Distinguer des situations proportionnelles et non proportionnelles dans des contextes de grandeurs. Expliquer le même multiplicateur en langage naturel; ne pas utiliser de tableau ni de coefficient.',
        objectiveIds: ['0db7edce-adf8-48ac-9be3-840994597983'],
        successCriteria: [
          'Je reconnais une situation proportionnelle en expliquant que si une grandeur est multipliée par un nombre, l’autre l’est par le même nombre.',
          'Je justifie mon choix avec les données du contexte, y compris pour une situation non proportionnelle.',
        ],
        teachingObjectiveIds: ['0db7edce-adf8-48ac-9be3-840994597983'],
        assessmentObjectiveIds: ['0db7edce-adf8-48ac-9be3-840994597983'],
        exerciseObjectiveIds: ['0db7edce-adf8-48ac-9be3-840994597983'],
        masteryObjectiveIds: ['0db7edce-adf8-48ac-9be3-840994597983'],
        visualKinds: ['groups', 'comparison', 'diagram'],
        visualsRequired: false,
        evaluationStatus: 'planned',
        evaluationNote: 'Vérifier dans le brouillon que l’identification est enseignée et évaluée avec des situations contextualisées proportionnelles et non proportionnelles.',
      },
      {
        levelNumber: 2,
        title: 'Multiplier les deux grandeurs',
        purpose: 'Résoudre un problème contextualisé en une étape en appliquant le même multiplicateur aux deux grandeurs et en gardant les unités. Ne pas utiliser de tableau, de coefficient, de produit en croix ni de retour à l’unité.',
        objectiveIds: ['0db7edce-adf8-48ac-9be3-840994597983', '9d8bc3fe-7e1c-4998-8b64-b0897b0f3769'],
        successCriteria: [
          'Je vérifie que la situation est proportionnelle avant de calculer.',
          'Je résous un problème à une étape en multipliant les deux grandeurs par le même nombre, puis j’écris la réponse avec son unité.',
        ],
        teachingObjectiveIds: ['0db7edce-adf8-48ac-9be3-840994597983', '9d8bc3fe-7e1c-4998-8b64-b0897b0f3769'],
        assessmentObjectiveIds: ['0db7edce-adf8-48ac-9be3-840994597983', '9d8bc3fe-7e1c-4998-8b64-b0897b0f3769'],
        exerciseObjectiveIds: ['9d8bc3fe-7e1c-4998-8b64-b0897b0f3769'],
        masteryObjectiveIds: ['0db7edce-adf8-48ac-9be3-840994597983', '9d8bc3fe-7e1c-4998-8b64-b0897b0f3769'],
        visualKinds: ['groups', 'comparison', 'diagram'],
        visualsRequired: false,
        evaluationStatus: 'planned',
        evaluationNote: 'Vérifier dans le brouillon la reconnaissance préalable, le raisonnement multiplicatif contextualisé et les unités.',
      },
      {
        levelNumber: 3,
        title: 'Additionner des cas connus',
        purpose: 'Combiner deux cas connus par addition des grandeurs correspondantes dans une même situation proportionnelle, avec une justification en langage naturel. Ne pas utiliser de tableau, de coefficient, de produit en croix ni de retour à l’unité.',
        objectiveIds: ['9d8bc3fe-7e1c-4998-8b64-b0897b0f3769'],
        successCriteria: [
          'Je combine deux cas connus en additionnant les quantités correspondantes.',
          'J’explique pourquoi cette addition conserve la relation dans le contexte.',
        ],
        teachingObjectiveIds: ['9d8bc3fe-7e1c-4998-8b64-b0897b0f3769'],
        assessmentObjectiveIds: ['9d8bc3fe-7e1c-4998-8b64-b0897b0f3769'],
        exerciseObjectiveIds: ['9d8bc3fe-7e1c-4998-8b64-b0897b0f3769'],
        masteryObjectiveIds: ['9d8bc3fe-7e1c-4998-8b64-b0897b0f3769'],
        visualKinds: ['groups', 'comparison', 'diagram'],
        visualsRequired: false,
        evaluationStatus: 'planned',
        evaluationNote: 'Vérifier dans le brouillon que l’addition porte sur des grandeurs correspondantes d’une même situation.',
      },
      {
        levelNumber: 4,
        title: 'Résoudre un problème en plusieurs étapes',
        purpose: 'Résoudre un problème contextualisé à plusieurs étapes en combinant les propriétés de linéarité pour la multiplication et l’addition, en justifiant chaque étape et les unités. Ne pas utiliser de tableau, de coefficient, de produit en croix ni de retour à l’unité.',
        objectiveIds: ['0db7edce-adf8-48ac-9be3-840994597983', '9d8bc3fe-7e1c-4998-8b64-b0897b0f3769'],
        successCriteria: [
          'Je résous un problème en plusieurs étapes avec des multiplications et/ou des additions des grandeurs correspondantes.',
          'J’explique chaque étape dans le contexte, je garde les unités et je vérifie que ma réponse répond à la question.',
        ],
        teachingObjectiveIds: ['0db7edce-adf8-48ac-9be3-840994597983', '9d8bc3fe-7e1c-4998-8b64-b0897b0f3769'],
        assessmentObjectiveIds: ['0db7edce-adf8-48ac-9be3-840994597983', '9d8bc3fe-7e1c-4998-8b64-b0897b0f3769'],
        exerciseObjectiveIds: ['9d8bc3fe-7e1c-4998-8b64-b0897b0f3769'],
        masteryObjectiveIds: ['0db7edce-adf8-48ac-9be3-840994597983', '9d8bc3fe-7e1c-4998-8b64-b0897b0f3769'],
        visualKinds: ['groups', 'comparison', 'diagram'],
        visualsRequired: false,
        evaluationStatus: 'planned',
        evaluationNote: 'Vérifier dans le brouillon la résolution autonome d’un problème à plusieurs étapes avec raisonnement additif et multiplicatif.',
      },
    ],
    rendererCapabilities: [...RENDERER_CAPABILITIES],
    review: {
      status: 'approved',
      reviewedBy: 'Harouna Moctar Traoré (product owner; CM2 teacher review pending)',
      reviewedAt: '2026-11-20T15:58:20.336Z',
    },
  },
};
export function getServerApprovedStagingSpecification(topicId: string): StagingSpecification | null {
  return SERVER_APPROVED_STAGING_SPECIFICATIONS[topicId] ?? null;
}

export function validateStagingSpecification(
  specification: StagingSpecification,
  objectives: ObjectiveSelection,
): Array<{ code: string; path: string; message: string }> {
  const errors: Array<{ code: string; path: string; message: string }> = [];
  const knownObjectiveIds = new Set(objectives.selected.map((objective) => objective.id));
  if (specification.review.status !== 'approved') {
    errors.push({ code: 'specification_not_approved', path: 'review.status', message: 'La spécification pédagogique doit être approuvée avant tout appel provider.' });
  }
  if (objectives.missingLinkedIds.length > 0) {
    errors.push({ code: 'invalid_objective_reference', path: 'objectives.linked', message: `Objectifs liés introuvables: ${objectives.missingLinkedIds.join(', ')}.` });
  }
  if (objectives.provenance === 'absent') {
    errors.push({ code: 'objectives_absent', path: 'objectives', message: 'Aucun objectif lié ou suggéré n’est disponible.' });
  }
  if (objectives.provenance === 'suggested') {
    errors.push({ code: 'objectives_not_linked', path: 'objectives.provenance', message: 'Les objectifs suggérés ne remplacent pas des objectifs explicitement liés au sujet.' });
  }
  if (specification.levels.length !== 4) {
    errors.push({ code: 'level_progression_invalid', path: 'levels', message: 'La spécification doit définir exactement quatre niveaux.' });
  }
  const seenLevels = new Set<number>();
  specification.levels.forEach((level, index) => {
    const path = `levels[${index}]`;
    if (![1, 2, 3, 4].includes(level.levelNumber)) errors.push({ code: 'level_progression_invalid', path: `${path}.levelNumber`, message: 'Le numéro de niveau doit être compris entre 1 et 4.' });
    if (seenLevels.has(level.levelNumber)) errors.push({ code: 'level_duplicate', path: `${path}.levelNumber`, message: 'Numéro de niveau dupliqué.' });
    seenLevels.add(level.levelNumber);
    const assignments = ['teachingObjectiveIds', 'assessmentObjectiveIds', 'exerciseObjectiveIds', 'masteryObjectiveIds'] as const;
    for (const objectiveId of level.objectiveIds) {
      if (!knownObjectiveIds.has(objectiveId)) errors.push({ code: 'invalid_objective_reference', path: `${path}.objectiveIds`, message: `Objectif ${objectiveId} absent des objectifs liés sélectionnés.` });
    }
    for (const assignment of assignments) {
      for (const objectiveId of level[assignment]) {
        if (!level.objectiveIds.includes(objectiveId)) errors.push({ code: 'invalid_objective_reference', path: `${path}.${assignment}`, message: `Objectif ${objectiveId} absent des objectifs assignés au niveau.` });
      }
    }
    if (level.successCriteria && (level.successCriteria.length < 1 || level.successCriteria.length > 5 ||
      level.successCriteria.some((criterion) => !criterion.trim()) || new Set(level.successCriteria).size !== level.successCriteria.length)) {
      errors.push({ code: 'invalid_success_criteria', path: `${path}.successCriteria`, message: 'Prévoir 1 à 5 critères de réussite non vides et distincts.' });
    }
    if (level.teachingObjectiveIds.length === 0) errors.push({ code: 'teaching_coverage_missing', path: `${path}.teachingObjectiveIds`, message: 'Aucun objectif enseigné n’est assigné à ce niveau.' });
    if (level.assessmentObjectiveIds.length === 0) errors.push({ code: 'assessment_coverage_missing', path: `${path}.assessmentObjectiveIds`, message: 'Aucun objectif évalué n’est assigné à ce niveau.' });
    if (level.exerciseObjectiveIds.length === 0) errors.push({ code: 'exercise_coverage_missing', path: `${path}.exerciseObjectiveIds`, message: 'Aucun objectif d’exercice n’est assigné à ce niveau.' });
    if (level.masteryObjectiveIds.length === 0) errors.push({ code: 'mastery_coverage_missing', path: `${path}.masteryObjectiveIds`, message: 'Aucun objectif de maîtrise n’est assigné à ce niveau.' });
    if (level.visualsRequired && level.visualKinds.length === 0) errors.push({ code: 'visual_capability_missing', path: `${path}.visualKinds`, message: 'Le niveau exige un visuel mais aucun kind compatible n’est déclaré.' });
    for (const kind of level.visualKinds) {
      if (!(RENDERER_CAPABILITIES as readonly string[]).includes(kind)) errors.push({ code: 'visual_capability_missing', path: `${path}.visualKinds`, message: `Le renderer ne déclare pas la capacité ${kind}.` });
    }
  });
  return errors;
}

export function runStagingPreflight(input: {
  specification: StagingSpecification;
  objectiveSelection: ObjectiveSelection;
}): StagingPreflight {
  const errors = validateStagingSpecification(input.specification, input.objectiveSelection);
  return { providerAllowed: errors.length === 0, errors, objectiveSelection: input.objectiveSelection, specification: input.specification };
}

export function specificationPromptContext(specification: StagingSpecification, levelNumber: number): string {
  const level = specification.levels.find((item) => item.levelNumber === levelNumber);
  if (!level) return '';
  return [
    `SPECIFICATION PÉDAGOGIQUE ${specification.version} — revue=${specification.review.status}.`,
    `Provenance objectifs: ${specification.objectiveProvenance}.`,
    `Progression niveau ${levelNumber} « ${level.title} »: ${level.purpose}`,
    `objectifs enseignés=${level.teachingObjectiveIds.join(', ') || 'aucun'}; objectifs évalués=${level.assessmentObjectiveIds.join(', ') || 'aucun'}; exercice=${level.exerciseObjectiveIds.join(', ') || 'aucun'}; maîtrise=${level.masteryObjectiveIds.join(', ') || 'aucun'}.`,
    ...(level.successCriteria ? [`Critères de réussite à reprendre exactement dans success_criteria: ${JSON.stringify(level.successCriteria)}.`] : []),
    `Visuels autorisés=${level.visualKinds.join('|') || 'aucun'}; visuels requis=${String(level.visualsRequired)}.`,
    `Évaluation=${level.evaluationStatus}; note=${level.evaluationNote}`,
  ].join(' ');
}

/** The canonical blocks have no objective or criterion references. Review their
 * meaning against the approved assignments, even when the criterion text matches. */
export function checkStagingCoverage(lesson: Record<string, unknown>, level: StagingSpecificationLevel, objectives: readonly StagingObjective[] = []) {
  const errors: Array<{ path: string; message: string }> = [];
  const warnings: Array<{ path: string; message: string }> = [];
  const actual = Array.isArray(lesson.success_criteria) ? lesson.success_criteria : [];
  if (level.successCriteria) {
    for (const criterion of level.successCriteria) {
      if (!actual.includes(criterion)) errors.push({ path: 'success_criteria', message: `Critère approuvé manquant : « ${criterion} ».` });
    }
    actual.forEach((criterion, index) => {
      if (!level.successCriteria?.includes(criterion)) errors.push({ path: `success_criteria[${index}]`, message: 'Critère absent de la spécification approuvée ou reformulé.' });
      else if (actual.indexOf(criterion) !== index) errors.push({ path: `success_criteria[${index}]`, message: 'Critère approuvé dupliqué.' });
    });
  } else {
    warnings.push({ path: 'success_criteria', message: 'La spécification ne fournit pas de libellés approuvés à comparer.' });
  }
  const objectiveLabels = (ids: string[]) => ids.map((id) => objectives.find((objective) => objective.id === id)?.text ?? id).join(' · ');
  warnings.push(
    { path: 'lesson_goal', message: `Vérifier le but, les concepts et l’exemple pour les objectifs enseignés : ${objectiveLabels(level.teachingObjectiveIds)}.` },
    { path: 'sequence[3]', message: `Vérifier l’exercice pour les objectifs : ${objectiveLabels(level.exerciseObjectiveIds)}.` },
    { path: 'sequence[4]', message: `Vérifier la maîtrise et les critères pour les objectifs évalués : ${objectiveLabels(level.assessmentObjectiveIds)}. Objectifs de maîtrise : ${objectiveLabels(level.masteryObjectiveIds)}.` },
  );
  return { errors, warnings };
}
