import { describe, expect, it } from 'vitest';
import { parseProviderJsonSafely } from './provider-json.ts';

describe('provider JSON boundary', () => {
  it('parses raw JSON', () => expect(parseProviderJsonSafely('{"ok":true}')).toMatchObject({ ok: true, value: { ok: true } }));
  it('strips fences and surrounding prose', () => expect(parseProviderJsonSafely('Voici le résultat:\n```json\n{"sequence":[],}\n```')).toMatchObject({ ok: true, value: { sequence: [] } }));
  it('removes trailing commas safely', () => expect(parseProviderJsonSafely('{"levels":[{"title":"Fractions",},],}')).toMatchObject({ ok: true }));
  it('rejects unrecoverable JSON without exposing parser details', () => expect(parseProviderJsonSafely('{"levels":[{"title":"Fractions"}')).toEqual({ ok: false, attemptedRepair: false, category: 'malformed_json' }));
  it('accepts structured provider output without parsing it again', () => expect(parseProviderJsonSafely({ lesson_goal: 'Fractions' })).toMatchObject({ ok: true }));
});
