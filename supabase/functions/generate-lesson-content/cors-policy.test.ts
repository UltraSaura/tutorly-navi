import { describe, expect, it } from 'vitest';
import { corsHeadersFor, isAllowedOrigin } from './cors-policy.ts';

const allowedOrigin = 'https://stuwy-practice-staging.grittydace256.chatgpt.site';
const allowedOrigins = new Set([allowedOrigin]);

describe('generate-lesson-content CORS policy', () => {
  it('allows missing Origin to proceed to normal authentication and admin validation', () => {
    expect(isAllowedOrigin(null, allowedOrigins)).toBe(true);
    expect(corsHeadersFor(null, allowedOrigins)['Access-Control-Allow-Origin']).toBeUndefined();
  });

  it('allows an approved Origin and returns exact CORS headers', () => {
    const headers = corsHeadersFor(allowedOrigin, allowedOrigins);
    expect(isAllowedOrigin(allowedOrigin, allowedOrigins)).toBe(true);
    expect(headers).toMatchObject({
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    });
    for (const header of ['authorization', 'apikey', 'x-client-info', 'content-type']) {
      expect(headers['Access-Control-Allow-Headers']).toContain(header);
    }
  });

  it('rejects a present but disallowed Origin', () => {
    expect(isAllowedOrigin('https://evil.example', allowedOrigins)).toBe(false);
  });

  it('handles OPTIONS without Origin safely without granting browser access', () => {
    const headers = corsHeadersFor(null, allowedOrigins);
    expect(isAllowedOrigin(null, allowedOrigins)).toBe(true);
    expect(headers['Access-Control-Allow-Origin']).toBeUndefined();
    expect(headers['Access-Control-Allow-Methods']).toContain('OPTIONS');
  });

  it('does not perform provider calls or database writes', () => {
    expect(isAllowedOrigin(null, allowedOrigins)).toBe(true);
    expect(isAllowedOrigin(allowedOrigin, allowedOrigins)).toBe(true);
    expect(isAllowedOrigin('https://evil.example', allowedOrigins)).toBe(false);
  });
});
