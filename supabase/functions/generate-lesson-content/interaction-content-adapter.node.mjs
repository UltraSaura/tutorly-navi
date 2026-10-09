import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLessonBlueprint } from './lesson-blueprint.ts';
import { assembleLessonBlueprint } from './lesson-assembly.ts';
import {
  adaptInteractionContent,
  fillInteractionSlot,
  interactionAdapterMetrics,
} from './interaction-content-adapter.ts';

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
  const assembled = assembleLessonBlueprint(blueprint, objectives.map((objective) => objective.id));
  assert.equal(assembled.success, true);
  return assembled.draft;
}

function slot(type, answerTypes = ['multiple_choice', 'numeric', 'time', 'short_text', 'selection', 'ordering']) {
  return { slotId: `test-${type}`, kind: 'interaction', blockType: type, answerTypes };
}

test('guided_example validates meaningful context and steps', () => {
  const valid = adaptInteractionContent(slot('guided_example'), { context: 'On observe la relation.', steps: [{ instruction: 'Repère les données.', reason: 'Elles indiquent le calcul.' }] });
  assert.equal(valid.ok, true);
  for (const raw of [{ context: ' ', steps: [{ instruction: 'x', reason: 'y' }] }, { context: 'x', steps: [{ instruction: 'x' }] }, { context: 'x', steps: [{ instruction: 'x', reason: 'y' }], slotId: 'changed' }]) {
    assert.equal(adaptInteractionContent(slot('guided_example'), raw).ok, false);
  }
});

test('prediction requires distinct choices, membership, and explanation', () => {
  const valid = adaptInteractionContent(slot('prediction'), { question: 'Quelle réponse prévois-tu ?', choices: ['A', 'B'], correct_answer: 'A', explanation: 'A correspond au modèle.' });
  assert.equal(valid.ok, true);
  assert.equal(adaptInteractionContent(slot('prediction'), { question: 'Q', choices: ['A', 'a'], correct_answer: 'A', explanation: 'E' }).ok, false);
  assert.equal(adaptInteractionContent(slot('prediction'), { question: 'Q', choices: ['A', 'B'], correct_answer: 'C', explanation: 'E' }).ok, false);
  assert.equal(adaptInteractionContent(slot('prediction'), { question: 'Q', choices: ['A', 'B'], correct_answer: 'A' }).ok, false);
  assert.equal(adaptInteractionContent(slot('student_try'), { question: 'Q', choices: ['A', 'B'], correct_answer: 'A', explanation: 'E' }).ok, false);
});

test('student_try and feedback_checkpoint enforce answer semantics', () => {
  assert.equal(adaptInteractionContent(slot('student_try', ['numeric']), { question: 'Combien font 2 + 2 ?', answer_type: 'numeric', correct_answer: 4, success_feedback: 'Oui.', error_feedback: 'Recompte.' }).ok, true);
  assert.equal(adaptInteractionContent(slot('student_try', ['multiple_choice']), { question: 'Choisis.', answer_type: 'multiple_choice', choices: ['A', 'B'], correct_answer: 'B', success_feedback: 'Oui.', error_feedback: 'Essaie.' }).ok, true);
  assert.equal(adaptInteractionContent(slot('student_try', ['time']), { question: 'Quelle heure est-il ?', answer_type: 'time', correct_answer: '14:30', success_feedback: 'Oui.', error_feedback: 'Observe.' }).ok, true);
  assert.equal(adaptInteractionContent(slot('feedback_checkpoint', ['short_text']), { question: 'Explique.', answer_type: 'numeric', correct_answer: 4, success_feedback: 'Oui.', error_feedback: 'Essaie.' }).ok, false);
  assert.equal(adaptInteractionContent(slot('student_try', ['numeric']), { question: 'Q', answer_type: 'numeric', correct_answer: '4 s', success_feedback: 'Oui.', error_feedback: 'Non.' }).ok, false);
  assert.equal(adaptInteractionContent(slot('feedback_checkpoint'), { question: 'Q', answer_type: 'short_text', correct_answer: 'A', success_feedback: 'Oui.' }).ok, false);
  assert.equal(adaptInteractionContent(slot('student_try'), { question: 'Q', answer_type: 'numeric', correct_answer: { value: 300, unit: 'second' }, success_feedback: 'Oui.', error_feedback: 'Non.' }).errors.some((entry) => entry.code === 'UNSUPPORTED_QUANTITY_ANSWER'), true);
});

test('time of day is accepted but duration quantities are rejected', () => {
  assert.equal(adaptInteractionContent(slot('student_try', ['time']), { question: 'Quelle heure indique l’horloge ?', answer_type: 'time', correct_answer: '08 h 45', success_feedback: 'Oui.', error_feedback: 'Observe.' }).ok, true);
  const duration = adaptInteractionContent(slot('student_try', ['time']), { question: 'Quelle durée faut-il convertir ?', answer_type: 'time', correct_answer: '2 h 30 min', success_feedback: 'Oui.', error_feedback: 'Non.' });
  assert.equal(duration.ok, false);
  assert.equal(duration.errors.some((entry) => entry.code === 'UNSUPPORTED_QUANTITY_ANSWER'), true);
  const numericDuration = adaptInteractionContent(slot('student_try', ['numeric']), { question: 'Convertis 5 minutes en secondes.', answer_type: 'numeric', correct_answer: 300, success_feedback: 'Oui.', error_feedback: 'Non.' });
  assert.equal(numericDuration.ok, false);
  assert.equal(numericDuration.errors.some((entry) => entry.code === 'UNSUPPORTED_QUANTITY_ANSWER'), true);
});

test('fraction answers use existing text/choice semantics; numeric fractions are rejected', () => {
  assert.equal(adaptInteractionContent(slot('student_try', ['short_text']), { question: 'Écris la fraction.', answer_type: 'short_text', correct_answer: '1/2', success_feedback: 'Oui.', error_feedback: 'Non.' }).ok, true);
  assert.equal(adaptInteractionContent(slot('student_try', ['multiple_choice']), { question: 'Choisis la fraction.', answer_type: 'multiple_choice', choices: ['1/2', '2/3'], correct_answer: '1/2', success_feedback: 'Oui.', error_feedback: 'Non.' }).ok, true);
  assert.equal(adaptInteractionContent(slot('student_try', ['numeric']), { question: 'Écris la fraction.', answer_type: 'numeric', correct_answer: '1/2', success_feedback: 'Oui.', error_feedback: 'Non.' }).ok, false);
});

test('structural mutations and wrong-slot payloads are rejected', () => {
  const mutation = adaptInteractionContent(slot('student_try'), { question: 'Q', answer_type: 'short_text', correct_answer: 'A', success_feedback: 'Oui.', error_feedback: 'Non.', objectiveIds: ['changed'] });
  assert.equal(mutation.ok, false);
  assert.equal(mutation.errors.some((entry) => entry.code === 'structural_mutation'), true);
  assert.equal(adaptInteractionContent(slot('student_try'), { question: 'Q', choices: ['A', 'B'], correct_answer: 'A', explanation: 'E' }).ok, false);
});

test('adapter fills only the selected interaction slot and preserves draft structure', () => {
  const draft = draftFor(durationTopic, durationObjectives);
  const target = draft.levels[0].slots.find((candidate) => candidate.blockType === 'student_try');
  const before = JSON.parse(JSON.stringify(target));
  const result = fillInteractionSlot(draft, target.slotId, { question: 'Choisis.', answer_type: 'multiple_choice', choices: ['A', 'B'], correct_answer: 'A', success_feedback: 'Oui.', error_feedback: 'Non.' });
  assert.equal(result.success, true, JSON.stringify(result));
  const after = result.draft.levels[0].slots.find((candidate) => candidate.slotId === target.slotId);
  assert.equal(after.slotId, before.slotId);
  assert.equal(after.kind, before.kind);
  assert.equal(after.blockType, before.blockType);
  assert.deepEqual(after.objectiveIds, before.objectiveIds);
  assert.equal(after.status, 'complete');
  assert.equal(after.content.question, 'Choisis.');
  assert.equal(draft.levels[0].slots.find((candidate) => candidate.slotId === target.slotId).status, 'pending');
});

test('real Durées and Fractions blueprints expose all interaction families and remain incomplete', () => {
  for (const [topic, objectives] of [[durationTopic, durationObjectives], [fractionTopic, fractionObjectives]]) {
    const draft = draftFor(topic, objectives);
    for (const level of draft.levels) {
      for (const type of ['guided_example', 'prediction', 'student_try', 'feedback_checkpoint']) {
        const interaction = level.slots.find((candidate) => candidate.blockType === type);
        assert.ok(interaction, `${topic.name} level ${level.levelNumber} missing ${type}`);
        const fixture = type === 'guided_example'
          ? { context: 'Un exemple.', steps: [{ instruction: 'Observe.', reason: 'Repère la relation.' }] }
          : type === 'prediction'
            ? { question: 'Quelle réponse prévois-tu ?', choices: ['A', 'B'], correct_answer: 'A', explanation: 'A suit le modèle.' }
            : { question: 'Choisis la bonne réponse.', answer_type: 'multiple_choice', choices: ['A', 'B'], correct_answer: 'A', success_feedback: 'Oui.', error_feedback: 'Reprends le modèle.' };
        assert.equal(adaptInteractionContent(interaction, fixture).ok, true, `${topic.name} ${type}`);
      }
    }
    assert.ok(draft.levels.some((level) => level.slots.some((slot) => slot.status === 'pending')));
  }
});

test('metrics classify interaction outcomes', () => {
  const slots = [slot('guided_example'), slot('prediction'), slot('student_try', ['numeric']), slot('feedback_checkpoint', ['short_text'])];
  const results = [
    adaptInteractionContent(slots[0], { context: 'C', steps: [{ instruction: 'I', reason: 'R' }] }),
    adaptInteractionContent(slots[1], { question: 'Q', choices: ['A', 'B'], correct_answer: 'A', explanation: 'E' }),
    adaptInteractionContent(slots[2], { question: 'Convertis 5 minutes en secondes.', answer_type: 'numeric', correct_answer: 300, success_feedback: 'Oui.', error_feedback: 'Non.' }),
    adaptInteractionContent(slots[3], { question: 'Q', answer_type: 'numeric', correct_answer: 'A', success_feedback: 'Oui.', error_feedback: 'Non.', type: 'student_try' }),
  ];
  const metrics = interactionAdapterMetrics(results, slots);
  assert.equal(metrics.interaction_slots_total, 4);
  assert.equal(metrics.guided_example_valid, 1);
  assert.equal(metrics.prediction_valid, 1);
  assert.equal(metrics.interaction_content_rejected, 2);
  assert.equal(metrics.unsupported_quantity_answers, 1);
  assert.equal(metrics.structural_mutation_rejections, 1);
});
