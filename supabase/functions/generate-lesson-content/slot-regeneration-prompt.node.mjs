import assert from 'node:assert/strict';
import test from 'node:test';
import { buildLessonBlueprint } from './lesson-blueprint.ts';
import { assembleLessonBlueprint } from './lesson-assembly.ts';
import { buildSlotRegenerationPrompt } from './slot-regeneration-prompt.ts';
import { adaptConceptContent } from './concept-content-adapter.ts';
import { parsePhase6Envelope } from './phase6-envelope-parser.ts';

const blueprint = buildLessonBlueprint({ id: 'topic', name: 'Durées', levelCode: 'cm2' }, [{ id: 'objective', text: 'Utiliser les unités de durée et effectuer des conversions.' }]);
const assembled = assembleLessonBlueprint(blueprint, ['objective']);
assert.equal(assembled.success, true);
const slots = assembled.draft.levels[0].slots;
const concept = slots.find((slot) => slot.kind === 'concept');
const mastery = slots.find((slot) => slot.kind === 'mastery');
const studentTry = slots.find((slot) => slot.blockType === 'student_try');
const context = 'Objectif du niveau uniquement; contexte de lecture seule, ne pas recopier.';

test('A: concept request is a direct slot contract', () => {
  const prompt = buildSlotRegenerationPrompt({ topic: 'Durées CM2', levelNumber: 1, levelTitle: 'Fondations', objectiveText: 'Utiliser les unités de durée.', slot: concept, acceptedContext: context });
  assert.match(prompt, /exactement un objet JSON.*\{"slot":\{\.\.\.\}\}/s);
  assert.match(prompt, /title:string.*content:string.*key_points/s);
  assert.match(prompt, /lesson_goal, success_criteria, misconceptions, prerequisites, sequence, mastery,/);
  assert.match(prompt, /jamais \{"slot":\{"concept":\{\.\.\.\}\}\}/);
});

test('B: mastery request contains only mastery question contract', () => {
  const prompt = buildSlotRegenerationPrompt({ topic: 'Durées CM2', levelNumber: 1, levelTitle: 'Fondations', objectiveText: 'Objectif', slot: mastery });
  assert.match(prompt, /\{questions:\[\.\.\.\]\}/);
  assert.doesNotMatch(prompt, /title:string|visual est/);
});

test('C: student_try request exposes its answer enum', () => {
  const prompt = buildSlotRegenerationPrompt({ topic: 'Durées CM2', levelNumber: 1, levelTitle: 'Fondations', objectiveText: 'Objectif', slot: studentTry });
  assert.match(prompt, /Contrat student_try/);
  assert.match(prompt, /answer_type autorisés/);
});

test('D: no whole-level schema is requested', () => {
  for (const slot of [concept, mastery, studentTry]) {
    const prompt = buildSlotRegenerationPrompt({ topic: 'Durées CM2', levelNumber: 1, levelTitle: 'Fondations', objectiveText: 'Objectif', slot });
    assert.match(prompt, /uniquement le contenu frais du slot/);
    assert.doesNotMatch(prompt, /Retourne.*niveau complet/);
  }
});

test('E: accepted context is explicitly non-output', () => {
  const prompt = buildSlotRegenerationPrompt({ topic: 'Durées CM2', levelNumber: 1, levelTitle: 'Fondations', objectiveText: 'Objectif', slot: concept, acceptedContext: context });
  assert.match(prompt, /CONTEXTE ACCEPTÉ \(lecture seule, ne pas recopier dans la réponse\)/);
});

test('F: nested concept wrapper is rejected by the concept adapter', () => {
  const result = adaptConceptContent(concept, { concept: { title: 'x', content: 'y' } });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.field === 'key_points'));
});

test('G: direct concept slot shape is adapter-routable', () => {
  const result = adaptConceptContent(concept, { title: 'Unités de durée', content: 'Une durée mesure le temps écoulé.', key_points: [{ label: 'Ordre', text: 'La seconde est plus courte que la minute.' }], takeaway: 'Comparer les unités avant de convertir.', visual: { kind: 'timeline', purpose: 'Voir l’ordre des unités.', alt_text: 'Frise des unités.', data: { units: ['seconde', 'minute'] } } });
  assert.equal(result.ok, true);
});

test('H: context fields cannot masquerade as concept output', () => {
  const result = adaptConceptContent(concept, { lesson_goal: 'x', success_criteria: ['y'], title: 'Unités', content: 'Introduction.', key_points: [{ label: 'Ordre', text: 'La seconde est plus courte.' }], takeaway: 'Comparer avant de convertir.', visual: { kind: 'timeline', purpose: 'Voir l’ordre.', alt_text: 'Frise.', data: { units: ['seconde', 'minute'] } } });
  assert.equal(result.ok, true);
  assert.equal('lesson_goal' in result.content, false);
});

test('I: envelope parser routes only the slot object', () => {
  const parsed = parsePhase6Envelope(JSON.stringify({ slot: { title: 'T', content: 'C' } }), 'slot');
  assert.deepEqual(parsed, { title: 'T', content: 'C' });
});

test('J: full lesson-shaped slot is rejected by concept adapter', () => {
  const result = adaptConceptContent(concept, { lesson_goal: 'x', levels: [], lesson: {}, concept: { title: 'T', content: 'C' } });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.field === 'key_points'));
});
