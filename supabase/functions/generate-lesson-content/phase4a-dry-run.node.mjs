import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { buildLessonBlueprint } from './lesson-blueprint.ts';
import { assembleLessonBlueprint, fillSlot, materializeV21 } from './lesson-assembly.ts';
import { adaptLevelContent, fillLevelContentSlot } from './level-content-adapter.ts';
import { adaptPrerequisiteContent } from './prerequisite-content-adapter.ts';
import { adaptConceptContent } from './concept-content-adapter.ts';
import { adaptInteractionContent, fillInteractionSlot } from './interaction-content-adapter.ts';
import { adaptMasteryContent, fillMasterySlot } from './mastery-content-adapter.ts';
import { validateLessonV21 } from './lesson-v21-contract.ts';

const env = Object.fromEntries(readFileSync(new URL('../../../.env', import.meta.url), 'utf8').split(/\r?\n/).filter((line) => line && !line.startsWith('#')).map((line) => {
  const separator = line.indexOf('=');
  return [line.slice(0, separator), line.slice(separator + 1).replace(/^"|"$/g, '')];
}));
const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const publishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;
assert.ok(supabaseUrl && publishableKey, 'Supabase URL and publishable key are required for the dry run.');

const topic = { id: '0ac06eee-3056-488b-81ae-554e432e873d', name: 'Durées', levelCode: 'cm2' };
const objectives = [
  { id: 'b1f695e8-c376-4893-81f9-644738d3d653', text: 'Résoudre des problèmes impliquant des durées.', orderIndex: 0 },
  { id: 'a524af84-f539-47ae-84ca-df4670bffcdc', text: "Lire l'heure sur une horloge et calculer des durées.", orderIndex: 1 },
  { id: '5440a1a9-f1b8-4798-92d7-f44fe0adbe30', text: 'Utiliser les unités de durée et effectuer des conversions.', orderIndex: 2 },
];
const objective = objectives[2];
const blueprint = buildLessonBlueprint(topic, objectives);
const assembled = assembleLessonBlueprint(blueprint, objectives.map((item) => item.id));
assert.equal(assembled.success, true);
const fullDraft = assembled.draft;
const levelBlueprint = blueprint.levels[0];
assert.deepEqual(levelBlueprint.objectiveIds, [objective.id]);
const levelDraft = { ...fullDraft, levels: [fullDraft.levels[0]] };
const expectedSlots = levelDraft.levels[0].slots;
assert.equal(expectedSlots.length, 8);
const expectedSlotIds = expectedSlots.map((slot) => slot.slotId);

const prompt = `
Tu es un fournisseur de contenu pédagogique pour Stuwy. Retourne UNIQUEMENT un objet JSON strict de la forme {"slots":{...}}. Tu ne peux créer aucun slot, supprimer aucun slot, modifier aucun identifiant, objectif, niveau, ordre ou contrainte. Remplis exactement ces huit slot IDs et aucun autre:
${expectedSlots.map((slot) => `- ${slot.slotId}: ${slot.kind}${slot.blockType ? `/${slot.blockType}` : ''}`).join('\n')}

Contexte: sujet Durées, niveau CM2, langue française, objectif unique ${objective.id}: «${objective.text}», niveau Fondations, but «${levelBlueprint.purpose}». Le niveau porte uniquement sur les unités de durée et les conversions.

Contrats exacts (objets fermés: retourne uniquement les champs listés; n'ajoute aucun champ supplémentaire):
- level-1-content: lesson_goal:string; success_criteria:1 à 5 chaînes distinctes; misconceptions: tableau d'objets fermés {id,description,detect_if,feedback,remediation_strategy} (peut être vide). Chaque misconception doit contenir exactement ces cinq champs, sans variante ni champ *_alt.
- level-1-prerequisite-1: prérequis résolu «Lire et comparer des nombres entiers et effectuer des calculs simples». Teste uniquement cette connaissance préalable, jamais la conversion de durée. Retourne exactement les champs obligatoires description, check_question, answer_type, expected_answer et remediation_hint; ajoute choices (au moins deux chaînes distinctes) si answer_type vaut multiple_choice ou selection. Pour l'identification, utilise multiple_choice avec expected_answer membre des choices. Le check_question doit porter sur une comparaison entière ou un calcul simple, jamais sur les secondes, minutes, heures, jours ou une conversion de durée.
- level-1-concept-1: title, content court, key_points (1 à 4 objets label/text), takeaway, visual obligatoire kind unit_conversion ou timeline, avec purpose, alt_text et data structurées. Les relations doivent correspondre exactement au texte; utilise par exemple relations ["×60","×60","×24"] ou units.
- concept object roles: content explique brièvement ce que signifie l'idée; key_points liste des faits/relations distincts à remarquer; takeaway donne une stratégie ou règle de décision actionnable, et ne paraphrase ni content ni key_points. Exemple générique uniquement: content=explication de l'idée; key_points=faits distincts; takeaway=stratégie pour choisir une opération ou représentation.
- concept key_points: chaque objet contient exactement {label,text}. concept visual: retourne exactement {kind,purpose,alt_text,data}; data doit être un objet structuré.
- level-1-guided_example: context et steps non vides; chaque step contient instruction et reason, représentation optionnelle.
- guided_example step: chaque objet contient uniquement {instruction,reason,representation?}.
- level-1-prediction: question, au moins deux choices distinctes, correct_answer membre des choices, explanation non vide.
- level-1-student_try et level-1-feedback_checkpoint: question, answer_type parmi multiple_choice|numeric|time|short_text|selection|ordering, correct_answer, success_feedback, error_feedback. Pour les conversions de durée, utilise multiple_choice avec des choix textuels complets comme «300 secondes»; ne produis jamais numeric 300 ou time pour une quantité avec unité.
- level-1-mastery: questions de 1 à 4; chaque question contient id, question, answer_type, correct_answer, skill, difficulty, success_feedback, error_feedback; les choix doivent être distincts et le correct_answer doit en faire partie pour multiple_choice. Utilise des choix textuels complets pour les conversions. Chaque question doit demander à l'élève de calculer ou d'identifier la réponse: ne donne jamais la réponse exacte, l'équivalence numérique demandée ou une phrase qui la révèle dans l'énoncé juste avant la question. Les nombres nécessaires pour poser le problème sont autorisés; seul le résultat exact révélé dans le texte est interdit.
- mastery question: chaque objet contient exactement {id,question,answer_type,choices?,correct_answer,skill,difficulty,success_feedback,error_feedback}; n'ajoute aucun champ.

N'ajoute aucune clé structurelle (slotId, type, objectiveIds, level, sequence, threshold, skills, visualPolicy, prerequisites, mastery). Pour chaque objet, retourne uniquement les champs listés et aucun champ supplémentaire. Pas de Markdown, HTML, SVG, JSON dans des chaînes, placeholders, questions dupliquées ou réponse révélée dans la question. `;

const response = await fetch(`${supabaseUrl}/functions/v1/ai-chat`, {
  method: 'POST',
  headers: { apikey: publishableKey, Authorization: `Bearer ${publishableKey}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: prompt,
    modelId: 'deepseek-chat',
    history: [],
    language: 'fr',
    maxTokens: 4500,
    customPrompt: 'You generate structured lesson JSON for the application. Follow the exact schema and task in the user message. Return one complete JSON object only, without Markdown or a tutoring-chat envelope.',
    isUnified: true,
    requestMode: 'lessonGeneration',
    userContext: { grade_level: 'CM2', age_group: '10–11 ans', curriculum: 'France', country: 'France', response_language: 'fr', learning_style: 'visual', format: 'json' },
  }),
});
const responseText = await response.text();
if (!response.ok) throw new Error(`AI provider request failed (${response.status}): ${responseText}`);
const responseJson = JSON.parse(responseText);
const rawValue = responseJson.content ?? responseJson.data?.content ?? responseJson;
const rawText = typeof rawValue === 'string' ? rawValue.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim() : null;
const parsed = rawText ? JSON.parse(rawText) : rawValue;
if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('RAW_JSON_PARSE_FAILED: provider did not return an object.');
const slots = parsed.slots;
if (!slots || typeof slots !== 'object' || Array.isArray(slots)) throw new Error('SLOT_ENVELOPE_FAILED: expected a slots object.');
const returnedSlotIds = Object.keys(slots);
const unknownSlotIds = returnedSlotIds.filter((id) => !expectedSlotIds.includes(id));
const missingSlotIds = expectedSlotIds.filter((id) => !(id in slots));
if (unknownSlotIds.length || missingSlotIds.length) throw new Error(`SLOT_SET_FAILED: unknown=${unknownSlotIds.join(',') || 'none'} missing=${missingSlotIds.join(',') || 'none'}`);

let draft = levelDraft;
const familyResults = {};
const errors = [];
const rawSlots = {};
for (const slot of expectedSlots) {
  const raw = slots[slot.slotId];
  rawSlots[slot.slotId] = { family: slot.kind === 'interaction' ? slot.blockType : slot.kind, content: raw };
  let adapted;
  let filled;
  if (slot.kind === 'level_content') {
    adapted = adaptLevelContent(slot, raw);
    filled = adapted.ok ? fillLevelContentSlot(draft, slot.slotId, raw) : null;
  } else if (slot.kind === 'prerequisite') {
    adapted = adaptPrerequisiteContent(slot, raw);
    filled = adapted.ok ? fillSlot(draft, slot.slotId, adapted.content) : null;
  } else if (slot.kind === 'concept') {
    adapted = adaptConceptContent(slot, raw);
    filled = adapted.ok ? fillSlot(draft, slot.slotId, adapted.content) : null;
  } else if (slot.kind === 'interaction') {
    adapted = adaptInteractionContent(slot, raw);
    filled = adapted.ok ? fillInteractionSlot(draft, slot.slotId, raw) : null;
  } else {
    adapted = adaptMasteryContent(slot, raw);
    filled = adapted.ok ? fillMasterySlot(draft, slot.slotId, raw) : null;
  }
  familyResults[slot.slotId] = adapted.ok ? 'PASS' : 'FAIL';
  if (!adapted.ok) errors.push(...adapted.errors.map((entry) => ({ slotId: slot.slotId, ...entry })));
  if (filled && !filled.success) errors.push(...filled.issues.map((entry) => ({ slotId: slot.slotId, field: entry.path, code: 'fillSlot', message: entry.message })));
  if (filled?.success) draft = filled.draft;
}

const incomplete = draft.levels[0].slots.filter((slot) => slot.status !== 'complete');
const oneLevelMaterialized = errors.length === 0 && incomplete.length === 0 ? materializeV21(draft) : { success: false, issues: [{ path: 'level', message: 'Level 1 has adapter/fill errors.' }] };
const canonical = oneLevelMaterialized.success ? validateLessonV21(oneLevelMaterialized.value) : oneLevelMaterialized;
const content = draft.levels[0].slots.reduce((result, slot) => ({ ...result, [slot.slotId]: slot.content }), {});
console.log(JSON.stringify({
  provider: 'Supabase ai-chat → DeepSeek', aiCalls: 1, target: { topicId: topic.id, level: 1, objectiveId: objective.id, objectiveText: objective.text },
  expectedSlotCount: expectedSlotIds.length, returnedSlotCount: returnedSlotIds.length, unknownSlotIds, missingSlotIds,
  familyResults, errors, rejectedRawSlots: Object.fromEntries(Object.entries(rawSlots).filter(([slotId]) => familyResults[slotId] === 'FAIL')), levelAssembly: incomplete.length === 0 ? 'COMPLETE' : 'INCOMPLETE', oneLevelMaterialization: oneLevelMaterialized.success ? 'PASS' : 'FAIL', canonicalValidation: canonical.success ? 'PASS' : 'FAIL',
  content,
}, null, 2));
if (errors.length || !oneLevelMaterialized.success || !canonical.success) process.exitCode = 2;
