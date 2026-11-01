import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLessonBlueprint } from './lesson-blueprint.ts';
import { assembleLessonBlueprint, fillSlot, materializeV21 } from './lesson-assembly.ts';
import { adaptMasteryContent, fillMasterySlot, masteryAdapterMetrics } from './mastery-content-adapter.ts';
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

function masterySlot(answerTypes = ['multiple_choice', 'numeric', 'time', 'short_text', 'selection', 'ordering']) {
  return { slotId: 'test-mastery', kind: 'mastery', objectiveIds: ['objective-1'], questionCount: { min: 1, max: 4 }, answerTypes };
}

function question(overrides = {}) {
  return { id: 'q1', question: 'Choisis la bonne relation.', answer_type: 'multiple_choice', choices: ['A', 'B'], correct_answer: 'A', skill: 'Relation ciblée', difficulty: 1, success_feedback: 'Bonne réponse.', error_feedback: 'Observe encore le modèle.', ...overrides };
}

test('valid mastery content is accepted and normalized', () => {
  const result = adaptMasteryContent(masterySlot(), { questions: [question()] });
  assert.equal(result.ok, true);
  assert.equal(result.content.questions.length, 1);
});

test('question bounds are enforced without repair', () => {
  const slot = masterySlot();
  assert.equal(adaptMasteryContent(slot, { questions: [] }).ok, false);
  assert.equal(adaptMasteryContent(slot, { questions: [1, 2, 3, 4, 5].map((_, index) => question({ id: `q${index}`, question: `Question ${index}` })) }).ok, false);
  assert.equal(adaptMasteryContent(slot, { questions: [question(), question({ id: 'q2', question: 'Question différente.' })] }).ok, true);
});

test('mastery question quality rejects empty, duplicate, malformed, and leaking content', () => {
  assert.equal(adaptMasteryContent(masterySlot(), { questions: [question({ question: ' ' })] }).ok, false);
  assert.equal(adaptMasteryContent(masterySlot(), { questions: [question(), question({ id: 'q2' })] }).ok, false);
  assert.equal(adaptMasteryContent(masterySlot(), { questions: [question({ choices: ['A', 'a'] })] }).ok, false);
  assert.equal(adaptMasteryContent(masterySlot(), { questions: [question({ correct_answer: 'C' })] }).ok, false);
  assert.equal(adaptMasteryContent(masterySlot(), { questions: [question({ question: '60 minutes = 1 hour. Combien de minutes dans une heure ?', choices: ['30', '60'], correct_answer: '60' })] }).ok, false);
  assert.equal(adaptMasteryContent(masterySlot(), { questions: [question({ question: 'Q', objectiveIds: ['changed'] })] }).ok, false);
});

test('answer leakage distinguishes a normal numeric stem from a revealed answer and preserves choice semantics', () => {
  const numeric = adaptMasteryContent(masterySlot(['numeric']), { questions: [question({ answer_type: 'numeric', choices: undefined, question: 'Convertis 5 minutes en secondes.', correct_answer: '300' })] });
  assert.equal(numeric.ok, false);
  assert.equal(numeric.errors.some((entry) => entry.code === 'answer_leakage'), false);
  assert.equal(numeric.errors.some((entry) => entry.code === 'UNSUPPORTED_QUANTITY_ANSWER'), true);

  const multipleChoice = adaptMasteryContent(masterySlot(['multiple_choice']), { questions: [question({ question: 'Quelle conversion est correcte ?', choices: ['5 minutes = 300 secondes', '5 minutes = 50 secondes'], correct_answer: '5 minutes = 300 secondes' })] });
  assert.equal(multipleChoice.ok, true);
});

test('all canonical answer types are checked', () => {
  assert.equal(adaptMasteryContent(masterySlot(['numeric']), { questions: [question({ answer_type: 'numeric', choices: undefined, correct_answer: 4, question: 'Combien font 2 + 2 ?' })] }).ok, true);
  assert.equal(adaptMasteryContent(masterySlot(['time']), { questions: [question({ answer_type: 'time', choices: undefined, correct_answer: '14:30', question: 'Quelle heure est-il ?' })] }).ok, true);
  assert.equal(adaptMasteryContent(masterySlot(['short_text']), { questions: [question({ answer_type: 'short_text', choices: undefined, correct_answer: '1/2', question: 'Écris la fraction.' })] }).ok, true);
  assert.equal(adaptMasteryContent(masterySlot(['selection']), { questions: [question({ answer_type: 'selection', correct_answer: 'B' })] }).ok, true);
  assert.equal(adaptMasteryContent(masterySlot(['ordering']), { questions: [question({ answer_type: 'ordering', choices: ['seconde', 'minute'], correct_answer: ['seconde', 'minute'], question: 'Ordonne les unités.' })] }).ok, true);
  assert.equal(adaptMasteryContent(masterySlot(['numeric']), { questions: [question({ answer_type: 'short_text', choices: undefined, correct_answer: '4', question: 'Q' })] }).ok, false);
});

test('unit quantities are rejected and time of day remains distinct', () => {
  const unit = adaptMasteryContent(masterySlot(['numeric']), { questions: [question({ answer_type: 'numeric', choices: undefined, correct_answer: '300 s', question: 'Quelle quantité ?' })] });
  assert.equal(unit.ok, false);
  assert.equal(unit.errors.some((entry) => entry.code === 'UNSUPPORTED_QUANTITY_ANSWER'), true);
  const duration = adaptMasteryContent(masterySlot(['time']), { questions: [question({ answer_type: 'time', choices: undefined, correct_answer: '2 h 30 min', question: 'Quelle durée est indiquée ?' })] });
  assert.equal(duration.ok, false);
  assert.equal(duration.errors.some((entry) => entry.code === 'UNSUPPORTED_QUANTITY_ANSWER'), true);
  assert.equal(adaptMasteryContent(masterySlot(['time']), { questions: [question({ answer_type: 'time', choices: undefined, correct_answer: '08 h 45', question: 'Quelle heure indique l’horloge ?' })] }).ok, true);
});

test('fractions use short_text or choices, not numeric', () => {
  assert.equal(adaptMasteryContent(masterySlot(['short_text']), { questions: [question({ answer_type: 'short_text', choices: undefined, correct_answer: '1/2', question: 'Écris la fraction.' })] }).ok, true);
  assert.equal(adaptMasteryContent(masterySlot(['multiple_choice']), { questions: [question({ question: 'Choisis la fraction.', choices: ['1/2', '2/3'], correct_answer: '1/2' })] }).ok, true);
  assert.equal(adaptMasteryContent(masterySlot(['numeric']), { questions: [question({ answer_type: 'numeric', choices: undefined, correct_answer: '1/2', question: 'Écris la fraction.' })] }).ok, false);
});

test('wrong families and structural fields cannot fill mastery', () => {
  assert.equal(adaptMasteryContent(masterySlot(), { questions: [question({ type: 'student_try' })] }).ok, false);
  assert.equal(adaptMasteryContent(masterySlot(), { questions: [question({ prerequisite: true })] }).ok, false);
  assert.equal(adaptMasteryContent(masterySlot(), { questions: [question()], threshold: 0.2 }).ok, false);
  assert.equal(adaptMasteryContent(masterySlot(), { questions: [question()], skills: ['changed'] }).ok, false);
});

test('adapter fills a real Durées mastery slot while preserving code-owned fields', () => {
  const draft = draftFor(durationTopic, durationObjectives);
  const target = draft.levels[0].slots.find((candidate) => candidate.kind === 'mastery');
  const before = JSON.parse(JSON.stringify(target));
  const result = fillMasterySlot(draft, target.slotId, { questions: [question()] });
  assert.equal(result.success, true, JSON.stringify(result));
  const after = result.draft.levels[0].slots.find((candidate) => candidate.slotId === target.slotId);
  assert.deepEqual(after.objectiveIds, before.objectiveIds);
  assert.deepEqual(after.questionCount, before.questionCount);
  assert.deepEqual(after.answerTypes, before.answerTypes);
  assert.equal(after.blockType, undefined);
  assert.equal(after.status, 'complete');
  assert.deepEqual(after.content.skills, before.objectiveIds);
  assert.equal(after.content.threshold, 0.8);
});

test('real Durées and Fractions mastery slots validate safe fixtures', () => {
  for (const [topic, objectives] of [[durationTopic, durationObjectives], [fractionTopic, fractionObjectives]]) {
    const draft = draftFor(topic, objectives);
    for (const level of draft.levels) {
      const target = level.slots.find((candidate) => candidate.kind === 'mastery');
      const fixture = topic.name === 'Fractions'
        ? { questions: [question({ answer_type: 'short_text', choices: undefined, correct_answer: '1/2', question: 'Écris la fraction.' })] }
        : { questions: [question()] };
      assert.equal(adaptMasteryContent(target, fixture).ok, true, `${topic.name} level ${level.levelNumber}`);
    }
  }
});

test('typed boundaries can complete a synthetic lesson and converge to V2.1', () => {
  const draft = draftFor(durationTopic, durationObjectives);
  let current = draft;
  for (const slot of current.levels.flatMap((level) => level.slots)) {
    let content;
    if (slot.kind === 'level_content') content = { lesson_goal: 'Comprendre la notion.', success_criteria: ['Je peux expliquer la notion.'], misconceptions: [{ id: `${slot.slotId}-m1`, description: 'Confusion.', detect_if: 'Réponse incohérente.', feedback: 'Observe le modèle.', remediation_strategy: 'Reprendre un exemple.' }] };
    else if (slot.kind === 'prerequisite') content = { description: 'Lire des nombres.', check_question: 'Quel nombre est le plus grand : 4 ou 7 ?', answer_type: 'multiple_choice', choices: ['4', '7'], expected_answer: '7', remediation_hint: 'Compare les chiffres.' };
    else if (slot.kind === 'concept') content = { title: 'Une idée essentielle', content: 'Voici le modèle.', key_points: slot.requiresKeyPoints ? [{ label: 'Repère', text: 'Observe la relation.' }] : undefined, takeaway: slot.requiresTakeaway ? 'Repère avant de calculer.' : undefined, ...(slot.allowedVisualKinds?.length ? { visual: { kind: slot.allowedVisualKinds[0], purpose: 'Montrer la relation.', alt_text: 'Relation représentée.', data: { from: 'minute', to: 'seconde', factor: 60 } } } : {}) };
    else if (slot.kind === 'interaction') content = slot.blockType === 'guided_example' ? { context: 'Un exemple.', steps: [{ instruction: 'Observe.', reason: 'Repère la relation.' }] } : slot.blockType === 'prediction' ? { question: 'Quelle réponse prévois-tu ?', choices: ['A', 'B'], correct_answer: 'A', explanation: 'A suit le modèle.' } : { question: 'Choisis la réponse.', answer_type: 'multiple_choice', choices: ['A', 'B'], correct_answer: 'A', success_feedback: 'Oui.', error_feedback: 'Observe encore.' };
    else content = undefined;
    if (slot.kind === 'mastery') {
      const result = fillMasterySlot(current, slot.slotId, { questions: [question()] });
      assert.equal(result.success, true, JSON.stringify(result));
      current = result.draft;
    } else {
      const result = fillSlot(current, slot.slotId, content);
      assert.equal(result.success, true, JSON.stringify(result));
      current = result.draft;
    }
  }
  const materialized = materializeV21(current);
  assert.equal(materialized.success, true, JSON.stringify(materialized));
  assert.equal(validateLessonV21(materialized.value).success, true);
});

test('real Durées draft remains non-materializable without fabricated content', () => {
  const draft = draftFor(durationTopic, durationObjectives);
  assert.equal(materializeV21(draft).success, false);
});

test('mastery metrics report rejection categories', () => {
  const slots = [masterySlot(), masterySlot(['numeric'])];
  const results = [
    adaptMasteryContent(slots[0], { questions: [question()] }),
    adaptMasteryContent(slots[1], { questions: [question({ answer_type: 'numeric', choices: undefined, correct_answer: '300 s', question: 'Convertis 5 minutes en secondes.' })] }),
  ];
  const metrics = masteryAdapterMetrics(results, slots);
  assert.equal(metrics.mastery_slots_total, 2);
  assert.equal(metrics.mastery_content_valid, 1);
  assert.equal(metrics.mastery_content_rejected, 1);
  assert.equal(metrics.unsupported_quantity_answers, 1);
});
