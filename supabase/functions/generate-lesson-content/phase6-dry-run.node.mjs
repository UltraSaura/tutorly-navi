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
import { runBoundedSlotPipeline } from './slot-regeneration.ts';
import { parsePhase6Envelope } from './phase6-envelope-parser.ts';
import { buildSlotRegenerationPrompt } from './slot-regeneration-prompt.ts';

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
  const activeSlots = levelDraft.levels[0].slots.filter((slot) => slot.kind !== 'prerequisite' || slot.diagnosticSkillStatus === 'resolved');
  return `Tu es un fournisseur de contenu pédagogique. Réponds uniquement par JSON strict {"slots":{...}}. Tu dois retourner exactement les IDs actifs indiqués, aucun autre. ${closedContract}
Sujet: Durées, CM2, français. Niveau ${level.levelNumber}: ${level.title}; but: ${level.purpose}; difficulté: ${level.difficulty}; objectifs alloués: ${objectiveIds}.
Progression: le niveau 1 établit les fondations; le niveau 2 applique la lecture de l'heure et le calcul de durées; le niveau 3 transfère ces notions dans des problèmes nouveaux. Ne répète pas mécaniquement les tâches d'un autre niveau.
${activeSlots.map((slot) => `- ${slot.slotId}: ${slot.kind}${slot.blockType ? `/${slot.blockType}` : ''}${slot.kind === 'concept' ? `; visual=${slot.visualRequirement}; allowed=${(slot.allowedVisualKinds ?? []).join('|') || 'none'}; key_points=${slot.requiresKeyPoints ? `${slot.keyPointCount.min}-${slot.keyPointCount.max}` : 'optional'}; takeaway=${slot.requiresTakeaway ? 'required' : 'optional'}` : ''}`).join('\n')}
${prereqInstruction}
Les conversions avec unités utilisent multiple_choice et des chaînes complètes («300 secondes», «2 heures»); jamais une réponse numeric/time pour une quantité avec unité. Le type time est réservé à une heure de la journée. Aucun champ structurel, placeholder, réponse révélée ou question dupliquée.`;
}

const levelReports = [];
let initialCalls = 0;
let initialGeneratedSlots = 0;
let regenerationCalls = 0;
let initialValidSlots = 0;
let initialFailedSlots = 0;
let regeneratedPass = 0;
let regeneratedFail = 0;
let finalValidSlots = 0;
let finalFailedSlots = 0;
const callAI = async (message, label) => {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/ai-chat`, { method: 'POST', headers: { apikey: publishableKey, Authorization: `Bearer ${publishableKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ message, modelId: 'deepseek-chat', history: [], language: 'fr', maxTokens: 4500, customPrompt: 'Return one complete JSON object only for the exact lesson slots.', isUnified: true, requestMode: 'lessonGeneration', userContext: { grade_level: 'CM2', age_group: '10–11 ans', curriculum: 'France', response_language: 'fr', format: 'json' } }) });
    const responseText = await response.text();
    if (!response.ok) throw new Error(`${label}_PROVIDER_FAILED_${response.status}`);
    return parsePhase6Envelope(responseText, label.startsWith('REGEN_') ? 'slot' : 'slots');
  } catch (error) {
    return { __infrastructureError: error instanceof Error ? error.message : String(error) };
  }
};
const applySlot = (working, slot, raw) => {
  let adapted;
  let filled;
  if (slot.kind === 'level_content') { adapted = adaptLevelContent(slot, raw); filled = adapted.ok ? fillLevelContentSlot(working, slot.slotId, raw) : null; }
  else if (slot.kind === 'prerequisite') { adapted = adaptPrerequisiteContent(slot, raw); filled = adapted.ok ? fillSlot(working, slot.slotId, adapted.content) : null; }
  else if (slot.kind === 'concept') { adapted = adaptConceptContent(slot, raw); filled = adapted.ok ? fillSlot(working, slot.slotId, adapted.content) : null; }
  else if (slot.kind === 'interaction') { adapted = adaptInteractionContent(slot, raw); filled = adapted.ok ? fillInteractionSlot(working, slot.slotId, raw) : null; }
  else { adapted = adaptMasteryContent(slot, raw); filled = adapted.ok ? fillMasterySlot(working, slot.slotId, raw) : null; }
  const errors = [];
  if (!adapted.ok) errors.push(...adapted.errors);
  if (filled && !filled.success) errors.push(...filled.issues.map((entry) => ({ field: entry.path, code: 'fillSlot', message: entry.message })));
  return { ok: adapted.ok && (!filled || filled.success), draft: filled?.success ? filled.draft : working, errors };
};
for (const level of blueprint.levels) {
  let levelInitialValid = 0;
  let levelInitialFailed = 0;
  try {
  const levelDraft = { ...draft, levels: [draft.levels[level.levelNumber - 1]] };
  const allSlots = levelDraft.levels[0].slots;
  const activeSlots = allSlots.filter((slot) => slot.kind !== 'prerequisite' || slot.diagnosticSkillStatus === 'resolved');
  const expectedSlotIds = activeSlots.map((slot) => slot.slotId);
  initialGeneratedSlots += activeSlots.length;
  initialCalls += 1;
  const initialEnvelope = await callAI(promptFor(level, levelDraft), `LEVEL_${level.levelNumber}`);
  if (initialEnvelope.__infrastructureError) {
    levelReports.push({ level: level.levelNumber, title: level.title, objectiveIds: level.objectiveIds, expectedSlotCount: 8, generatedSlotCount: 0, returnedSlotCount: 0, unknownSlotIds: [], missingSlotIds: expectedSlotIds, familyResults: {}, errors: [{ code: 'HARNESS_INFRASTRUCTURE_FAILURE', message: initialEnvelope.__infrastructureError }], rawRejectedSlots: {}, assembly: 'INCOMPLETE' });
    console.log(JSON.stringify({ event: 'level_infrastructure_failure', level: level.levelNumber, error: initialEnvelope.__infrastructureError }));
    continue;
  }
  const slots = initialEnvelope;
  const returnedSlotIds = Object.keys(slots);
  const unknownSlotIds = returnedSlotIds.filter((id) => !expectedSlotIds.includes(id));
  const missingSlotIds = expectedSlotIds.filter((id) => !(id in slots));
  let working = levelDraft;
  const familyResults = {};
  const errors = [];
  const rawSlots = {};
  const failed = [];
  for (const slot of activeSlots) {
    const raw = slots[slot.slotId];
    rawSlots[slot.slotId] = { family: slot.kind === 'interaction' ? slot.blockType : slot.kind, content: raw };
    const result = applySlot(working, slot, raw);
    familyResults[slot.slotId] = result.ok ? 'PASS' : 'FAIL';
    if (result.ok) { initialValidSlots += 1; levelInitialValid += 1; working = result.draft; } else { initialFailedSlots += 1; levelInitialFailed += 1; failed.push({ slot, raw, errors: result.errors }); errors.push(...result.errors.map((entry) => ({ slotId: slot.slotId, ...entry, attempt: 1 }))); }
  }
  for (const failedSlot of failed) {
    const slot = failedSlot.slot;
    regenerationCalls += 1;
    const objectiveText = level.objectiveIds.map((id) => objectives.find((item) => item.id === id)?.text).filter(Boolean).join(' ; ');
    const regenPrompt = buildSlotRegenerationPrompt({
      topic: 'Durées CM2', levelNumber: level.levelNumber, levelTitle: level.title,
      objectiveText, slot,
      curriculumScope: 'notions, unités, relations et opérations explicitement autorisées par l’objectif alloué; aucune extension curriculaire.',
      acceptedContext: `Objectif du niveau uniquement: ${level.purpose}. Ne pas recopier ce contexte.`,
    });
    const regeneratedEnvelope = await callAI(regenPrompt, `REGEN_${slot.slotId}`);
    if (regeneratedEnvelope.__infrastructureError) {
      regeneratedFail += 1;
      familyResults[slot.slotId] = 'FAIL_REGENERATED_INFRASTRUCTURE';
      errors.push({ slotId: slot.slotId, attempt: 2, code: 'HARNESS_INFRASTRUCTURE_FAILURE', message: regeneratedEnvelope.__infrastructureError });
      console.log(JSON.stringify({ event: 'slot_regeneration', level: level.levelNumber, slotId: slot.slotId, attempt: 2, adapterResult: 'INFRASTRUCTURE_FAILURE', errors: [{ code: 'HARNESS_INFRASTRUCTURE_FAILURE', message: regeneratedEnvelope.__infrastructureError }] }));
      continue;
    }
    const raw = regeneratedEnvelope;
    rawSlots[slot.slotId] = { family: slot.kind === 'interaction' ? slot.blockType : slot.kind, content: raw, attempt: 2 };
    const result = applySlot(working, slot, raw);
    if (result.ok) { regeneratedPass += 1; working = result.draft; familyResults[slot.slotId] = 'PASS_REGENERATED'; }
    else { regeneratedFail += 1; familyResults[slot.slotId] = 'FAIL_REGENERATED'; errors.push(...result.errors.map((entry) => ({ slotId: slot.slotId, ...entry, attempt: 2 }))); }
    console.log(JSON.stringify({ event: 'slot_regeneration', level: level.levelNumber, slotId: slot.slotId, family: slot.kind === 'interaction' ? slot.blockType : slot.kind, attempt: 2, adapterResult: result.ok ? 'PASS' : 'FAIL', errors: result.errors }));
  }
  const levelSlots = working.levels[0].slots;
  draft = { ...draft, levels: draft.levels.map((item, index) => index === level.levelNumber - 1 ? levelSlots[0] ? working.levels[0] : item : item) };
  const mandatoryComplete = draft.levels[level.levelNumber - 1].slots.filter((slot) => slot.requirement === 'mandatory').every((slot) => slot.status === 'complete');
  for (const slot of allSlots.filter((candidate) => candidate.kind === 'prerequisite' && candidate.requirement === 'optional')) familyResults[slot.slotId] = 'UNRESOLVED';
  const activeMandatoryCount = activeSlots.filter((slot) => slot.requirement === 'mandatory').length;
  const levelFinalValid = activeSlots.filter((slot) => familyResults[slot.slotId] === 'PASS' || familyResults[slot.slotId] === 'PASS_REGENERATED').length;
  finalValidSlots += levelFinalValid;
  finalFailedSlots += Math.max(0, activeMandatoryCount - levelFinalValid);
  levelReports.push({ level: level.levelNumber, title: level.title, objectiveIds: level.objectiveIds, objectiveTexts: level.objectiveIds.map((id) => objectives.find((item) => item.id === id)?.text), expectedSlotCount: 8, generatedSlotCount: activeSlots.length, returnedSlotCount: returnedSlotIds.length, unknownSlotIds, missingSlotIds, familyResults, errors, rawRejectedSlots: Object.fromEntries(Object.entries(rawSlots).filter(([slotId]) => familyResults[slotId]?.startsWith('FAIL'))), assembly: mandatoryComplete ? 'COMPLETE' : 'INCOMPLETE', content: Object.fromEntries(draft.levels[level.levelNumber - 1].slots.filter((slot) => slot.status === 'complete').map((slot) => [slot.slotId, slot.content])) });
  console.log(JSON.stringify({ event: 'level_complete', level: level.levelNumber, initialGeneratedSlots: activeSlots.length, initialValid: levelInitialValid, initialFailed: levelInitialFailed, failedSlotIds: failed.map(({ slot }) => slot.slotId), finalValid: levelFinalValid, finalFailed: Math.max(0, activeMandatoryCount - levelFinalValid), assembly: mandatoryComplete ? 'COMPLETE' : 'INCOMPLETE' }));
  } catch (error) {
    levelReports.push({ level: level.levelNumber, title: level.title, objectiveIds: level.objectiveIds, expectedSlotCount: 8, generatedSlotCount: 0, returnedSlotCount: 0, unknownSlotIds: [], missingSlotIds: [], familyResults: {}, errors: [{ code: 'LEVEL_RUNTIME_FAILURE', message: error instanceof Error ? error.message : String(error) }], rawRejectedSlots: {}, assembly: 'INCOMPLETE' });
    console.log(JSON.stringify({ event: 'level_complete', level: level.levelNumber, initialGeneratedSlots: 0, initialValid: levelInitialValid, initialFailed: levelInitialFailed, finalValid: 0, finalFailed: 0, assembly: 'INCOMPLETE', runtimeError: error instanceof Error ? error.message : String(error) }));
  }
}

const completeDraft = draft.levels.every((level) => level.slots.filter((slot) => slot.requirement === 'mandatory').every((slot) => slot.status === 'complete'));
const materialized = completeDraft ? materializeV21(draft) : { success: false, issues: [{ path: 'levels', message: 'Mandatory content remains incomplete.' }] };
const canonical = materialized.success ? validateLessonV21(materialized.value) : { success: false, issues: [] };
console.log(JSON.stringify({ provider: 'Supabase ai-chat → DeepSeek', initialCalls, initialGeneratedSlots, initialValidSlots, initialFailedSlots, initialSlotPassRate: initialGeneratedSlots ? `${((initialValidSlots / initialGeneratedSlots) * 100).toFixed(1)}%` : '0.0%', regenerationCalls, regeneratedPass, regeneratedFail, regenerationSuccessRate: regenerationCalls ? `${((regeneratedPass / regenerationCalls) * 100).toFixed(1)}%` : '0.0%', totalAICalls: initialCalls + regenerationCalls, finalValidSlots, finalFailedSlots, finalSlotPassRate: (finalValidSlots + finalFailedSlots) ? `${((finalValidSlots / (finalValidSlots + finalFailedSlots)) * 100).toFixed(1)}%` : '0.0%', target: { topicId: topic.id, objectiveIds: objectives.map((item) => item.id) }, levels: levelReports, completeDraft: completeDraft ? 'YES' : 'NO', v21Materialization: materialized.success ? 'PASS' : 'FAIL', canonicalValidation: canonical.success ? 'PASS' : 'NOT_ATTEMPTED', persisted: 'NO', databaseModified: 'NO', frontendModified: 'NO', deployed: 'NO' }, null, 2));
