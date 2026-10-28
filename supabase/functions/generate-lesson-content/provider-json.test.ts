import { describe, expect, it } from 'vitest';
import { buildProviderResponseDiagnostics, extractProviderContent, parseProviderJsonSafely } from './provider-json.ts';

describe('provider JSON boundary', () => {
  it('parses raw JSON', () => expect(parseProviderJsonSafely('{"ok":true}')).toMatchObject({ ok: true, value: { ok: true } }));
  it('preserves valid JSON containing French quotation marks instead of corrupting it during cleanup', () => {
    const value = { content: 'L’aire se mesure en “unités carrées”.', label: 'Unité d’aire', literal: ',}' };
    expect(parseProviderJsonSafely(JSON.stringify(value))).toEqual({ ok: true, value, attemptedRepair: false });
  });
  it.each([
    (json: string) => `\`\`\`json\n${json}\n\`\`\``,
    (json: string) => `Voici le résultat:\n${json}\nFin.`,
  ])('preserves quoted lesson content inside an identifiable envelope', (wrap) => {
    const value = { content: 'Observe les “faces” et l’arête.', literal: ',}' };
    expect(parseProviderJsonSafely(wrap(JSON.stringify(value)))).toMatchObject({ ok: true, value });
  });
  it('strips fences and surrounding prose', () => expect(parseProviderJsonSafely('Voici le résultat:\n```json\n{"sequence":[],}\n```')).toMatchObject({ ok: true, value: { sequence: [] } }));
  it('accepts one clearly identifiable JSON value followed by a short provider explanation', () => expect(parseProviderJsonSafely('{"sequence":[]}\nFin de la réponse.')).toMatchObject({ ok: true, value: { sequence: [] }, attemptedRepair: true }));
  it('removes trailing commas safely', () => expect(parseProviderJsonSafely('{"levels":[{"title":"Fractions",},],}')).toMatchObject({ ok: true }));
  it('rejects unrecoverable JSON without exposing parser details', () => expect(parseProviderJsonSafely('{"levels":[{"title":"Fractions"}')).toEqual({ ok: false, attemptedRepair: false, category: 'malformed_json' }));
  it('rejects two top-level JSON values as ambiguous instead of selecting one', () => expect(parseProviderJsonSafely('{"sequence":[]}\n{"sequence":[{"id":"c1"}]}')).toEqual({ ok: false, attemptedRepair: false, category: 'ambiguous_json' }));
  it('rejects invalid JSON that is neither a wrapper nor a recoverable trailing-comma case', () => expect(parseProviderJsonSafely('{"sequence":[{"id":"c1", "content":"unterminated}')).toEqual({ ok: false, attemptedRepair: false, category: 'malformed_json' }));
  it('accepts structured provider output without parsing it again', () => expect(parseProviderJsonSafely({ lesson_goal: 'Fractions' })).toMatchObject({ ok: true }));
});

describe('safe provider response diagnostics', () => {
  const body = JSON.stringify({ content: '{"ok":true}', providerMetadata: { finishReason: 'stop' } });

  it('extracts top-level content without falling back when it is empty or null', () => {
    expect(extractProviderContent({ content: '' })).toEqual({ found: true, value: '' });
    expect(extractProviderContent({ content: null, data: { content: '{"wrong":true}' } })).toEqual({ found: true, value: null });
    expect(extractProviderContent({ data: { content: '{"ok":true}' } })).toEqual({ found: true, value: '{"ok":true}' });
    expect(extractProviderContent({ choices: [] })).toEqual({ found: false, value: undefined });
  });

  it('reports empty content without exposing it', async () => {
    const diagnostics = await buildProviderResponseDiagnostics({
      httpStatus: 200,
      contentType: 'application/json',
      bodyText: JSON.stringify({ content: '' }),
      envelope: { content: '' },
      content: '',
      parseState: 'content_empty',
    });
    expect(diagnostics).toMatchObject({
      httpStatus: 200,
      contentType: 'application/json',
      bodyLength: JSON.stringify({ content: '' }).length,
      choiceCount: null,
      finishReason: null,
      contentPresent: true,
      contentNonEmpty: false,
      contentLength: 0,
      parseState: 'content_empty',
    });
    expect(diagnostics.contentSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(diagnostics)).not.toContain('lesson');
  });

  it('reports null content without a content hash', async () => {
    const diagnostics = await buildProviderResponseDiagnostics({
      httpStatus: 200,
      contentType: 'application/json',
      bodyText: JSON.stringify({ content: null }),
      envelope: { content: null },
      content: null,
      parseState: 'content_empty',
    });
    expect(diagnostics).toMatchObject({ contentPresent: false, contentNonEmpty: false, contentSha256: null, parseState: 'content_empty' });
  });

  it('reports truncated, multiple-object, and valid JSON parsing states', async () => {
    const cases = [
      ['{"sequence":[', 'malformed_json'],
      ['{"a":1}\n{"b":2}', 'ambiguous_json'],
      ['{"sequence":[]}', 'valid_json'],
    ] as const;
    for (const [content, parseState] of cases) {
      const parsed = parseProviderJsonSafely(content);
      expect(parsed.ok ? 'valid_json' : parsed.category).toBe(parseState);
      const diagnostics = await buildProviderResponseDiagnostics({
        httpStatus: 200,
        contentType: 'application/json',
        bodyText: body,
        envelope: { choices: [{ message: { content } }], providerMetadata: { finishReason: 'stop', choiceCount: 1 } },
        content,
        parseState,
      });
      expect(diagnostics).toMatchObject({ choiceCount: 1, finishReason: 'stop', parseState });
      expect(diagnostics.contentSha256).toMatch(/^[0-9a-f]{64}$/);
    }
  });
});
