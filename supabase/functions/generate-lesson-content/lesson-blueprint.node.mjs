import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLessonBlueprint, validateLessonBlueprint } from './lesson-blueprint.ts';

const durationTopic = { id: '0ac06eee-3056-488b-81ae-554e432e873d', name: 'Durées', levelCode: 'cm2' };
const durationObjectives = [
  { id: 'b1f695e8-c376-4893-81f9-644738d3d653', text: 'Résoudre des problèmes impliquant des durées.', orderIndex: 0 },
  { id: 'a524af84-f539-47ae-84ca-df4670bffcdc', text: "Lire l'heure sur une horloge et calculer des durées.", orderIndex: 1 },
  { id: '5440a1a9-f1b8-4798-92d7-f44fe0adbe30', text: 'Utiliser les unités de durée (seconde, minute, heure, jour, semaine, mois, année, siècle, millénaire) et effectuer des conversions.', orderIndex: 2 },
];
const fractionTopic = { id: 'b4a3b171-08b4-4df4-9beb-804d851383ef', name: 'Fractions', levelCode: 'cm2' };
const fractionObjectives = [
  { id: 'fraction-quotient', text: 'Utiliser les fractions comme quotient et comme opérateur.', orderIndex: 0 },
  { id: 'fraction-compare', text: 'Comparer et ordonner des fractions simples.', orderIndex: 1 },
  { id: 'fraction-bound', text: 'Encadrer une fraction par deux entiers consécutifs.', orderIndex: 2 },
];

test('valid three-level blueprint', () => {
  const blueprint = buildLessonBlueprint(durationTopic, durationObjectives);
  const result = validateLessonBlueprint(blueprint, durationObjectives.map((objective) => objective.id));
  assert.equal(result.success, true);
  assert.equal(blueprint.levels.length, 3);
});

test('missing objective is rejected', () => {
  const blueprint = buildLessonBlueprint(durationTopic, durationObjectives);
  blueprint.levels[0].objectiveIds.push('missing');
  assert.equal(validateLessonBlueprint(blueprint, durationObjectives.map((objective) => objective.id)).success, false);
});

test('duplicate objective allocation is rejected', () => {
  const blueprint = buildLessonBlueprint(durationTopic, durationObjectives);
  blueprint.levels[1].objectiveIds.push(blueprint.levels[0].objectiveIds[0]);
  assert.equal(validateLessonBlueprint(blueprint, durationObjectives.map((objective) => objective.id)).success, false);
});

test('invalid sequence type and order are rejected', () => {
  const blueprint = buildLessonBlueprint(durationTopic, durationObjectives);
  blueprint.levels[0].sequenceSlots[0].type = 'student_try';
  blueprint.levels[0].sequenceSlots[1].type = 'concept';
  const result = validateLessonBlueprint(blueprint, durationObjectives.map((objective) => objective.id));
  assert.equal(result.success, false);
  assert.ok(result.issues.some((issue) => issue.message.includes('Concept slot')));
});

test('required visual without policy is rejected', () => {
  const blueprint = buildLessonBlueprint(durationTopic, durationObjectives);
  const concept = blueprint.levels[0].sequenceSlots.find((slot) => slot.type === 'concept');
  concept.allowedVisualKinds = [];
  concept.visualRequirement = 'required';
  assert.equal(validateLessonBlueprint(blueprint, durationObjectives.map((objective) => objective.id)).success, false);
});

test('unsupported visual kind is rejected', () => {
  const blueprint = buildLessonBlueprint(durationTopic, durationObjectives);
  const concept = blueprint.levels[0].sequenceSlots.find((slot) => slot.type === 'concept');
  concept.allowedVisualKinds = ['not-supported'];
  assert.equal(validateLessonBlueprint(blueprint, durationObjectives.map((objective) => objective.id)).success, false);
});

test('concept requiring key points and invalid bounds are rejected', () => {
  const blueprint = buildLessonBlueprint(durationTopic, durationObjectives);
  const concept = blueprint.levels[0].sequenceSlots.find((slot) => slot.type === 'concept');
  concept.requiresKeyPoints = true;
  concept.keyPointCount = { min: 0, max: 7 };
  assert.equal(validateLessonBlueprint(blueprint, durationObjectives.map((objective) => objective.id)).success, false);
});

test('prerequisite targeting new objective is rejected', () => {
  const blueprint = buildLessonBlueprint(durationTopic, durationObjectives);
  const prerequisite = blueprint.levels[0].prerequisiteSlots[0];
  prerequisite.forbiddenTargetObjectiveIds = [];
  prerequisite.mustPrecedeObjectiveIds = [...blueprint.levels[0].objectiveIds];
  assert.equal(validateLessonBlueprint(blueprint, durationObjectives.map((objective) => objective.id)).success, false);
});

test('mastery before teaching is rejected', () => {
  const blueprint = buildLessonBlueprint(durationTopic, durationObjectives);
  blueprint.levels[0].masterySlot.placement = 'before_sequence';
  assert.equal(validateLessonBlueprint(blueprint, durationObjectives.map((objective) => objective.id)).success, false);
});

test('mastery missing objective coverage is rejected', () => {
  const blueprint = buildLessonBlueprint(durationTopic, durationObjectives);
  blueprint.levels[0].masterySlot.objectiveIds = [];
  assert.equal(validateLessonBlueprint(blueprint, durationObjectives.map((objective) => objective.id)).success, false);
});

test('duplicate slot IDs are rejected', () => {
  const blueprint = buildLessonBlueprint(durationTopic, durationObjectives);
  blueprint.levels[0].masterySlot.slotId = blueprint.levels[0].sequenceSlots[0].slotId;
  assert.equal(validateLessonBlueprint(blueprint, durationObjectives.map((objective) => objective.id)).success, false);
});

test('Durées fixture requires duration visuals and validates', () => {
  const blueprint = buildLessonBlueprint(durationTopic, durationObjectives);
  const result = validateLessonBlueprint(blueprint, durationObjectives.map((objective) => objective.id));
  assert.equal(result.success, true);
  assert.ok(blueprint.levels.flatMap((level) => level.sequenceSlots).some((slot) => slot.type === 'concept' && slot.allowedVisualKinds.includes('unit_conversion')));
  assert.deepEqual(blueprint.levels.map((level) => level.objectiveIds[0]), [
    '5440a1a9-f1b8-4798-92d7-f44fe0adbe30',
    'a524af84-f539-47ae-84ca-df4670bffcdc',
    'b1f695e8-c376-4893-81f9-644738d3d653',
  ]);
});

test('fraction fixture validates and receives fraction visuals', () => {
  const blueprint = buildLessonBlueprint(fractionTopic, fractionObjectives);
  const result = validateLessonBlueprint(blueprint, fractionObjectives.map((objective) => objective.id));
  assert.equal(result.success, true);
  assert.ok(blueprint.levels.flatMap((level) => level.sequenceSlots).some((slot) => slot.type === 'concept' && slot.allowedVisualKinds.some((kind) => ['fraction_bar', 'fraction_circle'].includes(kind))));
});
