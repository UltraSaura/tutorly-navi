import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLessonBlueprint } from './lesson-blueprint.ts';
import { assembleLessonBlueprint, assemblyMetrics, fillSlot, getMissingContentSlots, materializeV21 } from './lesson-assembly.ts';
import { validateLessonV21 } from './lesson-v21-contract.ts';

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

function draftFor(topic, objectives) {
  const blueprint = buildLessonBlueprint(topic, objectives);
  const result = assembleLessonBlueprint(blueprint, objectives.map((objective) => objective.id));
  assert.equal(result.success, true);
  return result.draft;
}

function contentFor(slot) {
  if (slot.kind === 'level_content') return { lesson_goal: 'Comprendre et utiliser cette notion.', success_criteria: ['Je peux expliquer la notion.', 'Je peux résoudre un exercice.'], misconceptions: [{ id: `${slot.slotId}-m1`, description: 'Confondre les étapes.', detect_if: 'La réponse mélange les unités.', feedback: 'Reviens à la représentation.', remediation_strategy: 'Reprendre un exemple guidé.' }] };
  if (slot.kind === 'prerequisite') return { description: 'Lire et comparer des nombres entiers.', check_question: 'Quel nombre est le plus grand : 4 ou 7 ?', answer_type: 'multiple_choice', choices: ['4', '7'], expected_answer: '7', remediation_hint: 'Compare les chiffres.' };
  if (slot.kind === 'concept') {
    const visual = slot.visualRequirement === 'required' ? { kind: slot.allowedVisualKinds[0], purpose: 'Montrer la relation étudiée.', alt_text: 'Représentation de la relation.', data: { example: true } } : undefined;
    return { title: 'Une idée essentielle', content: 'Voici le modèle à comprendre.', key_points: slot.requiresKeyPoints ? [{ label: 'Repère', text: 'Observe la relation entre les éléments.' }] : undefined, takeaway: slot.requiresTakeaway ? 'Repère la relation avant de calculer.' : undefined, ...(visual ? { visual } : {}) };
  }
  if (slot.kind === 'interaction' && slot.blockType === 'guided_example') return { context: 'Un exemple guidé.', steps: [{ instruction: 'Observe la situation.', reason: 'Cela identifie la relation.' }] };
  if (slot.kind === 'interaction' && slot.blockType === 'prediction') return { question: 'Quelle réponse prévois-tu ?', choices: ['1', '2'], correct_answer: '1', explanation: 'La relation permet de choisir 1.' };
  if (slot.kind === 'interaction') return { question: 'Quelle est la réponse ?', answer_type: slot.answerTypes?.includes('numeric') ? 'numeric' : slot.answerTypes?.[0] ?? 'short_text', correct_answer: 1, success_feedback: 'Bravo !', error_feedback: 'Observe encore le modèle.' };
  return { questions: [{ id: `${slot.slotId}-q1`, question: 'Quelle réponse est correcte ?', answer_type: 'multiple_choice', choices: ['1', '2'], correct_answer: '1', skill: 'Notion ciblée', difficulty: 1, success_feedback: 'Bravo !', error_feedback: 'Réessaie.' }], skills: ['Notion ciblée'], threshold: 0.8 };
}

function fillComplete(draft) {
  let current = draft;
  for (const slot of current.levels.flatMap((level) => level.slots)) {
    const result = fillSlot(current, slot.slotId, contentFor(slot));
    assert.equal(result.success, true, JSON.stringify(result));
    current = result.draft;
  }
  return current;
}

test('real Durées and Fractions blueprints assemble into incomplete drafts', () => {
  for (const [topic, objectives] of [[durationTopic, durationObjectives], [fractionTopic, fractionObjectives]]) {
    const draft = draftFor(topic, objectives);
    assert.equal(draft.kind, 'lesson-assembly-draft');
    assert.ok(getMissingContentSlots(draft).length > 0);
    assert.equal(materializeV21(draft).success, false);
  }
});

test('visual constraints survive blueprint to draft conversion', () => {
  const duration = draftFor(durationTopic, durationObjectives);
  const concepts = duration.levels.flatMap((level) => level.slots.filter((slot) => slot.kind === 'concept'));
  assert.deepEqual(concepts.map((slot) => [slot.visualRequirement, slot.allowedVisualKinds]), [
    ['required', ['unit_conversion', 'timeline']],
    ['required', ['clock']],
    ['optional', []],
  ]);
  const fractions = draftFor(fractionTopic, fractionObjectives);
  assert.ok(fractions.levels.flatMap((level) => level.slots).some((slot) => slot.allowedVisualKinds?.includes('fraction_bar')));
});

test('complete fixture draft materializes and passes canonical V2.1 validation', () => {
  const draft = fillComplete(draftFor(durationTopic, durationObjectives));
  const materialized = materializeV21(draft);
  assert.equal(materialized.success, true, JSON.stringify(materialized));
  assert.equal(validateLessonV21(materialized.value).success, true);
});

test('slot filling rejects structural mutations', () => {
  const draft = draftFor(durationTopic, durationObjectives);
  const slot = draft.levels[0].slots.find((candidate) => candidate.kind === 'concept');
  for (const mutation of [{ id: 'changed' }, { type: 'rule' }, { objectiveIds: ['changed'] }, { visualRequirement: 'optional' }, { allowedVisualKinds: [] }]) {
    const result = fillSlot(draft, slot.slotId, mutation);
    assert.equal(result.success, false);
  }
  assert.equal(draft.levels[0].slots.find((candidate) => candidate.slotId === slot.slotId).status, 'pending');
});

test('invalid concept content is rejected', () => {
  const draft = draftFor(durationTopic, durationObjectives);
  const slot = draft.levels[0].slots.find((candidate) => candidate.kind === 'concept');
  for (const content of [
    { title: 'x', content: 'y', key_points: [], takeaway: 'z', visual: { kind: 'unit_conversion', purpose: 'x', alt_text: 'x', data: {} } },
    { title: 'x', content: 'y', key_points: Array.from({ length: 5 }, () => ({ label: 'x', text: 'y' })), takeaway: 'z', visual: { kind: 'not-supported', purpose: 'x', alt_text: 'x', data: { x: 1 } } },
    { title: 'x', content: 'y', key_points: [{ label: 'x', text: 'y' }], takeaway: 'z', visual: { kind: 'unit_conversion', purpose: 'x', alt_text: 'x' } },
  ]) assert.equal(fillSlot(draft, slot.slotId, content).success, false);
});

test('invalid interaction, prerequisite, and mastery content is rejected', () => {
  const draft = draftFor(durationTopic, durationObjectives);
  const level = draft.levels[0];
  const prediction = level.slots.find((slot) => slot.blockType === 'prediction');
  assert.equal(fillSlot(draft, prediction.slotId, { question: 'q', choices: ['a', 'b'], correct_answer: 'a', explanation: 'e', answer_type: 'short_text' }).success, false);
  assert.equal(fillSlot(draft, prediction.slotId, { question: 'q', choices: ['only one'], correct_answer: 'a', explanation: 'e' }).success, false);
  const studentTry = level.slots.find((slot) => slot.blockType === 'student_try');
  assert.equal(fillSlot(draft, studentTry.slotId, { question: 'q', answer_type: 'numeric', success_feedback: 'ok', error_feedback: 'retry' }).success, false);
  const prerequisite = level.slots.find((slot) => slot.kind === 'prerequisite');
  assert.equal(fillSlot(draft, prerequisite.slotId, { description: 'd', check_question: 'q', answer_type: 'numeric', expected_answer: 'not numeric', remediation_hint: 'h' }).success, false);
  const mastery = level.slots.find((slot) => slot.kind === 'mastery');
  assert.equal(fillSlot(draft, mastery.slotId, { questions: [], skills: [], threshold: 2 }).success, false);
});

test('assembly metrics report pending content and mutation rejections', () => {
  const draft = draftFor(durationTopic, durationObjectives);
  const metrics = assemblyMetrics(draft, 3);
  assert.equal(metrics.draft_valid, true);
  assert.equal(metrics.materializable, false);
  assert.equal(metrics.mutation_rejections, 3);
  assert.ok(metrics.mandatory_slot_count > 0);
  assert.ok(metrics.missing_content_field_count > 0);
});
