import test from 'node:test';
import assert from 'node:assert/strict';
import { runBoundedSlotPipeline } from './slot-regeneration.ts';
import { buildSlotRegenerationPrompt } from './slot-regeneration-prompt.ts';
import { adaptMasteryContent } from './mastery-content-adapter.ts';

const slot = { slotId: 'mastery', family: 'mastery' };
const q = (overrides = {}) => ({ id: 'q1', question: 'Quelle conversion est correcte ?', answer_type: 'multiple_choice', choices: ['5 minutes = 300 secondes', '5 minutes = 50 secondes'], correct_answer: '5 minutes = 300 secondes', skill: 'Conversion', difficulty: 1, success_feedback: 'Oui.', error_feedback: 'Observe encore.', ...overrides });
const masterySlot = { slotId: 'mastery', kind: 'mastery', objectiveIds: ['objective'], questionCount: { min: 1, max: 4 }, answerTypes: ['multiple_choice', 'numeric', 'time'] };

test('1-4: final failed regeneration is recorded and later levels continue', async () => {
  const completed = [];
  const reports = [];
  for (const level of [1, 2, 3]) {
    try {
      const result = await runBoundedSlotPipeline({ slots: [slot], initial: { mastery: level === 1 ? 'bad' : 'good' }, adapt: (_slot, raw) => raw === 'good' ? { ok: true, value: raw } : { ok: false, errors: ['invalid'] }, regenerate: async () => { if (level === 1) throw new Error('simulated final slot failure'); return 'good'; } });
      reports.push(result);
    } catch (error) {
      reports.push({ level, status: 'INCOMPLETE', error: error.message });
    }
    completed.push(level);
  }
  assert.deepEqual(completed, [1, 2, 3]);
  assert.equal(reports.length, 3);
});

test('5-7: attempt accounting invariants are explicit', async () => {
  const result = await runBoundedSlotPipeline({ slots: [slot], initial: { mastery: 'bad' }, adapt: (_slot, raw) => raw === 'good' ? { ok: true, value: raw } : { ok: false, errors: ['invalid'] }, regenerate: async () => 'good' });
  const outcome = result.results.mastery;
  const initialGenerated = 1;
  const initialValid = outcome.attempt === 1 && outcome.ok ? 1 : 0;
  const initialFailed = initialGenerated - initialValid;
  const regenerationSucceeded = outcome.attempt === 2 && outcome.ok ? 1 : 0;
  const finalValid = outcome.ok ? 1 : 0;
  const finalFailed = 1 - finalValid;
  assert.equal(initialValid + initialFailed, initialGenerated);
  assert.equal(result.regenerationCalls, 1);
  assert.equal(initialValid, 0);
  assert.equal(initialFailed, 1);
  assert.equal(regenerationSucceeded, 1);
  assert.equal(finalValid + finalFailed, 1);
});

test('8-9: failed once/passed once and failed twice are counted once per phase', async () => {
  const pass = await runBoundedSlotPipeline({ slots: [slot], initial: { mastery: 'bad' }, adapt: (_slot, raw) => raw === 'fixed' ? { ok: true, value: raw } : { ok: false, errors: ['invalid'] }, regenerate: async () => 'fixed' });
  const fail = await runBoundedSlotPipeline({ slots: [slot], initial: { mastery: 'bad' }, adapt: () => ({ ok: false, errors: ['invalid'] }), regenerate: async () => 'still-bad' });
  assert.equal(pass.results.mastery.attempt, 2); assert.equal(pass.results.mastery.ok, true);
  assert.equal(fail.results.mastery.attempt, 2); assert.equal(fail.results.mastery.ok, false);
});

test('10: the observed duration quantity failure remains covered', () => {
  const result = adaptMasteryContent(masterySlot, { questions: [q({ answer_type: 'numeric', choices: undefined, correct_answer: '300 secondes', question: 'Convertis 5 minutes en secondes.' })] });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((entry) => entry.code === 'UNSUPPORTED_QUANTITY_ANSWER'));
});

test('11: safe unit-bearing multiple choice passes', () => {
  assert.equal(adaptMasteryContent(masterySlot, { questions: [q()] }).ok, true);
});

test('12: unsupported free quantity remains rejected and prompt forbids it', () => {
  const result = adaptMasteryContent(masterySlot, { questions: [q({ answer_type: 'numeric', choices: undefined, correct_answer: '300 secondes' })] });
  assert.equal(result.ok, false);
  const prompt = buildSlotRegenerationPrompt({ topic: 'Durées CM2', levelNumber: 1, levelTitle: 'Fondations', objectiveText: 'Conversions', slot: masterySlot });
  assert.match(prompt, /quantité avec unité/);
  assert.match(prompt, /multiple_choice/);
});
