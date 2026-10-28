import { describe, expect, it } from 'vitest';
import { BETA_PROJECT, validateBetaClientKey } from './build-private-beta.mjs';
const jwt = (claims: object) => `header.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.signature`;
describe('private beta build configuration', () => {
  it('accepts the existing staging fallback or a staging anon key', () => {
    expect(() => validateBetaClientKey('')).not.toThrow();
    expect(() => validateBetaClientKey(jwt({ role: 'anon', ref: BETA_PROJECT }))).not.toThrow();
  });
  it.each([
    jwt({ role: 'service_role', ref: BETA_PROJECT }),
    jwt({ role: 'anon', ref: 'other-project' }),
    'not-a-key',
  ])('rejects inappropriate client keys without printing them', (key) => {
    expect(() => validateBetaClientKey(key)).toThrow();
    try { validateBetaClientKey(key); } catch (error) { expect(String(error)).not.toContain(key); }
  });
});
