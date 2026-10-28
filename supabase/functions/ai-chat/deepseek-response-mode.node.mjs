import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const provider = readFileSync(new URL('./providers/deepseek.ts', import.meta.url), 'utf8');
const index = readFileSync(new URL('./index.ts', import.meta.url), 'utf8');

test('DeepSeek request supports explicit JSON Output mode', () => {
  assert.match(provider, /requestBody\.response_format\s*=\s*responseFormat/);
  const jsonModeCount = index.match(/requestMode === 'lessonGeneration' \? \{ type: 'json_object' \} : undefined/g)?.length ?? 0;
  assert.equal(jsonModeCount, 2, 'JSON mode must be passed to both OpenAI and DeepSeek providers');
  assert.match(index, /case 'DeepSeek':[\s\S]*?maxTokens,[\s\S]*?requestMode === 'lessonGeneration'/);
  assert.match(index, /case 'DeepSeek':[\s\S]*?requestMode === 'lessonGeneration' \? 0 : undefined/);
  assert.match(provider, /temperature: temperature \?\? 0\.7/);
  assert.match(provider, /max_tokens: maxTokens/);
});

test('DeepSeek provider remains non-streaming and extracts the first message content', () => {
  assert.doesNotMatch(provider, /stream\s*:\s*true/);
  assert.match(provider, /data\.choices\[0\]\.message\.content/);
  assert.match(provider, /finishReason: data\.choices\?\.\[0\]\?\.finish_reason/);
  assert.match(provider, /completionTokens: data\.usage\?\.completion_tokens/);
  assert.match(provider, /choiceCount: Array\.isArray\(data\.choices\) \? data\.choices\.length : 0/);
});
