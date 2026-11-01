import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { buildLessonBlueprint } from './lesson-blueprint.ts';
import { assembleLessonBlueprint } from './lesson-assembly.ts';
import { buildSlotRegenerationPrompt } from './slot-regeneration-prompt.ts';

const env = Object.fromEntries(readFileSync(new URL('../../../.env', import.meta.url), 'utf8').split(/\r?\n/).filter((line) => line && !line.startsWith('#')).map((line) => { const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1).replace(/^"|"$/g, '')]; }));
const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const publishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;
assert.ok(supabaseUrl && publishableKey);
const topic = { id: '0ac06eee-3056-488b-81ae-554e432e873d', name: 'Durées', levelCode: 'cm2' };
const objectives = [{ id: '5440a1a9-f1b8-4798-92d7-f44fe0adbe30', text: 'Utiliser les unités de durée et effectuer des conversions.' }];
const blueprint = buildLessonBlueprint(topic, objectives);
const assembled = assembleLessonBlueprint(blueprint, objectives.map((item) => item.id));
assert.equal(assembled.success, true);
const slot = assembled.draft.levels[0].slots.find((candidate) => candidate.kind === 'concept');
const message = buildSlotRegenerationPrompt({
  topic: 'Durées CM2', levelNumber: 1, levelTitle: 'Fondations',
  objectiveText: objectives[0].text, slot,
  curriculumScope: 'seconde, minute, heure et jour; conversions uniquement entre ces unités et leurs relations explicites.',
  acceptedContext: 'Objectif du niveau uniquement; contexte de lecture seule, ne pas recopier.',
});
const response = await fetch(`${supabaseUrl}/functions/v1/ai-chat`, { method: 'POST', headers: { apikey: publishableKey, Authorization: `Bearer ${publishableKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ message, modelId: 'deepseek-chat', history: [], language: 'fr', maxTokens: 4500, customPrompt: 'Return one complete JSON object only for the exact lesson slot.', isUnified: true, requestMode: 'lessonGeneration', userContext: { grade_level: 'CM2', age_group: '10–11 ans', curriculum: 'France', response_language: 'fr', format: 'json' } }) });
const httpText = await response.text();
let outer;
try { outer = JSON.parse(httpText); } catch (error) { writeFileSync('/tmp/phase6c-raw-http.txt', httpText); console.log(JSON.stringify({ rawFailure: true, layer: 'ai-chat HTTP response', httpLength: httpText.length, error: String(error), rawFile: '/tmp/phase6c-raw-http.txt', first500: httpText.slice(0, 500), last500: httpText.slice(-500) }, null, 2)); process.exit(0); }
const modelContent = typeof outer.content === 'string' ? outer.content : outer.data?.content ?? outer;
const rawModelText = typeof modelContent === 'string' ? modelContent : JSON.stringify(modelContent);
writeFileSync('/tmp/phase6c-raw-model-content.txt', rawModelText);
let parsed;
try { parsed = JSON.parse(rawModelText); } catch (error) {
  const position = Number(String(error).match(/position (\d+)/)?.[1] ?? -1);
  const start = position >= 0 ? Math.max(0, position - 500) : 0;
  const end = position >= 0 ? Math.min(rawModelText.length, position + 500) : Math.min(rawModelText.length, 500);
  console.log(JSON.stringify({ rawFailure: true, layer: 'Phase 6 inner model-content JSON parse', modelContentLength: rawModelText.length, parseError: String(error), parsePosition: position, first500: rawModelText.slice(0, 500), aroundPosition: rawModelText.slice(start, end), last500: rawModelText.slice(-500), rawFile: '/tmp/phase6c-raw-model-content.txt' }, null, 2));
  process.exit(0);
}
console.log(JSON.stringify({ rawFailure: false, modelContentLength: rawModelText.length, topLevelKeys: Object.keys(parsed), hasSlotEnvelope: !!parsed.slot, parsed }, null, 2));
