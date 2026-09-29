import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLessonBlueprint } from './lesson-blueprint.ts';
import { assembleLessonBlueprint } from './lesson-assembly.ts';
import { adaptLevelContent, fillLevelContentSlot } from './level-content-adapter.ts';

const topic = { id: '0ac06eee-3056-488b-81ae-554e432e873d', name: 'Durées', levelCode: 'cm2' };
const objectives = [
  { id: 'b1f695e8-c376-4893-81f9-644738d3d653', text: 'Résoudre des problèmes impliquant des durées.', orderIndex: 0 },
  { id: 'a524af84-f539-47ae-84ca-df4670bffcdc', text: "Lire l'heure sur une horloge et calculer des durées.", orderIndex: 1 },
  { id: '5440a1a9-f1b8-4798-92d7-f44fe0adbe30', text: 'Utiliser les unités de durée et effectuer des conversions.', orderIndex: 2 },
];

const valid = {
  lesson_goal: 'Comprendre comment choisir et convertir une unité de durée.',
  success_criteria: ['Je peux choisir une unité adaptée.', 'Je peux expliquer une conversion.'],
  misconceptions: [{ id: 'm1', description: 'Confondre la valeur et l’unité.', detect_if: 'La réponse mélange les unités.', feedback: 'Relis l’unité de départ et celle d’arrivée.', remediation_strategy: 'Représente la conversion avant de calculer.' }],
};

function draft() {
  const blueprint = buildLessonBlueprint(topic, objectives);
  const result = assembleLessonBlueprint(blueprint, objectives.map((objective) => objective.id));
  assert.equal(result.success, true);
  return result.draft;
}

test('valid level content is accepted', () => {
  assert.equal(adaptLevelContent({ slotId: 'level-1-content', kind: 'level_content', objectiveIds: ['o1'], levelNumber: 1 }, valid).ok, true);
});

test('missing goal and empty criteria are rejected', () => {
  assert.equal(adaptLevelContent({}, { ...valid, lesson_goal: '' }).ok, false);
  assert.equal(adaptLevelContent({}, { ...valid, success_criteria: [] }).ok, false);
});

test('duplicate criteria, malformed misconceptions, and placeholders are rejected', () => {
  assert.equal(adaptLevelContent({}, { ...valid, success_criteria: ['Même critère', 'Même critère'] }).ok, false);
  assert.equal(adaptLevelContent({}, { ...valid, misconceptions: ['confusion'] }).ok, false);
  assert.equal(adaptLevelContent({}, { ...valid, lesson_goal: 'TODO' }).ok, false);
  assert.equal(adaptLevelContent({}, { ...valid, misconceptions: [{ ...valid.misconceptions[0], feedback: '```json {}' }] }).ok, false);
});

test('structural mutations are rejected', () => {
  const result = adaptLevelContent({}, { ...valid, objectiveIds: ['changed'], level_number: 99, sequence: [] });
  assert.equal(result.ok, false);
  assert.equal(result.errors.filter((entry) => entry.code === 'structural_mutation').length, 3);
});

test('adapter fills only level content and does not mutate the original draft', () => {
  const original = draft();
  const before = JSON.parse(JSON.stringify(original));
  const target = original.levels[0].slots.find((slot) => slot.kind === 'level_content');
  const result = fillLevelContentSlot(original, target.slotId, valid);
  assert.equal(result.success, true, JSON.stringify(result));
  assert.equal(original.levels[0].slots.find((slot) => slot.slotId === target.slotId).status, 'pending');
  assert.deepEqual(JSON.parse(JSON.stringify(original)), before);
  const filled = result.draft.levels[0].slots.find((slot) => slot.slotId === target.slotId);
  assert.equal(filled.status, 'complete');
  assert.deepEqual(filled.objectiveIds, target.objectiveIds);
  assert.equal(filled.content.lesson_goal, valid.lesson_goal);
});

test('wrong slot family cannot be filled by the level adapter', () => {
  const current = draft();
  const concept = current.levels[0].slots.find((slot) => slot.kind === 'concept');
  const result = fillLevelContentSlot(current, concept.slotId, valid);
  assert.equal(result.success, false);
});

test('all content families have typed boundaries after Phase 4A', () => {
  const typed = ['level-content', 'prerequisite', 'concept', 'guided_example', 'prediction', 'student_try', 'feedback_checkpoint', 'mastery'];
  assert.equal(typed.length, 8);
  assert.deepEqual(typed.filter(Boolean), typed);
});
