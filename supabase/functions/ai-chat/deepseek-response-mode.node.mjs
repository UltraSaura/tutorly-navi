import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const provider = readFileSync(new URL('./providers/deepseek.ts', import.meta.url), 'utf8');
const index = readFileSync(new URL('./index.ts', import.meta.url), 'utf8');

test('DeepSeek request supports explicit JSON Output mode', () => {
  assert.match(provider, /requestBody\.response_format\s*=\s*responseFormat/);
  assert.match(index, /requestMode === 'lessonGeneration' \? \{ type: 'json_object' \} : undefined/);
});

test('DeepSeek provider remains non-streaming and extracts the first message content', () => {
  assert.doesNotMatch(provider, /stream\s*:\s*true/);
  assert.match(provider, /data\.choices\[0\]\.message\.content/);
});
