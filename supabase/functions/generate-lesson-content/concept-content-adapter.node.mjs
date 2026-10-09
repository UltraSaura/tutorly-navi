import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLessonBlueprint } from './lesson-blueprint.ts';
import { assembleLessonBlueprint, fillSlot, materializeV21 } from './lesson-assembly.ts';
import { adaptConceptContent, conceptAdapterMetrics } from './concept-content-adapter.ts';

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

function conceptSlots(topic, objectives) {
  const blueprint = buildLessonBlueprint(topic, objectives);
  const assembled = assembleLessonBlueprint(blueprint, objectives.map((objective) => objective.id));
  assert.equal(assembled.success, true);
  return { draft: assembled.draft, slots: assembled.draft.levels.flatMap((level) => level.slots.filter((slot) => slot.kind === 'concept')) };
}

const duration = conceptSlots(durationTopic, durationObjectives);
const fractions = conceptSlots(fractionTopic, fractionObjectives);

const durationL1 = { title: 'Les unités de durée', content: "On choisit une unité selon la durée que l'on veut mesurer.", visual: { kind: 'unit_conversion', purpose: 'Comparer les unités de la seconde au jour.', alt_text: 'Conversion entre unités de durée.', data: { from: 'minute', to: 'seconde', factor: 60 } }, key_points: [{ label: 'Conversion', text: '60 secondes = 1 minute.' }, { label: 'Repère', text: '60 minutes = 1 heure.' }], takeaway: "Repère l'unité de départ et celle d'arrivée avant de convertir." };
const durationL2 = { title: "Lire l'heure", content: "Une horloge possède deux aiguilles pour lire une heure.", visual: { kind: 'clock', purpose: 'Montrer la position des aiguilles.', alt_text: 'Horloge indiquant trois heures et quinze minutes.', data: { hour: 3, minute: 15 } }, key_points: [{ label: 'Heures', text: "La petite aiguille indique l'heure." }, { label: 'Minutes', text: 'La grande aiguille indique les minutes.' }], takeaway: "Lis d'abord les heures, puis les minutes." };
const durationL3 = { title: 'Résoudre un problème de durée', content: 'Pour résoudre un problème, repère les heures connues puis choisis le calcul qui relie le début et la fin.' };

test('Durées L1 required visual concept is accepted', () => {
  const result = adaptConceptContent(duration.slots[0], durationL1);
  assert.equal(result.ok, true, JSON.stringify(result));
});

test('Durées L1 invalid cases are rejected', () => {
  for (const candidate of [
    { ...durationL1, visual: undefined },
    { ...durationL1, visual: { ...durationL1.visual, kind: 'clock' } },
    { ...durationL1, visual: { ...durationL1.visual, data: {} } },
    { ...durationL1, key_points: undefined },
    { ...durationL1, key_points: Array.from({ length: 5 }, (_, index) => ({ label: `x${index}`, text: `y${index}` })) },
    { ...durationL1, key_points: [{ label: 'Conversion', text: '60 secondes = 1 minute.' }, { label: 'Conversion', text: '60 secondes = 1 minute.' }] },
    { ...durationL1, content: 'On choisit une unité et une durée mesurée.', key_points: [{ label: 'Idée', text: 'On choisit une unité et une durée mesurée.' }] },
    { ...durationL1, takeaway: undefined },
  ]) assert.equal(adaptConceptContent(duration.slots[0], candidate).ok, false);
});

test('Durées L2 clock concept is accepted and incompatible visuals are rejected', () => {
  assert.equal(adaptConceptContent(duration.slots[1], durationL2).ok, true);
  assert.equal(adaptConceptContent(duration.slots[1], { ...durationL2, visual: { ...durationL2.visual, kind: 'unit_conversion' } }).ok, false);
  assert.equal(adaptConceptContent(duration.slots[1], { ...durationL2, visual: { ...durationL2.visual, data: { hour: 15, minute: 80 } } }).ok, false);
  assert.equal(adaptConceptContent(duration.slots[1], { ...durationL2, content: 'La petite aiguille indique les heures.', key_points: [{ label: 'Heures', text: 'La petite aiguille indique les heures.' }] }).ok, false);
  assert.equal(adaptConceptContent(duration.slots[1], { ...durationL2, takeaway: undefined }).ok, false);
});

test('Durées L3 prose-only concept is accepted when policy is optional', () => {
  const result = adaptConceptContent(duration.slots[2], durationL3);
  assert.equal(result.ok, true, JSON.stringify(result));
});

test('Fractions accept both permitted visual families and reject malformed alternatives', () => {
  const bar = { title: 'Une fraction comme partie d’un tout', content: 'Une fraction partage un tout en parts égales.', visual: { kind: 'fraction_bar', purpose: 'Montrer les parts égales.', alt_text: 'Barre partagée en quatre parts.', data: { parts: 4, filled: 1 } }, key_points: [{ label: 'Dénominateur', text: 'Il indique le nombre de parts égales.' }], takeaway: 'Compte les parts avant de lire la fraction.' };
  const circle = { ...bar, visual: { ...bar.visual, kind: 'fraction_circle', data: { parts: 3, filled: 2 } } };
  assert.equal(adaptConceptContent(fractions.slots[0], bar).ok, true);
  assert.equal(adaptConceptContent(fractions.slots[0], circle).ok, true);
  assert.equal(adaptConceptContent(fractions.slots[0], { ...bar, visual: undefined }).ok, false);
  assert.equal(adaptConceptContent(fractions.slots[0], { ...bar, visual: { ...bar.visual, kind: 'clock' } }).ok, false);
  assert.equal(adaptConceptContent(fractions.slots[0], { ...bar, visual: { ...bar.visual, data: { parts: 1, filled: 2 } } }).ok, false);
});

test('adapter output fills only concept content and preserves structural fields', () => {
  const result = adaptConceptContent(duration.slots[0], durationL1);
  assert.equal(result.ok, true);
  const before = JSON.stringify(duration.draft.levels[0].slots.find((slot) => slot.slotId === duration.slots[0].slotId));
  const filled = fillSlot(duration.draft, duration.slots[0].slotId, result.content);
  assert.equal(filled.success, true, JSON.stringify(filled));
  const slot = filled.draft.levels[0].slots.find((candidate) => candidate.slotId === duration.slots[0].slotId);
  assert.equal(slot.visualRequirement, 'required');
  assert.deepEqual(slot.allowedVisualKinds, ['unit_conversion', 'timeline']);
  assert.deepEqual(slot.objectiveIds, duration.slots[0].objectiveIds);
  assert.equal(JSON.parse(before).status, 'pending');
  assert.equal(slot.status, 'complete');
  assert.equal(materializeV21(filled.draft).success, false);
});

test('structural provider fields are rejected before fillSlot', () => {
  const result = adaptConceptContent(duration.slots[0], { ...durationL1, slotId: 'changed', objectiveIds: ['changed'], type: 'rule', visualRequirement: 'optional', allowedVisualKinds: ['clock'], sequence: [] });
  assert.equal(result.ok, false);
  assert.ok(result.errors.every((entry) => entry.code === 'structural_field'));
});

test('obvious placeholders and raw JSON are rejected', () => {
  assert.equal(adaptConceptContent(duration.slots[0], { ...durationL1, title: 'TODO' }).ok, false);
  assert.equal(adaptConceptContent(duration.slots[0], { ...durationL1, content: '{"kind":"clock"}' }).ok, false);
});

test('adapter metrics count valid and rejected concepts', () => {
  const results = [adaptConceptContent(duration.slots[0], durationL1), adaptConceptContent(duration.slots[1], durationL2), adaptConceptContent(duration.slots[2], durationL3), adaptConceptContent(duration.slots[0], { ...durationL1, visual: undefined })];
  const metrics = conceptAdapterMetrics(results, [...duration.slots, ...fractions.slots]);
  assert.deepEqual(metrics, { concept_slots_total: 4, concept_slots_valid: 3, concept_slots_rejected: 1, concept_visual_required: 5, concept_visual_optional: 1, concept_validation_errors: 1 });
});
