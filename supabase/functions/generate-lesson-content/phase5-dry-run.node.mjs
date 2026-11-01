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
assert.ok(supabaseUrl && publishableKey, 'Supabase URL and publishable key are required.');

const topic = { id: '0ac06eee-3056-488b-81ae-554e432e873d', name: 'Durées', levelCode: 'cm2' };
const objectives = [
  { id: 'b1f695e8-c376-4893-81f9-644738d3d653', text: 'Résoudre des problèmes impliquant des durées.', orderIndex: 0 },
  { id: 'a524af84-f539-47ae-84ca-df4670bffcdc', text: "Lire l'heure sur une horloge et calculer des durées.", orderIndex: 1 },
  { id: '5440a1a9-f1b8-4798-92d7-f44fe0adbe30', text: 'Utiliser les unités de durée et effectuer des conversions.', orderIndex: 2 },
];
const blueprint = buildLessonBlueprint(topic, objectives);
const assembled = assembleLessonBlueprint(blueprint, objectives.map((item) => item.id));
assert.equal(assembled.success, true);
let draft = assembled.draft;

const closedContract = `Objets fermés: retourne uniquement les champs listés, sans champ supplémentaire. level-content={lesson_goal,success_criteria,misconceptions}; misconception={id,description,detect_if,feedback,remediation_strategy}; prerequisite={description,check_question,answer_type,choices?,expected_answer,remediation_hint}; concept={title,content,key_points?,takeaway?,visual?}, key_point={label,text}, visual={kind,purpose,alt_text,data}; guided_example={context,steps}, step={instruction,reason,representation?}; prediction={question,choices,correct_answer,explanation}; student_try/feedback_checkpoint={question,answer_type,choices?,correct_answer,success_feedback,error_feedback}; mastery={questions}, mastery_question={id,question,answer_type,choices?,correct_answer,skill,difficulty,success_feedback,error_feedback}.`;

function promptFor(level, levelDraft) {
  const objectiveIds = level.objectiveIds.join(', ');
  const prereq = levelDraft.levels[0].slots.find((slot) => slot.kind === 'prerequisite');
  const prereqInstruction = prereq.diagnosticSkillStatus === 'resolved'
    ? `Retourne un prérequis résolu testant uniquement: ${prereq.priorSkill}. Il ne doit pas tester l'objectif cible ni les conversions de durée.`
    : 'Ce prérequis est UNRESOLVED (métadonnées génériques). Retourne exactement null pour ce slot; n’invente aucune compétence préalable.';
  return `Tu es un fournisseur de contenu pédagogique. Réponds uniquement par JSON strict {"slots":{...}}. Tu dois retourner exactement les huit IDs indiqués, aucun autre. ${closedContract}
Sujet: Durées, CM2, français. Niveau ${level.levelNumber}: ${level.title}; but: ${level.purpose}; difficulté: ${level.difficulty}; objectifs alloués: ${objectiveIds}.
Progression: le niveau 1 établit les fondations; le niveau 2 applique la lecture de l'heure et le calcul de durées; le niveau 3 transfère ces notions dans des problèmes nouveaux. Ne répète pas mécaniquement les tâches d'un autre niveau.
${levelDraft.levels[0].slots.map((slot) => `- ${slot.slotId}: ${slot.kind}${slot.blockType ? `/${slot.blockType}` : ''}${slot.kind === 'concept' ? `; visual=${slot.visualRequirement}; allowed=${(slot.allowedVisualKinds ?? []).join('|') || 'none'}; key_points=${slot.requiresKeyPoints ? `${slot.keyPointCount.min}-${slot.keyPointCount.max}` : 'optional'}; takeaway=${slot.requiresTakeaway ? 'required' : 'optional'}` : ''}`).join('\n')}
${prereqInstruction}
Les conversions avec unités utilisent multiple_choice et des chaînes complètes («300 secondes», «2 heures»); jamais une réponse numeric/time pour une quantité avec unité. Le type time est réservé à une heure de la journée. Aucun champ structurel, placeholder, réponse révélée ou question dupliquée.`;
}

function parseProvider(responseText) {
  const responseJson = JSON.parse(responseText);
  const rawValue = responseJson.content ?? responseJson.data?.content ?? responseJson;
  const rawText = typeof rawValue === 'string' ? rawValue.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim() : null;
  const parsed = rawText ? JSON.parse(rawText) : rawValue;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || !parsed.slots || typeof parsed.slots !== 'object' || Array.isArray(parsed.slots)) throw new Error('RAW_JSON_OR_ENVELOPE_FAILED');
  return parsed;
}

const levelReports = [];
for (const level of blueprint.levels) {
  const levelDraft = { ...draft, levels: [draft.levels[level.levelNumber - 1]] };
  const expectedSlots = levelDraft.levels[0].slots;
  const expectedSlotIds = expectedSlots.map((slot) => slot.slotId);
  const response = await fetch(`${supabaseUrl}/functions/v1/ai-chat`, {
    method: 'POST',
    headers: { apikey: publishableKey, Authorization: `Bearer ${publishableKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: promptFor(level, levelDraft), modelId: 'deepseek-chat', history: [], language: 'fr', maxTokens: 4500, customPrompt: 'Return one complete JSON object only for the exact lesson slots.', isUnified: true, requestMode: 'lessonGeneration', userContext: { grade_level: 'CM2', age_group: '10–11 ans', curriculum: 'France', response_language: 'fr', format: 'json' } }),
  });
  const responseText = await response.text();
  if (!response.ok) throw new Error(`LEVEL_${level.levelNumber}_PROVIDER_FAILED_${response.status}`);
  const parsed = parseProvider(responseText);
  const slots = parsed.slots;
  const returnedSlotIds = Object.keys(slots);
  const unknownSlotIds = returnedSlotIds.filter((id) => !expectedSlotIds.includes(id));
  const missingSlotIds = expectedSlotIds.filter((id) => !(id in slots));
  let working = levelDraft;
  const familyResults = {};
  const errors = [];
  const rawSlots = {};
  for (const slot of expectedSlots) {
    const raw = slots[slot.slotId];
    rawSlots[slot.slotId] = { family: slot.kind === 'interaction' ? slot.blockType : slot.kind, content: raw };
    if (slot.kind === 'prerequisite' && slot.diagnosticSkillStatus !== 'resolved') {
      familyResults[slot.slotId] = raw === null ? 'UNRESOLVED' : 'UNRESOLVED_PROVIDER_CONTENT';
      if (raw !== null) errors.push({ slotId: slot.slotId, field: '', code: 'unresolved_prerequisite_must_be_null', message: 'Generic prerequisite content must not be invented.' });
      continue;
    }
    let adapted;
    let filled;
    if (slot.kind === 'level_content') { adapted = adaptLevelContent(slot, raw); filled = adapted.ok ? fillLevelContentSlot(working, slot.slotId, raw) : null; }
    else if (slot.kind === 'prerequisite') { adapted = adaptPrerequisiteContent(slot, raw); filled = adapted.ok ? fillSlot(working, slot.slotId, adapted.content) : null; }
    else if (slot.kind === 'concept') { adapted = adaptConceptContent(slot, raw); filled = adapted.ok ? fillSlot(working, slot.slotId, adapted.content) : null; }
    else if (slot.kind === 'interaction') { adapted = adaptInteractionContent(slot, raw); filled = adapted.ok ? fillInteractionSlot(working, slot.slotId, raw) : null; }
    else { adapted = adaptMasteryContent(slot, raw); filled = adapted.ok ? fillMasterySlot(working, slot.slotId, raw) : null; }
    familyResults[slot.slotId] = adapted.ok && (!filled || filled.success) ? 'PASS' : 'FAIL';
    if (!adapted.ok) errors.push(...adapted.errors.map((entry) => ({ slotId: slot.slotId, ...entry })));
    if (filled && !filled.success) errors.push(...filled.issues.map((entry) => ({ slotId: slot.slotId, field: entry.path, code: 'fillSlot', message: entry.message })));
    if (filled?.success) working = filled.draft;
  }
  draft = { ...draft, levels: draft.levels.map((item, index) => index === level.levelNumber - 1 ? working.levels[0] : item) };
  const mandatoryComplete = draft.levels[level.levelNumber - 1].slots.every((slot) => slot.status === 'complete');
  levelReports.push({ level: level.levelNumber, title: level.title, objectiveIds: level.objectiveIds, objectiveTexts: level.objectiveIds.map((id) => objectives.find((item) => item.id === id)?.text), expectedSlotCount: 8, returnedSlotCount: returnedSlotIds.length, unknownSlotIds, missingSlotIds, familyResults, errors, rawRejectedSlots: Object.fromEntries(Object.entries(rawSlots).filter(([slotId]) => familyResults[slotId] === 'FAIL' || familyResults[slotId] === 'UNRESOLVED_PROVIDER_CONTENT')), assembly: mandatoryComplete ? 'COMPLETE' : 'INCOMPLETE', content: Object.fromEntries(draft.levels[level.levelNumber - 1].slots.filter((slot) => slot.status === 'complete').map((slot) => [slot.slotId, slot.content])) });
}

const completeDraft = draft.levels.every((level) => level.slots.every((slot) => slot.status === 'complete'));
const materialized = completeDraft ? materializeV21(draft) : { success: false, issues: [{ path: 'levels', message: 'Mandatory content remains incomplete.' }] };
const canonical = materialized.success ? validateLessonV21(materialized.value) : { success: false, issues: [] };
console.log(JSON.stringify({ provider: 'Supabase ai-chat → DeepSeek', aiCalls: 3, target: { topicId: topic.id, objectiveIds: objectives.map((item) => item.id) }, levels: levelReports, completeDraft: completeDraft ? 'YES' : 'NO', v21Materialization: materialized.success ? 'PASS' : 'FAIL', canonicalValidation: canonical.success ? 'PASS' : 'NOT_ATTEMPTED', persisted: 'NO', databaseModified: 'NO', frontendModified: 'NO', deployed: 'NO' }, null, 2));
