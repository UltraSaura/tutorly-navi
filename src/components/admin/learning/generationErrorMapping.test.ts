import { describe, expect, it } from 'vitest';
import { formatAdminGenerationError, formatGenerationError, formatGenerationErrorDetails, getGenerationErrorDetails, getGenerationErrorTechnicalDetail } from './generationErrorMapping';

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

  it('preserves structured HTTP diagnostics without rendering objects', () => {
    const details = getGenerationErrorDetails({
      httpStatus: 422,
      error: { code: 'staging_level_validation_failed', message: 'Level validation failed.', technicalDetail: 'sequence[0].takeaway: too long', requestId: 'req-1', providerCalls: 1, level: 1, stage: 'level_validation' },
    });
    expect(details).toMatchObject({ httpStatus: 422, code: 'staging_level_validation_failed', requestId: 'req-1', providerCalls: 1, level: 1, stage: 'level_validation' });
    expect(formatGenerationErrorDetails(details)).toContain('Level validation failed.');
    expect(JSON.stringify(details)).not.toContain('[object Object]');
  });

  it('renders exact time-visual diagnostics with level, category, request ID, and technical detail', () => {
    const message = formatAdminGenerationError({
      httpStatus: 422,
      error: {
        code: 'staging_level_validation_failed',
        message: 'A staging level failed validation.',
        requestId: 'req-clock',
        providerCalls: 2,
        level: 2,
        stage: 'level_validation',
        validationCategory: 'geometry',
        technicalDetail: 'sequence[2].visual.data.hour: Clock hour must be an integer from 1 to 12; received 3.5.',
      },
    });
    expect(message).toContain('Validation failed in level 2: the clock visual has an invalid hour or minute.');
    expect(message).toContain('HTTP 422');
    expect(message).toContain('code=staging_level_validation_failed');
    expect(message).toContain('requestId=req-clock');
    expect(message).toContain('validation=geometry');
    expect(message).toContain('sequence[2].visual.data.hour');
    expect(message).not.toContain('[object Object]');
  });

  it.each([
    new Error('topic lookup failed'),
    { message: 'Edge Function returned a non-2xx status code', context: { status: 503 } },
    { status: 422, error: { code: 'canonical_validation_failed', message: 'Invalid lesson.' } },
    { unexpected: { value: true } },
  ])('formats unknown and transport error shapes safely', (value) => {
    const details = getGenerationErrorDetails(value);
    expect(typeof details.message).toBe('string');
    expect(details.message).not.toContain('[object Object]');
    expect(formatGenerationErrorDetails(details)).not.toContain('[object Object]');
  });

  it('distinguishes pre-generation, provider, validation, and save failures', () => {
    expect(formatGenerationErrorDetails({ message: 'Topic lookup failed.', stage: 'pre_generation' })).toContain('Generation did not start');
    expect(formatGenerationErrorDetails({ message: 'Upstream failed.', stage: 'provider_failure' })).toContain('Provider failure');
    expect(formatGenerationErrorDetails({ message: 'Invalid lesson.', stage: 'validation_failure' })).toContain('Validation failure');
    expect(formatGenerationErrorDetails({ message: 'Insert failed.', stage: 'database_save' })).toContain('Database save failure');
  });

  it('identifies whether malformed JSON failed initially or after the bounded retry', () => {
    const initial = formatAdminGenerationError({ error: { code: 'provider_malformed_json', retryCount: 0, parseStage: 'malformed_json', providerCalls: 1 } });
    const retried = formatAdminGenerationError({ error: { code: 'provider_malformed_json', retryCount: 1, parseStage: 'ambiguous_json', providerCalls: 2 } });
    expect(initial).toContain('sur la réponse initiale');
    expect(initial).toContain('retryCount=0');
    expect(retried).toContain('après le retry JSON borné');
    expect(retried).toContain('retryCount=1');
    expect(retried).toContain('parseStage=ambiguous_json');
  });

  it('preserves safe provider diagnostics without exposing provider content or tokens', () => {
    const payload = {
      httpStatus: 502,
      error: {
        code: 'provider_malformed_json',
        message: 'The provider response could not be parsed.',
        providerDiagnostics: {
          finishReason: 'stop',
          contentLength: 42,
          choiceCount: 1,
          parseState: 'malformed_json',
          bodyLength: 128,
          content: '{"secretLesson":"do not show"}',
          tokens: ['do-not-show'],
          syntaxError: { message: 'Unexpected token', position: 17, raw: 'secret' },
        },
      },
    };
    const details = getGenerationErrorDetails(payload);
    expect(details.providerDiagnostics).toEqual({
      finishReason: 'stop',
      contentLength: 42,
      choiceCount: 1,
      parseState: 'malformed_json',
      bodyLength: 128,
      syntaxError: { message: 'Unexpected token', position: 17 },
    });
    const visible = formatAdminGenerationError(payload);
    expect(visible).toContain('finishReason=stop');
    expect(visible).toContain('contentLength=42');
    expect(visible).toContain('choiceCount=1');
    expect(visible).toContain('parseState=malformed_json');
    expect(visible).toContain('syntaxPosition=17');
    expect(visible).not.toContain('secretLesson');
    expect(visible).not.toContain('do-not-show');
  });
});
