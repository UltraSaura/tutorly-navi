import { describe, expect, it } from 'vitest';
import { buildProviderResponseDiagnostics, describeJsonSyntaxError, parseProviderJsonSafely } from './provider-json.ts';
import { parseStagingLevelResponse, STAGING_JSON_OUTPUT_RULE, STAGING_JSON_SYNTAX_RULE } from './staging-level-workflow.ts';

describe('decimal-topic JSON syntax (provider-free)', () => {
  const frenchDecimalNumber = '{"prerequisites":[{"type":"numeric","prompt":"Combien font 2 + 0,75 ?","expected_answer":2,75}]}';

  it('keeps a French decimal comma in a JSON number strictly invalid (no repair)', () => {
    expect(parseProviderJsonSafely(frenchDecimalNumber)).toMatchObject({ ok: false, category: 'malformed_json' });
    expect(() => parseStagingLevelResponse(frenchDecimalNumber)).toThrow('staging_level_json_parse_failed');
  });

  it('accepts a decimal written with a point, and a French decimal inside a string', () => {
    expect(parseProviderJsonSafely('{"expected_answer":2.75}')).toMatchObject({ ok: true, value: { expected_answer: 2.75 } });
    expect(parseProviderJsonSafely('{"expected_answer":"2,75","choices":["2,75","2,57"]}')).toMatchObject({ ok: true });
  });

  it('reports the exact position and excerpt of the syntax error', async () => {
    const description = describeJsonSyntaxError(frenchDecimalNumber);
    expect(description?.position).toBe(frenchDecimalNumber.indexOf(',75}'));
    expect(description?.context).toContain('"expected_answer":2⟦ICI⟧,75');
    const diagnostics = await buildProviderResponseDiagnostics({ httpStatus: 200, contentType: 'application/json', bodyText: '{}', envelope: {}, content: frenchDecimalNumber, parseState: 'malformed_json' });
    expect(diagnostics.syntaxError?.context).toContain('⟦ICI⟧');
  });

  it('does not attach a syntax error to valid JSON', async () => {
    expect(describeJsonSyntaxError('{"ok":true}')).toBeNull();
    const diagnostics = await buildProviderResponseDiagnostics({ httpStatus: 200, contentType: 'application/json', bodyText: '{}', envelope: {}, content: '{"ok":true}', parseState: 'valid_json' });
    expect(diagnostics.syntaxError).toBeUndefined();
  });

  it('tells the provider how to write decimals, quotes and symbols in JSON', () => {
    expect(STAGING_JSON_OUTPUT_RULE).toContain(STAGING_JSON_SYNTAX_RULE);
    expect(STAGING_JSON_SYNTAX_RULE).toContain('JAMAIS 0,5');
    expect(STAGING_JSON_SYNTAX_RULE).toContain('"expected_answer":"2,75"');
    expect(STAGING_JSON_SYNTAX_RULE).toMatch(/LaTeX/);
  });
});
