import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLessonBlueprint } from './lesson-blueprint.ts';
import { assembleLessonBlueprint } from './lesson-assembly.ts';
import { adaptConceptContent } from './concept-content-adapter.ts';
import { buildSlotRegenerationPrompt } from './slot-regeneration-prompt.ts';

const blueprint = buildLessonBlueprint({ id: 'topic', name: 'Durées', levelCode: 'cm2' }, [{ id: 'objective', text: 'Utiliser les unités de durée et effectuer des conversions.' }]);
const assembled = assembleLessonBlueprint(blueprint, ['objective']);
assert.equal(assembled.success, true);
const slot = assembled.draft.levels[0].slots.find((candidate) => candidate.kind === 'concept');
const base = {
  title: 'Unités de durée', content: 'Une durée mesure le temps écoulé.',
  key_points: [{ label: 'Relation', text: 'Une minute contient 60 secondes.' }],
  takeaway: 'Repère d’abord l’unité de départ et l’unité demandée, puis choisis l’opération.',
  visual: { kind: 'unit_conversion', purpose: 'Relier les unités autorisées.', alt_text: 'Relations entre unités.', data: { units: ['seconde', 'minute'], relations: [{ from: 'minute', to: 'seconde', factor: 60 }] } },
};

test('A: takeaway repeating key-point relationship is rejected', () => {
  const result = adaptConceptContent(slot, { ...base, takeaway: 'Retiens qu’une minute contient 60 secondes.' });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((entry) => entry.code === 'semantic_duplication'));
});

test('B: takeaway repeating the content definition is rejected', () => {
  const result = adaptConceptContent(slot, { ...base, takeaway: 'Une durée mesure le temps écoulé.' });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((entry) => entry.code === 'semantic_duplication'));
});

test('C: actionable takeaway with distinct role passes', () => {
  assert.equal(adaptConceptContent(slot, base).ok, true);
});

test('D: relation endpoint absent from declared units is rejected', () => {
  const result = adaptConceptContent(slot, { ...base, visual: { ...base.visual, data: { units: ['seconde', 'minute'], relations: [{ from: 'semaine', to: 'jour', factor: 7 }] } } });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((entry) => entry.code === 'undeclared_relation_unit'));
});

test('E: all relation endpoints declared passes', () => {
  assert.equal(adaptConceptContent(slot, base).ok, true);
});

test('F: concept prompt forbids fields outside its contract', () => {
  const prompt = buildSlotRegenerationPrompt({ topic: 'Durées CM2', levelNumber: 1, levelTitle: 'Fondations', objectiveText: 'Objectif', curriculumScope: 'seconde, minute, heure et jour uniquement', slot });
  assert.match(prompt, /lesson_goal, success_criteria, misconceptions, prerequisites/);
  assert.match(prompt, /champ concept imbriqué/);
});

test('G: existing valid concept fixture remains valid', () => {
  assert.equal(adaptConceptContent(slot, { ...base, visual: { kind: 'unit_conversion', purpose: 'Conversion.', alt_text: 'Conversion.', data: { from: 'minute', to: 'seconde', factor: 60 } } }).ok, true);
});
