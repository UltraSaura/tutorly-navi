import { describe, expect, it } from 'vitest';
import { buildProviderResponseDiagnostics, describeJsonSyntaxError, parseProviderJsonSafely } from './provider-json.ts';
import {
  orderConceptKeysVisualFirst,
  parseStagingLevelResponse,
  stagingFullLevelExample,
  stagingLevelMetadata,
  stagingLevelPrompt,
  STAGING_JSON_NESTING_RULE,
  STAGING_JSON_OUTPUT_RULE,
  STAGING_JSON_SYNTAX_RULE,
  STAGING_VISUAL_EXAMPLES,
} from './staging-level-workflow.ts';

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
    expect(description?.position).toBe(frenchDecimalNumber.indexOf(',75}') + 1);
    expect(description?.context).toContain('"expected_answer":2,⟦ICI⟧75');
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

describe('concept key order prevents dropped closing braces (provider-free)', () => {
  const decimalLevels = stagingLevelMetadata('07fe506e-71f4-44c9-bf7f-98c51a2ca68a', 'Les nombres décimaux', []);

  it('keeps the observed provider failure (one missing brace before the next block) strictly invalid', () => {
    const broken = '{"sequence":[{"id":"c2","type":"concept","key_points":[],"visual":{"kind":"rectangle","data":{"side_labels":[{"from":"D","to":"A","label":"1 dixième"}]}},{"id":"g1","type":"guided_example","content":"x"}]}';
    expect(parseProviderJsonSafely(broken)).toMatchObject({ ok: false, category: 'malformed_json' });
    expect(describeJsonSyntaxError(broken)?.context).toContain('}]}},⟦ICI⟧{"id":"g1"');
  });

  it('shows every concept example with visual right after content and takeaway last', () => {
    for (const block of Object.values(STAGING_VISUAL_EXAMPLES)) {
      const keys = Object.keys(block);
      expect(keys.indexOf('visual')).toBe(keys.indexOf('content') + 1);
      expect(keys.indexOf('visual')).toBeLessThan(keys.indexOf('key_points'));
      expect(keys[keys.length - 1]).toBe('takeaway');
    }
  });

  it('puts the nesting rule and visual-first examples in every decimal level prompt', () => {
    for (const level of decimalLevels) {
      const prompt = stagingLevelPrompt('Les nombres décimaux', 'CM1', 'fr', level, '');
      expect(prompt).toContain(STAGING_JSON_NESTING_RULE);
      const sequence = (stagingFullLevelExample(level).sequence as Record<string, unknown>[]).slice(0, 2);
      for (const concept of sequence) expect(Object.keys(concept).slice(-2)).toEqual(['key_points', 'takeaway']);
      expect(prompt).not.toMatch(/"takeaway":"[^"]*","visual":/);
    }
  });

  it('reorders keys only — same data as before', () => {
    const block = { id: 'c', type: 'concept', title: 't', content: 'c', key_points: [1], takeaway: 'a', visual: { kind: 'k' } };
    const ordered = orderConceptKeysVisualFirst(block);
    expect(ordered).toEqual(block);
    expect(Object.keys(ordered)).toEqual(['id', 'type', 'title', 'content', 'visual', 'key_points', 'takeaway']);
  });
});
