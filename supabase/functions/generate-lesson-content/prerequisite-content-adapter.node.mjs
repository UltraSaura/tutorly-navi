import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLessonBlueprint } from './lesson-blueprint.ts';
import { assembleLessonBlueprint, fillSlot } from './lesson-assembly.ts';
import { adaptPrerequisiteContent, prerequisiteAdapterMetrics } from './prerequisite-content-adapter.ts';

const durationTopic = { id: '0ac06eee-3056-488b-81ae-554e432e873d', name: 'Durées', levelCode: 'cm2' };
const durationObjectives = [
  { id: 'b1f695e8-c376-4893-81f9-644738d3d653', text: 'Résoudre des problèmes impliquant des durées.', orderIndex: 0 },
  { id: 'a524af84-f539-47ae-84ca-df4670bffcdc', text: "Lire l'heure sur une horloge et calculer des durées.", orderIndex: 1 },
  { id: '5440a1a9-f1b8-4798-92d7-f44fe0adbe30', text: 'Utiliser les unités de durée et effectuer des conversions.', orderIndex: 2 },
];
const fractionTopic = { id: 'b4a3b171-08b4-4df4-9beb-804d851383ef', name: 'Fractions', levelCode: 'cm2' };
const fractionObjectives = [
  { id: 'c490b2ac-95bd-437d-a797-0d5a68d58dea', text: 'Utiliser les fractions comme quotient et comme opérateur.', orderIndex: 0 },
  { id: '7da23dff-80e5-4d25-b267-a0a13244fee1', text: 'Comparer et ordonner des fractions simples.', orderIndex: 1 },
  { id: '4ab00555-c069-4528-bdb1-1e76db003bb5', text: 'Encadrer une fraction par deux entiers consécutifs.', orderIndex: 2 },
];

function prerequisiteSlots(topic, objectives) {
  const blueprint = buildLessonBlueprint(topic, objectives);
  const assembled = assembleLessonBlueprint(blueprint, objectives.map((objective) => objective.id));
  assert.equal(assembled.success, true);
  return assembled.draft.levels.map((level) => level.slots.find((slot) => slot.kind === 'prerequisite'));
}

const duration = prerequisiteSlots(durationTopic, durationObjectives);
const fractions = prerequisiteSlots(fractionTopic, fractionObjectives);

const level1Valid = { description: 'Comparer des nombres entiers.', check_question: 'Quel nombre est le plus grand : 4 ou 7 ?', answer_type: 'multiple_choice', choices: ['4', '7'], expected_answer: '7', remediation_hint: 'Compare les chiffres.' };
const level2Valid = { description: 'Réussir les notions du niveau précédent.', check_question: 'Quelle opération permet de calculer 30 + 20 ?', answer_type: 'multiple_choice', choices: ['Une addition', 'Une soustraction'], expected_answer: 'Une addition', remediation_hint: 'Relis le signe de l’opération.' };
const level3Valid = { ...level2Valid, check_question: 'Quel calcul permet de trouver une différence entre deux nombres ?', choices: ['Une soustraction', 'Une multiplication'], expected_answer: 'Une soustraction' };

test('Durées Level 1 prerequisite is structurally valid and resolved', () => {
  const result = adaptPrerequisiteContent(duration[0], level1Valid);
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.diagnosticSkillStatus, 'resolved');
});

test('Durées Level 1 rejects target-objective and malformed diagnostic content', () => {
  for (const candidate of [
    { ...level1Valid, check_question: 'Convertis 5 minutes en secondes.', answer_type: 'numeric', choices: undefined, expected_answer: '300' },
    { ...level1Valid, answer_type: 'time', expected_answer: '14:30', choices: undefined },
    { ...level1Valid, expected_answer: 'not-an-option' },
    { ...level1Valid, check_question: undefined },
    { ...level1Valid, remediation_hint: undefined },
    { ...level1Valid, expected_answer: '300 s', answer_type: 'numeric', choices: undefined },
  ]) assert.equal(adaptPrerequisiteContent(duration[0], candidate).ok, false);
});

test('Durées Levels 2 and 3 remain structurally valid but pedagogically generic', () => {
  const level2 = adaptPrerequisiteContent(duration[1], level2Valid);
  const level3 = adaptPrerequisiteContent(duration[2], level3Valid);
  assert.equal(level2.ok, true, JSON.stringify(level2));
  assert.equal(level3.ok, true, JSON.stringify(level3));
  assert.equal(level2.diagnosticSkillStatus, 'generic');
  assert.equal(level3.diagnosticSkillStatus, 'generic');
});

test('supported prerequisite answer types are validated without a competing answer system', () => {
  assert.equal(adaptPrerequisiteContent(duration[0], { ...level1Valid, answer_type: 'numeric', choices: undefined, expected_answer: 45 }).ok, true);
  assert.equal(adaptPrerequisiteContent(duration[1], { ...level2Valid, answer_type: 'short_text', choices: undefined, expected_answer: 'addition' }).ok, true);
  const typedSlot = { ...duration[1], answerTypes: ['selection', 'ordering', 'time'] };
  assert.equal(adaptPrerequisiteContent(typedSlot, { ...level2Valid, answer_type: 'selection', expected_answer: 'Une addition' }).ok, true);
  assert.equal(adaptPrerequisiteContent(typedSlot, { ...level2Valid, answer_type: 'ordering', choices: ['1', '2'], expected_answer: ['2', '1'] }).ok, true);
  assert.equal(adaptPrerequisiteContent(typedSlot, { ...level2Valid, answer_type: 'time', choices: undefined, check_question: 'Quelle heure indique cette horloge ?', expected_answer: '14 h 30' }).ok, true);
});

test('time of day is distinct from a quantity with units', () => {
  const typedSlot = { ...duration[1], answerTypes: ['time', 'numeric'] };
  assert.equal(adaptPrerequisiteContent(typedSlot, { ...level2Valid, answer_type: 'time', choices: undefined, check_question: 'Quelle heure indique cette horloge ?', expected_answer: '14:30' }).ok, true);
  assert.equal(adaptPrerequisiteContent(typedSlot, { ...level2Valid, answer_type: 'time', choices: undefined, check_question: 'Combien de minutes dure cette activité ?', expected_answer: '5 minutes' }).ok, false);
  assert.equal(adaptPrerequisiteContent(typedSlot, { ...level2Valid, answer_type: 'numeric', choices: undefined, check_question: 'Combien de minutes ?', expected_answer: '5 minutes' }).ok, false);
});

test('Fractions expose resolution status for each prerequisite', () => {
  const results = fractions.map((slot) => adaptPrerequisiteContent(slot, level1Valid));
  assert.deepEqual(results.map((result) => result.diagnosticSkillStatus), ['resolved', 'generic', 'generic']);
  assert.ok(results.every((result) => result.ok));
});

test('adapter output fills only prerequisite content and protects code-owned controls', () => {
  const result = adaptPrerequisiteContent(duration[0], level1Valid);
  assert.equal(result.ok, true);
  const draft = assembleLessonBlueprint(buildLessonBlueprint(durationTopic, durationObjectives), durationObjectives.map((objective) => objective.id)).draft;
  const filled = fillSlot(draft, duration[0].slotId, result.content);
  assert.equal(filled.success, true, JSON.stringify(filled));
  const slot = filled.draft.levels[0].slots.find((candidate) => candidate.slotId === duration[0].slotId);
  assert.equal(slot.diagnosticSkillStatus, 'resolved');
  assert.deepEqual(slot.forbiddenTargetObjectiveIds, duration[0].forbiddenTargetObjectiveIds);
  assert.deepEqual(slot.objectiveIds, duration[0].objectiveIds);
});

test('structural prerequisite mutations and obvious placeholders are rejected', () => {
  const structural = adaptPrerequisiteContent(duration[0], { ...level1Valid, slotId: 'x', objectiveIds: ['x'], mustPrecedeObjectiveIds: ['x'], forbiddenTargetObjectiveIds: [], diagnosticSkill: 'invented', diagnosticSkillStatus: 'resolved', mastery: {} });
  assert.equal(structural.ok, false);
  assert.ok(structural.errors.every((entry) => entry.code === 'structural_field'));
  assert.equal(adaptPrerequisiteContent(duration[0], { ...level1Valid, description: 'TODO' }).ok, false);
});

test('prerequisite adapter metrics report structural and pedagogical states', () => {
  const slots = [...duration, ...fractions];
  const results = slots.map((slot, index) => adaptPrerequisiteContent(slot, index === 0 ? level1Valid : level2Valid));
  const metrics = prerequisiteAdapterMetrics(results, slots);
  assert.deepEqual(metrics, { prerequisite_slots_total: 6, prerequisite_slots_resolved: 2, prerequisite_slots_generic: 4, prerequisite_slots_missing_skill: 0, prerequisite_content_valid: 6, prerequisite_content_rejected: 0, prerequisite_answer_errors: 0 });
});
