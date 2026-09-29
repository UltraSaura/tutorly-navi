import assert from 'node:assert/strict';
import test from 'node:test';
import { parsePhase6Envelope } from './phase6-envelope-parser.ts';
import { adaptLevelContent } from './level-content-adapter.ts';

test('initial valid slots envelope passes', () => {
  assert.deepEqual(parsePhase6Envelope(JSON.stringify({ slots: { concept: { title: 'x' } } }), 'slots'), { concept: { title: 'x' } });
});

test('initial slot envelope is rejected', () => {
  assert.throws(() => parsePhase6Envelope(JSON.stringify({ slot: { title: 'x' } }), 'slots'), /SLOTS_ENVELOPE_FAILED/);
});

test('regeneration valid slot envelope passes', () => {
  assert.deepEqual(parsePhase6Envelope(JSON.stringify({ slot: { title: 'x' } }), 'slot'), { title: 'x' });
});

test('regeneration slots envelope is rejected', () => {
  assert.throws(() => parsePhase6Envelope(JSON.stringify({ slots: { concept: {} } }), 'slot'), /SLOT_ENVELOPE_FAILED/);
});

test('regeneration multiple payloads are rejected', () => {
  assert.throws(() => parsePhase6Envelope(JSON.stringify({ slot: { slots: { concept: {}, mastery: {} } } }), 'slot'), /SLOT_ENVELOPE_FAILED/);
});

test('unexpected top-level fields are rejected', () => {
  assert.throws(() => parsePhase6Envelope(JSON.stringify({ slot: {}, level: 1 }), 'slot'), /SLOT_ENVELOPE_FAILED/);
});

test('malformed JSON is rejected', () => {
  assert.throws(() => parsePhase6Envelope('{', 'slot'));
});

test('valid regeneration content still goes through its typed adapter', () => {
  const raw = parsePhase6Envelope(JSON.stringify({ slot: { lesson_goal: 'Comprendre.', success_criteria: ['Je peux expliquer.'], misconceptions: [] } }), 'slot');
  const result = adaptLevelContent({ slotId: 'level-1-content', kind: 'level_content', objectiveIds: ['objective'], levelNumber: 1 }, raw);
  assert.equal(result.ok, true);
});

test('regeneration envelope cannot supply another slot ID or fill another slot', () => {
  const raw = parsePhase6Envelope(JSON.stringify({ slot: { slotId: 'mastery', lesson_goal: 'x' } }), 'slot');
  assert.equal(raw.slotId, 'mastery');
  const result = adaptLevelContent({ slotId: 'level-1-content', kind: 'level_content', objectiveIds: ['objective'], levelNumber: 1 }, raw);
  assert.equal(result.ok, false);
  assert.equal(result.errors.some((entry) => entry.code === 'structural_mutation'), true);
});
