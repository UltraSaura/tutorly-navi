import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { describe, it, expect } from 'vitest';

const source = readFileSync(new URL('./index.ts', import.meta.url), 'utf8');
const transpile = (s: string) => ts.transpile(s, { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None });

describe('lesson generation AI request', () => {
  it('uses a dedicated system prompt and disables tutor/exercise rewriting', async () => {
    const start = source.indexOf('const callAI =');
    const end = source.indexOf('// ── Helper: normalize', start);
    let request: Record<string, unknown> = {};
    const call = runInNewContext(transpile(source.slice(start, end) + '\ncallAI;'), {
      Deno: { env: { get: () => 'https://test.supabase.co' } },
      authHeader: 'test', modelId: 'deepseek-chat', language: 'fr', rawLevel: 'CM2', ageGroup: '10–11', curriculum: 'FR', countryLabel: 'France', responseLang: 'fr',
      fetch: async (_url: string, init: { body: string }) => {
        request = JSON.parse(init.body);
        return { ok: true, json: async () => ({ content: '{"lesson_goal":"Durées"}' }) };
      },
    });
    expect(await call('Generate Durées', 3000)).toEqual({ lesson_goal: 'Durées' });
    expect(request.customPrompt).toContain('structured lesson JSON');
    expect(request.isUnified).toBe(true);
    expect(request.requestMode).toBe('lessonGeneration');
    expect(request.message).toBe('Generate Durées');
  });

  it('retains the topic, original schema and candidate in both repair requests', () => {
    const repairs = source.split('\n').filter(line => line.includes('const repaired = await callAI(`${levelPrompt}'));
    expect(repairs).toHaveLength(2);
    for (const line of repairs) {
      const expression = line.slice(line.indexOf('`'), line.lastIndexOf('`') + 1);
      const message = runInNewContext(transpile(expression), {
        levelPrompt: 'CM2 Durées: schema with sequence', generated: { wrong: 'first' }, lesson: { wrong: 'second' },
        levelContract: { issues: [{ path: 'sequence', message: 'Required' }] },
      });
      expect(message).toContain('CM2 Durées: schema with sequence');
      expect(message).toContain('"wrong":');
    }
  });
});
