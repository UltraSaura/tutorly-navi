import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  assertSafeProjectUrl,
  executeStagingDraft,
  extractVisualKinds,
  safeDiagnostics,
  validateGenerationResponse,
  STAGING_URL,
  filterMatchingTopics,
  formatTopicListResult,
  requireExplicitTopicId,
  CM2_GEOMETRY_TOPIC_ID,
  processTerminationDiagnostic,
  responseDiagnostics,
  withTimeout,
} from './generate-staging-draft.ts';

const lessonContent = {
  version: '2.1',
  levels: [1, 2, 3, 4].map((level) => ({
    level_number: level,
    lesson: {
      sequence: [{ visual: { kind: level === 1 ? 'rectangle' : level === 2 ? 'circle' : level === 3 ? 'symmetry' : 'angle', data: {} } }, { visual: { kind: level === 1 ? 'polygon' : 'angle', data: { shape: 'triangle' } } }],
    },
  })),
};

const successfulBody = {
  success: true,
  requestId: 'request-1',
  providerCalls: 4,
  canonicalValid: true,
  pedagogicalValid: true,
  geometryValid: true,
  prerequisiteValid: true,
  interactionValid: true,
  promptVersion: 'staging-v21-prerequisite-contract-v2',
  build: 'practice-v21-compiler-1',
  validation: { canonicalValid: true, pedagogicalValid: true, prerequisiteValid: true, geometryValid: true, interactionValid: true },
  lesson_content: lessonContent,
  progress: [1, 2, 3, 4].map((level) => ({ level, status: 'complete', providerCalls: 1, tokenUsage: { promptTokens: 100, completionTokens: 500, totalTokens: 600 }, validation: { canonicalValid: true, pedagogicalValid: true, prerequisiteValid: true, geometryValid: true, interactionValid: true, diagnostics: [] }, requestId: 'request-1', promptVersion: 'staging-v21-prerequisite-contract-v2', build: 'practice-v21-compiler-1', diagnostics: [] })),
};

function deps(overrides: Partial<Parameters<typeof executeStagingDraft>[0]> = {}) {
  return {
    authenticate: vi.fn(async () => ({ userId: 'admin-1', accessToken: 'secret-token', isAdmin: true })),
    findTopic: vi.fn(async () => ({ id: 'topic-1', lessonContent: { original: true } })),
    countExistingDrafts: vi.fn(async () => 0),
    invoke: vi.fn(async () => ({ ok: true, status: 200, headers: new Headers({ 'x-request-id': 'request-1' }), body: successfulBody })),
    insertDraft: vi.fn(async () => 'version-1'),
    readTopicLessonContent: vi.fn(async () => ({ original: true })),
    expectedTopicId: 'topic-1' as string | null,
    ...overrides,
  };
}

describe('staging terminal runner', () => {
  beforeEach(() => vi.stubEnv('STAGING_TOPIC_ID', 'topic-1'));
  afterEach(() => vi.unstubAllEnvs());

  it('requires an explicit staging topic id', () => {
    expect(() => requireExplicitTopicId(undefined)).toThrow('staging_topic_id_required');
    expect(requireExplicitTopicId(' topic-1 ')).toBe('topic-1');
  });

  it('reports zero topic matches without providers or writes', () => {
    const result = formatTopicListResult(filterMatchingTopics([]));
    expect(result).toMatchObject({ ok: false, code: 'topic_not_found', databaseWrite: false, providerCalls: 0 });
  });

  it('reports one topic match clearly', () => {
    const result = formatTopicListResult(filterMatchingTopics([{ id: 'topic-1', name: 'La géométrie plane', curriculumLevel: 'cm2', subject: 'Mathématiques', country: 'fr', language: 'fr', hasLessonContent: true }]));
    expect(result).toMatchObject({ ok: true, code: 'topic_unique', matches: [{ id: 'topic-1' }] });
  });

  it('reports multiple topic matches clearly', () => {
    const result = formatTopicListResult(filterMatchingTopics([
      { id: 'topic-1', name: 'La géométrie plane', curriculumLevel: 'cm2', subject: 'Mathématiques', country: 'fr', language: 'fr', hasLessonContent: true },
      { id: 'topic-2', name: 'La géométrie plane — version staging', curriculumLevel: 'cm2', subject: 'Mathématiques', country: 'fr', language: 'fr', hasLessonContent: false },
    ]));
    expect(result).toMatchObject({ ok: false, code: 'topic_not_unique', matches: [{ id: 'topic-1' }, { id: 'topic-2' }] });
  });

  it('refuses production and non-staging projects', () => {
    expect(() => assertSafeProjectUrl('https://urskkwizwutodikgznas.supabase.co')).toThrow('production_project_refused');
    expect(() => assertSafeProjectUrl('https://example.supabase.co')).toThrow('staging_project_required');
    expect(assertSafeProjectUrl(STAGING_URL)).toBe(STAGING_URL);
  });

  it('refuses unauthenticated and non-admin users before invoking', async () => {
    await expect(executeStagingDraft(deps({ authenticate: vi.fn(async () => ({ userId: '', accessToken: '', isAdmin: false })) }))).rejects.toThrow('authenticated_session_required');
    await expect(executeStagingDraft(deps({ authenticate: vi.fn(async () => ({ userId: 'user-1', accessToken: 'token', isAdmin: false })) }))).rejects.toThrow('admin_access_required');
  });

  it('accepts exactly four complete levels and inserts one draft', async () => {
    const d = deps();
    const result = await executeStagingDraft(d);
    expect(result).toMatchObject({ ok: true, providerCalls: 4, draftVersionId: 'version-1', topicLessonContentUnchanged: true, requestId: 'request-1', promptVersion: 'staging-v21-prerequisite-contract-v2', build: 'practice-v21-compiler-1', validation: { prerequisite: true, interaction: true } });
    expect(result.levelResults).toHaveLength(4);
    expect(result.levelResults?.[0]).toMatchObject({ level: 1, providerCalls: 1, prerequisiteValid: true, interactionValid: true, requestId: 'request-1' });
    expect(d.invoke).toHaveBeenCalledTimes(1);
    expect(d.insertDraft).toHaveBeenCalledTimes(1);
    expect(extractVisualKinds(lessonContent)).toEqual(['angle', 'circle', 'rectangle', 'symmetry', 'triangle']);
  });

  it('captures the function request ID from the success body when headers are unavailable', async () => {
    const d = deps({ invoke: vi.fn(async () => ({ ok: true, status: 200, body: successfulBody })) });
    const result = await executeStagingDraft(d);
    expect(result.requestId).toBe('request-1');
  });

  it('does not write when a level is incomplete', async () => {
    const d = deps({ invoke: vi.fn(async () => ({ ok: true, status: 200, body: { ...successfulBody, progress: successfulBody.progress.slice(0, 3) } })) });
    await expect(executeStagingDraft(d)).rejects.toThrow('generation_validation_failed');
    expect(d.insertDraft).not.toHaveBeenCalled();
  });

  it('preserves a 422 validation failure and never inserts a draft', async () => {
    const d = deps({ invoke: vi.fn(async () => ({ ok: false, status: 422, headers: new Headers({ 'x-request-id': 'request-422' }), body: { success: false, error: { code: 'staging_level_validation_failed', level: 2, stage: 'level_validation', providerCalls: 2 } } })) });
    const error = await executeStagingDraft(d).catch((e) => e);
    expect(error.message).toBe('edge_function_failed');
    expect(error.safeResult).toMatchObject({ ok: false, httpStatus: 422, databaseWrite: false });
    expect(d.insertDraft).not.toHaveBeenCalled();
  });

  it('refuses duplicate runs before the provider call', async () => {
    const d = deps({ countExistingDrafts: vi.fn(async () => 1) });
    await expect(executeStagingDraft(d)).rejects.toThrow('duplicate_staging_version_refused');
    expect(d.invoke).not.toHaveBeenCalled();
    expect(d.insertDraft).not.toHaveBeenCalled();
  });

  it('rejects wrong provider call counts and does not leak secrets', () => {
    expect(() => validateGenerationResponse({ ...successfulBody, providerCalls: 3 })).toThrow('provider_call_count_mismatch');
    const output = safeDiagnostics({ ok: false, code: 'staging_runner_failed', providerCalls: 0, databaseWrite: false });
    expect(output).not.toContain('secret-token');
    expect(output).not.toContain('password');
    expect(output).not.toContain('anon-key');
  });

  it('rejects an explicitly failed per-level validation even when the aggregate is true', () => {
    expect(() => validateGenerationResponse({
      ...successfulBody,
      progress: successfulBody.progress.map((entry, index) => index === 1 ? { ...entry, validation: { ...entry.validation, prerequisiteValid: false } } : entry),
    })).toThrow('generation_validation_failed');
  });

  it('refuses the fixture topic 185f20b5 for CM2 generation before any provider call', async () => {
    const fixture = '185f20b5-d698-446d-80e8-c3c462819b94';
    expect(() => requireExplicitTopicId(fixture, CM2_GEOMETRY_TOPIC_ID)).toThrow('fixture_topic_refused');
    const d = deps({ expectedTopicId: undefined, findTopic: vi.fn(async () => ({ id: fixture, lessonContent: null })) });
    await expect(executeStagingDraft(d, fixture)).rejects.toThrow('fixture_topic_refused');
    expect(d.invoke).not.toHaveBeenCalled();
    expect(d.insertDraft).not.toHaveBeenCalled();
  });

  it('refuses to save when the generator returns a different topic id', async () => {
    const d = deps({ invoke: vi.fn(async () => ({ ok: true, status: 200, body: { ...successfulBody, topic_id: 'other-topic' } })) });
    const error = await executeStagingDraft(d).catch((e) => e);
    expect(error.message).toBe('topic_id_mismatch');
    expect(error.safeResult).toMatchObject({ databaseWrite: false, requestedTopicId: 'topic-1', returnedTopicId: 'other-topic' });
    expect(d.insertDraft).not.toHaveBeenCalled();
  });

  it('reports an empty response and never inserts a draft', async () => {
    const d = deps({ invoke: vi.fn(async () => ({ ok: true, status: 200, body: null, bodyAvailable: false })) });
    const error = await executeStagingDraft(d).catch((e) => e);
    expect(error.safeResult).toMatchObject({ stage: 'response_validation', responseBodyAvailable: false, databaseWrite: false });
    expect(d.insertDraft).not.toHaveBeenCalled();
  });

  it('reports a truncated or malformed response body and never inserts a draft', async () => {
    const d = deps({ invoke: vi.fn(async () => ({ ok: false, status: 502, body: null, bodyAvailable: true, bodyLength: 17, bodyParseError: 'malformed_json' })) });
    const error = await executeStagingDraft(d).catch((e) => e);
    expect(error.safeResult).toMatchObject({ stage: 'edge_function_response', httpStatus: 502, responseBodyAvailable: true, responseBodyLength: 17, responseBodyParseError: 'malformed_json', databaseWrite: false });
    expect(error.safeResult).not.toHaveProperty('requestId');
    expect(d.insertDraft).not.toHaveBeenCalled();
  });

  it('reports invocation timeout without retrying or inserting', async () => {
    const invoke = vi.fn(async () => { throw new Error('staging_function_timeout'); });
    const d = deps({ invoke });
    const error = await executeStagingDraft(d).catch((e) => e);
    expect(error.safeResult).toMatchObject({ stage: 'edge_function_timeout', code: 'staging_function_timeout', responseBodyAvailable: false, databaseWrite: false });
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(d.insertDraft).not.toHaveBeenCalled();
  });

  it('captures missing request IDs and process termination metadata safely', () => {
    const response = { ok: false, status: 504, body: null, bodyAvailable: false };
    expect(responseDiagnostics(response)).toMatchObject({ httpStatus: 504, responseBodyAvailable: false });
    expect(processTerminationDiagnostic({ stage: 'process_termination', topicId: 'topic-1', processSignal: 'SIGTERM' })).toMatchObject({ code: 'staging_runner_terminated', stage: 'process_termination', topicId: 'topic-1', processSignal: 'SIGTERM', databaseWrite: false, responseBodyAvailable: false });
  });

  it('rejects a promise after the timeout and does not fabricate a response', async () => {
    await expect(withTimeout(new Promise<void>(() => {}), 1)).rejects.toThrow('staging_function_timeout');
  });
});
