import { describe, expect, it } from 'vitest';
import { formatGenerationError, getGenerationErrorTechnicalDetail } from './generationErrorMapping';

describe('generation error mapping', () => {
  it('maps structured canonical errors', () => expect(formatGenerationError({ error: { code: 'canonical_validation_failed', message: 'raw' } })).toBe('La leçon générée n’a pas le format attendu.'));
  it('maps nested backend messages', () => expect(formatGenerationError({ success: false, ok: false, error: { message: 'Unauthorized' } })).toBe('Unauthorized'));
  it('maps string error payloads without coercing objects', () => expect(formatGenerationError({ error: 'Service unavailable' })).toBe('Service unavailable'));
  it('maps Error instances and request-boundary failures', () => {
    expect(formatGenerationError(new Error('Failed to send a request to the Edge Function'))).toBe('La fonction de génération est indisponible.');
    expect(formatGenerationError('timeout after 5 minutes')).toBe('La génération a pris trop de temps.');
  });
  it('never renders objects as [object Object]', () => {
    for (const value of [null, undefined, {}, { error: {} }, '[object Object]']) expect(formatGenerationError(value)).not.toBe('[object Object]');
  });
  it('keeps technical details separate', () => expect(getGenerationErrorTechnicalDetail({ error: { code: 'canonical_validation_failed', technicalDetail: { path: 'sequence[4].correct_answer' } } })).toContain('sequence[4]'));
});
