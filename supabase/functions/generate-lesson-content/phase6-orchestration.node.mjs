import assert from 'node:assert/strict';
import test from 'node:test';
import { runBoundedSlotPipeline } from './slot-regeneration.ts';
import { buildLessonBlueprint } from './lesson-blueprint.ts';
import { assembleLessonBlueprint, materializeV21 } from './lesson-assembly.ts';

const valid = (value) => ({ ok: true, value });
const invalid = (...errors) => ({ ok: false, errors });
const slots = [{ slotId: 'concept', family: 'concept' }, { slotId: 'mastery', family: 'mastery' }, { slotId: 'student_try', family: 'student_try' }];

test('initial concept failure requests only concept regeneration', async () => {
  const calls = [];
  const result = await runBoundedSlotPipeline({ slots, initial: { concept: 'bad', mastery: 'good', student_try: 'good' }, adapt: (slot, raw) => raw === 'bad' ? invalid('invalid') : valid(raw), regenerate: async (slot) => { calls.push(slot.slotId); return 'fixed'; } });
  assert.deepEqual(calls, ['concept']);
  assert.equal(result.regenerationCalls, 1);
  assert.equal(result.results.mastery.attempt, 1);
  assert.equal(result.results.student_try.attempt, 1);
});

test('concept and mastery failures request exactly two individual regenerations', async () => {
  const calls = [];
  const result = await runBoundedSlotPipeline({ slots, initial: { concept: 'bad', mastery: 'bad', student_try: 'good' }, adapt: (slot, raw) => raw === 'bad' ? invalid('invalid') : valid(raw), regenerate: async (slot) => { calls.push(slot.slotId); return 'fixed'; } });
  assert.deepEqual(calls, ['concept', 'mastery']);
  assert.equal(result.regenerationCalls, 2);
});

test('passing slots remain unchanged and regenerated content fills the original slot', async () => {
  const result = await runBoundedSlotPipeline({ slots, initial: { concept: 'bad', mastery: 'keep-byte-for-byte', student_try: 'keep-too' }, adapt: (slot, raw) => raw === 'bad' ? invalid('invalid') : valid(raw), regenerate: async () => 'new-concept' });
  assert.equal(result.results.concept.raw, 'new-concept');
  assert.equal(result.results.mastery.raw, 'keep-byte-for-byte');
  assert.equal(result.results.student_try.raw, 'keep-too');
});

test('a failed regenerated slot remains failed and receives no third attempt', async () => {
  let calls = 0;
  const result = await runBoundedSlotPipeline({ slots: [slots[0]], initial: { concept: 'bad' }, adapt: () => invalid('still invalid'), regenerate: async () => { calls += 1; return 'still bad'; } });
  assert.equal(calls, 1);
  assert.equal(result.results.concept.attempt, 2);
  assert.equal(result.results.concept.ok, false);
});

test('unresolved prerequisites are not generated and do not block assembly', () => {
  const topic = { id: 'topic', name: 'Durées', levelCode: 'cm2' };
  const objectives = [
    { id: 'b1f695e8-c376-4893-81f9-644738d3d653', text: 'Résoudre des problèmes impliquant des durées.' },
    { id: 'a524af84-f539-47ae-84ca-df4670bffcdc', text: "Lire l'heure sur une horloge et calculer des durées." },
    { id: '5440a1a9-f1b8-4798-92d7-f44fe0adbe30', text: 'Utiliser les unités de durée et effectuer des conversions.' },
  ];
  const blueprint = buildLessonBlueprint(topic, objectives);
  const assembled = assembleLessonBlueprint(blueprint, objectives.map((item) => item.id));
  assert.equal(assembled.success, true);
  const prereq = assembled.draft.levels[1].slots.find((slot) => slot.kind === 'prerequisite');
  assert.equal(prereq.requirement, 'optional');
  assert.equal(prereq.status, 'pending');
});

test('resolved prerequisites remain mandatory', () => {
  const topic = { id: 'topic', name: 'Durées', levelCode: 'cm2' };
  const objective = { id: '5440a1a9-f1b8-4798-92d7-f44fe0adbe30', text: 'Utiliser les unités de durée et effectuer des conversions.' };
  const blueprint = buildLessonBlueprint(topic, [objective]);
  const assembled = assembleLessonBlueprint(blueprint, [objective.id]);
  assert.equal(assembled.success, true);
  const prereq = assembled.draft.levels[0].slots.find((slot) => slot.kind === 'prerequisite');
  assert.equal(prereq.requirement, 'mandatory');
});

test('unknown regenerated slot IDs are rejected by the exact slot set', () => {
  const expected = new Set(['concept', 'mastery']);
  const returned = ['concept', 'mastery', 'unknown'];
  assert.deepEqual(returned.filter((id) => !expected.has(id)), ['unknown']);
});

test('regenerated content cannot mutate structure when adapter rejects structural fields', async () => {
  const result = await runBoundedSlotPipeline({ slots: [slots[0]], initial: { concept: 'bad' }, adapt: (_slot, raw) => typeof raw === 'object' ? invalid('structural mutation') : invalid('invalid'), regenerate: async () => ({ objectiveIds: ['changed'] }) });
  assert.equal(result.results.concept.ok, false);
  assert.deepEqual(result.results.concept.raw, { objectiveIds: ['changed'] });
});

test('optional unresolved prerequisites are omitted from materialization', () => {
  const topic = { id: 'topic', name: 'Durées', levelCode: 'cm2' };
  const objective = { id: 'b1f695e8-c376-4893-81f9-644738d3d653', text: 'Résoudre des problèmes impliquant des durées.' };
  const blueprint = buildLessonBlueprint(topic, [objective]);
  const assembled = assembleLessonBlueprint(blueprint, [objective.id]);
  assert.equal(assembled.success, true);
  const result = materializeV21(assembled.draft);
  assert.equal(result.success, false); // other mandatory content is still pending
});
