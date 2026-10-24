import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { describe, it, expect } from 'vitest';

const source = readFileSync(new URL('./handler.ts', import.meta.url), 'utf8');
const transpile = (s: string) => ts.transpile(s, { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None });

describe('lesson generation AI request', () => {
  it('runs topic-aware normalization before the first V2.1 canonical gate', () => {
    expect(source).toContain("block?.kind ?? 'missing'");
    expect(source.indexOf('normalizeGeneratedLesson(lesson, topic.name)')).toBeLessThan(source.indexOf('const levelContract = validateLessonV21'));
    expect(source).toContain('if (!allowPaidRepair) throw new Error(`Generated V2.1 level failed canonical validation after normalization:');
  });

  it('uses a dedicated system prompt and disables tutor/exercise rewriting', async () => {
    const start = source.indexOf('const callAI =');
    const end = source.indexOf('// ── Helper: normalize', start);
    let request: Record<string, unknown> = {};
    const call = runInNewContext(transpile(source.slice(start, end) + '\ncallAI;'), {
      Deno: { env: { get: () => 'https://test.supabase.co' } },
      aiProviderCalls: 0, parseProviderJsonSafely: (raw: unknown) => ({ ok: true, value: typeof raw === 'string' ? JSON.parse(raw) : raw, attemptedRepair: false }), authHeader: 'test', modelId: 'deepseek-chat', language: 'fr', rawLevel: 'CM2', ageGroup: '10–11', curriculum: 'FR', countryLabel: 'France', responseLang: 'fr',
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
        pedagogyInstruction: '\nPÉDAGOGIE: structured lesson repair',
        levelContract: { issues: [{ path: 'sequence', message: 'Required' }] },
      });
      expect(message).toContain('CM2 Durées: schema with sequence');
      expect(message).toContain('"wrong":');
    }
  });

  it('uses the compact deterministic JSON contract for staging calls', () => {
    expect(source).toContain('STAGING_JSON_OUTPUT_RULE');
    expect(source).toContain('maxTokens: STAGING_LEVEL_MAX_TOKENS');
    expect(source).toContain('response_format');
    expect(source).toContain("customPrompt: 'Use response_format={\"type\":\"json_object\"}.");
    expect(source).not.toContain('customPrompt: `${STAGING_JSON_OUTPUT_RULE}');
  });
});

  it('exposes provider-free healthcheck and fixture response contracts', () => {
    expect(source).toContain("requestBody.mode === 'healthcheck'");
    expect(source).toContain("requestBody.mode === 'fixture'");
    expect(source).toContain("providerCalls: 0");
    expect(source).toContain("pedagogicalValid");
    expect(source).toContain("code: 'provider_malformed_json'");
    expect(source).toContain("success, mode, fixtureVariant");
  });
