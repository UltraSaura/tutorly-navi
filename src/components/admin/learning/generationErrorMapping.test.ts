import { describe, expect, it } from 'vitest';
import { formatGenerationError, getGenerationErrorTechnicalDetail } from './generationErrorMapping';

describe('generation error mapping', () => {
  it('maps structured canonical errors', () => expect(formatGenerationError({ error: { code: 'canonical_validation_failed', message: 'raw' } })).toBe('La leçon générée n’a pas le format attendu.'));
  it.each([
    { code: 'canonical_validation_failed', message: { path: 'levels[0].lesson.sequence[4].correct_answer', error: 'Required value' } },
    { error: { code: 'canonical_validation_failed', message: { path: 'levels[0].lesson.sequence[4].correct_answer', error: 'Required value' } } },
    { success: false, ok: false, error: { code: 'canonical_validation_failed', message: { path: 'levels[0].lesson.sequence[4].correct_answer', error: 'Required value' }, technicalDetail: 'levels[0].lesson.sequence[4].correct_answer: Required value' } },
  ])('maps object-valued canonical messages to a safe string', (payload) => {
    expect(formatGenerationError(payload)).toBe('La leçon générée n’a pas le format attendu.');
  });
  it('maps invalid lesson errors and object-valued messages safely', () => {
    const payload = {
      success: false,
      ok: false,
      error: {
        code: 'provider_invalid_lesson',
        message: { path: 'levels[0].lesson.sequence[4].correct_answer', error: 'Required value' },
        technicalDetail: 'levels[0].lesson.sequence[4].correct_answer: Required value',
      },
    };
    expect(formatGenerationError(payload)).toBe('La leçon générée est incomplète ou invalide.');
    expect(getGenerationErrorTechnicalDetail(payload)).toContain('correct_answer');
  });
  it('maps nested backend messages', () => expect(formatGenerationError({ success: false, ok: false, error: { message: 'Unauthorized' } })).toBe('Unauthorized'));
  it('maps string error payloads without coercing objects', () => expect(formatGenerationError({ error: 'Service unavailable' })).toBe('Service unavailable'));
  it('maps Error instances and request-boundary failures', () => {
    expect(formatGenerationError(new Error('Failed to send a request to the Edge Function'))).toBe('La fonction de génération est indisponible.');
    expect(formatGenerationError('timeout after 5 minutes')).toBe('La génération a pris trop de temps.');
  });
  it('never renders objects as [object Object]', () => {
    for (const value of [
      null,
      undefined,
      {},
      { error: {} },
      { error: { message: { detail: 'x' } } },
      { message: { detail: 'x' } },
      '[object Object]',
    ]) {
      const visible = formatGenerationError(value);
      expect(typeof visible).toBe('string');
      expect(visible).not.toBe('[object Object]');
      expect(visible).not.toContain('[object Object]');
    }
  });
  it('keeps technical details separate', () => expect(getGenerationErrorTechnicalDetail({ error: { code: 'canonical_validation_failed', technicalDetail: { path: 'sequence[4].correct_answer' } } })).toContain('sequence[4]'));
});
