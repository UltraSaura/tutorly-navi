import { describe, expect, it } from 'vitest';
import { stagingLevelMetadata, stagingLevelPrompt, stagingTopicKind } from './staging-level-workflow.ts';
import { geometryVisualDataErrors } from './geometry-visual-contract.ts';
import { solidVisualDataErrors, SOLID_GALLERY_FIXTURES } from '../../../shared/solid-visual-contract.ts';
import { INVALID_CONNECTED_RECTANGLE_CUBE_NET, INVALID_DIMENSION_RECTANGULAR_PRISM_NET, INVALID_DISJOINT_CUBE_NET, INVALID_OVERLAPPING_CUBE_NET, solidNetErrors, VALID_CUBE_NET, VALID_RECTANGULAR_PRISM_NET } from '../../../shared/solid-net-contract.ts';
import {
  buildProviderFreeApprovedSpecification,
  buildProposedSpecification,
  buildSolidsSpecificationProposal,
  SOLIDS_LINKED_OBJECTIVES,
  SOLIDS_VISUAL_EXAMPLES,
  resolveObjectiveSelection,
  runStagingPreflight,
  validateStagingSpecification,
} from './staging-specification.ts';

const metadata = stagingLevelMetadata('topic-spec', 'Les nombres décimaux', ['linked-1'], 'Lire et comparer les nombres décimaux.');

describe('staging specification preflight', () => {
it('explicit topic objective links have priority over broad suggestions', () => {
  const selection = resolveObjectiveSelection(
    ['linked-1'],
    [{ id: 'linked-1', text: 'Objectif lié au sujet' }],
    [{ id: 'suggested-1', text: 'Objectif large du domaine' }],
  );
  expect(selection.provenance).toBe('linked');
  expect(selection.selected).toEqual([{ id: 'linked-1', text: 'Objectif lié au sujet' }]);
  expect(selection.suggested).toEqual([{ id: 'suggested-1', text: 'Objectif large du domaine' }]);
});

it('domain suggestions never silently replace explicit links', () => {
  const selection = resolveObjectiveSelection(
    ['missing-link'],
    [],
    [{ id: 'suggested-1', text: 'Objectif large du domaine' }],
  );
  expect(selection.provenance).toBe('linked');
  expect(selection.selected).toEqual([]);
  expect(selection.missingLinkedIds).toEqual(['missing-link']);
  expect(validateStagingSpecification(buildProposedSpecification({
    topicId: 'topic-spec', curriculum: 'CM2', language: 'fr', topicKind: 'decimal', objectiveSelection: selection, metadata,
  }), selection).some((error) => error.code === 'invalid_objective_reference')).toBe(true);
});

it('no linked or suggested objectives is explicit absence', () => {
  const selection = resolveObjectiveSelection([], [], []);
  expect(selection.provenance).toBe('absent');
  expect(selection.selected).toEqual([]);
  const preflight = runStagingPreflight({
    specification: buildProposedSpecification({ topicId: 'topic-spec', curriculum: 'CM2', language: 'fr', topicKind: 'decimal', objectiveSelection: selection, metadata }),
    objectiveSelection: selection,
  });
  expect(preflight.providerAllowed).toBe(false);
  expect(preflight.errors.some((error) => error.code === 'objectives_absent')).toBe(true);
  expect(preflight.errors.some((error) => error.code === 'specification_not_approved')).toBe(true);
});

it('unapproved specifications block before provider', () => {
  const selection = resolveObjectiveSelection(['linked-1'], [{ id: 'linked-1', text: 'Lire et comparer les décimaux.' }], []);
  const specification = buildProposedSpecification({ topicId: 'topic-spec', curriculum: 'CM2', language: 'fr', topicKind: stagingTopicKind('Les nombres décimaux'), objectiveSelection: selection, metadata });
  const preflight = runStagingPreflight({ specification, objectiveSelection: selection });
  expect(preflight.providerAllowed).toBe(false);
  expect(preflight.errors.filter((error) => error.code === 'specification_not_approved')).toHaveLength(1);
});

it('approved specification is transmitted exactly to all four prompts', () => {
  const selection = resolveObjectiveSelection(['linked-1'], [{ id: 'linked-1', text: 'Lire et comparer les décimaux.' }], []);
  const specification = buildProviderFreeApprovedSpecification({
    topicId: 'topic-spec', curriculum: 'CM2', language: 'fr', topicKind: 'decimal', objectiveSelection: selection, metadata,
  });
  const preflight = runStagingPreflight({ specification, objectiveSelection: selection });
  expect(preflight.providerAllowed).toBe(true);
  for (const level of metadata) {
    const prompt = stagingLevelPrompt('Les nombres décimaux', 'CM2', 'fr', level, 'linked-1: Lire et comparer les décimaux.', specification);
    expect(prompt).toMatch(/SPECIFICATION PÉDAGOGIQUE staging-spec-v1 — revue=approved/);
    expect(prompt).toMatch(/objectifs enseignés=linked-1/);
    expect(prompt).toMatch(/objectifs évalués=linked-1/);
    expect(prompt).toMatch(/Visuels autorisés=/);
  }
});

it('prepares an unapproved solids proposal without inventing objective IDs', () => {
  const specification = buildSolidsSpecificationProposal();
  expect(specification.topicId).toBe('eba99c31-838a-4880-9eee-0c9a648f742e');
  expect(specification.curriculum).toBe('CM2');
  expect(specification.language).toBe('fr');
  expect(specification.review.status).toBe('proposed');
  expect(specification.objectiveProvenance).toBe('linked');
  expect(specification.objectiveSource).toBe('topic_objective_links');
  expect(specification.levels.flatMap((level) => level.objectiveIds)).toEqual([
    '13d3e65a-0463-438d-936f-902cecb89f03',
    '3d63ffb9-9410-494c-b21a-c8f1e96cda00',
    'da3c4186-ce97-4b2c-aca6-1fe5119a6018',
    'dc7008bb-18e3-4288-94da-4292aafb0957',
    'eff71ca4-14a9-4e81-a00f-7315bd7a3d30',
  ]);
  expect(specification.levels.every((level) =>
    level.teachingObjectiveIds.length > 0
    && level.exerciseObjectiveIds.length > 0
    && level.masteryObjectiveIds.length > 0,
  )).toBe(true);
  expect(specification.levels).toHaveLength(4);
  expect(specification.levels.map((level) => level.visualKinds)).toEqual([
    ['geometric_solid'], ['geometric_solid'], ['diagram'], ['diagram'],
  ]);
  expect(specification.levels[2].purpose).not.toMatch(/section/i);
  expect(specification.levels[3].assessmentObjectiveIds).toEqual(['eff71ca4-14a9-4e81-a00f-7315bd7a3d30']);
  expect(specification.levels[3].evaluationStatus).toBe('not_assessed');
  expect(specification.levels[3].evaluationNote).toMatch(/aucune activité interactive/i);
  expect(geometryVisualDataErrors('diagram', SOLIDS_VISUAL_EXAMPLES.diagram.data)).toEqual([]);
  expect(SOLIDS_VISUAL_EXAMPLES.geometric_solid.kind).toBe('geometric_solid');
  expect(solidVisualDataErrors(SOLIDS_VISUAL_EXAMPLES.geometric_solid.data)).toEqual([]);
  const preflight = runStagingPreflight({ specification, objectiveSelection: resolveObjectiveSelection(
    SOLIDS_LINKED_OBJECTIVES.map((objective) => objective.id),
    SOLIDS_LINKED_OBJECTIVES,
    [],
  ) });
  expect(preflight.providerAllowed).toBe(false);
  expect(preflight.errors.map((error) => error.code)).toEqual(expect.arrayContaining(['specification_not_approved']));
});

it('validates every supported solid fixture and rejects unknown or incomplete data', () => {
  for (const fixture of Object.values(SOLID_GALLERY_FIXTURES)) expect(solidVisualDataErrors(fixture)).toEqual([]);
  expect(solidVisualDataErrors({ solidType: 'unknown', dimensions: { edge: 1 } })[0].code).toBe('invalid_solid_type');
  expect(solidVisualDataErrors({ solidType: 'pyramid', dimensions: { width: 1, height: 1, depth: 1 } }).some((issue) => issue.code === 'missing_solid_base')).toBe(true);
});

it('checks patron geometry independently from diagram rendering', () => {
  expect(solidNetErrors(VALID_CUBE_NET)).toEqual([]);
  expect(solidNetErrors(VALID_RECTANGULAR_PRISM_NET)).toEqual([]);
  expect(solidNetErrors(INVALID_CONNECTED_RECTANGLE_CUBE_NET).some((issue) => issue.code === 'invalid_solid_net_shape')).toBe(true);
  expect(solidNetErrors(INVALID_DISJOINT_CUBE_NET).some((issue) => issue.code === 'disconnected_solid_net')).toBe(true);
  expect(solidNetErrors(INVALID_OVERLAPPING_CUBE_NET).some((issue) => issue.code === 'overlapping_solid_net_face')).toBe(true);
  expect(solidNetErrors(INVALID_DIMENSION_RECTANGULAR_PRISM_NET).some((issue) => issue.code === 'incompatible_solid_net_dimensions')).toBe(true);
  expect(geometryVisualDataErrors('diagram', VALID_CUBE_NET)).toEqual([]);
  expect(geometryVisualDataErrors('diagram', INVALID_DISJOINT_CUBE_NET).some((issue) => issue.code === 'disconnected_solid_net')).toBe(true);
});
});
