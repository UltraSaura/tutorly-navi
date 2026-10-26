import { beforeEach, describe, expect, it, vi } from 'vitest';
import { geometryDraftLesson } from '@/components/admin/learning/geometryDraft';

const { authGetUser, from, invoke, rpc } = vi.hoisted(() => ({ authGetUser: vi.fn(), from: vi.fn(), invoke: vi.fn(), rpc: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: authGetUser },
    from,
    functions: { invoke },
    rpc,
  },
}));

import {
  buildDraftInsertPayload,
  getStoredStagingTopicKind,
  getStoredStagingMetadata,
  generateStagingDraft,
  publishValidatedDraft,
  saveDraftVersion,
  validateDrawableGeometry,
  validateLessonVersion,
  validateStagingGenerationEnvelope,
  withStagingTopicKind,
  withStagingMetadata,
} from './lessonVersionWorkflow';
import { previewReviewWarnings } from '@/pages/admin/StagingLessonWorkflowPage';

describe('lesson version workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } }, error: null });
  });

  it('builds a separate draft insertion payload without touching topics', () => {
    const payload = buildDraftInsertPayload('e5003f68-f3aa-404b-85a9-847cdb103a81', geometryDraftLesson, 'admin-1');
    expect(payload).toEqual({ topic_id: 'e5003f68-f3aa-404b-85a9-847cdb103a81', lesson_content: geometryDraftLesson, status: 'draft', created_by: 'admin-1' });
    expect(payload).not.toHaveProperty('lesson_content_update');
  });

  it('inserts a valid draft through the version table and preserves the admin identity', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: 'version-1', ...buildDraftInsertPayload('e5003f68-f3aa-404b-85a9-847cdb103a81', geometryDraftLesson, 'admin-1') }, error: null });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    from.mockReturnValue({ insert });
    await saveDraftVersion('e5003f68-f3aa-404b-85a9-847cdb103a81', geometryDraftLesson);
    expect(from).toHaveBeenCalledWith('topic_lesson_versions');
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ topic_id: 'e5003f68-f3aa-404b-85a9-847cdb103a81', status: 'draft', created_by: 'admin-1' }));
  });

  it('persists and recovers the server-selected staging topic kind', async () => {
    const insert = vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { id: 'version-decimal', ...buildDraftInsertPayload('07fe506e-71f4-44c9-bf7f-98c51a2ca68a', withStagingTopicKind(geometryDraftLesson, 'decimal'), 'admin-1') }, error: null }) })) }));
    from.mockReturnValue({ insert });
    await saveDraftVersion('07fe506e-71f4-44c9-bf7f-98c51a2ca68a', geometryDraftLesson, '07fe506e-71f4-44c9-bf7f-98c51a2ca68a', null, 'decimal');
    const payload = insert.mock.calls[0][0] as { lesson_content: unknown };
    expect(getStoredStagingTopicKind(payload.lesson_content)).toBe('decimal');
  });

  it('round-trips Edge review warnings through draft save, reread, and preview metadata', async () => {
    const warning = { path: 'sequence[1].takeaway', message: 'Similarité lexicale à revoir. overlap=2, ratio=0.50.' };
    const metadata = { pedagogicalWarnings: [warning], pedagogicalReviewRequired: true };
    invoke.mockResolvedValue({ data: {
      success: true,
      providerCalls: 4,
      lesson_content: geometryDraftLesson,
      topic_id: 'e5003f68-f3aa-404b-85a9-847cdb103a81',
      validation: metadata,
      levelResults: [1, 2, 3, 4].map((level) => ({ level, status: 'complete', providerCalls: 1 })),
    }, error: null, response: null });
    const generated = await generateStagingDraft('e5003f68-f3aa-404b-85a9-847cdb103a81');
    const persistedContent = withStagingMetadata(geometryDraftLesson, metadata);
    const row = { id: 'version-warning', ...buildDraftInsertPayload('e5003f68-f3aa-404b-85a9-847cdb103a81', persistedContent, 'admin-1') };
    const single = vi.fn().mockResolvedValue({ data: row, error: null });
    from.mockReturnValue({ insert: vi.fn(() => ({ select: vi.fn(() => ({ single })) })) });

    const saved = await saveDraftVersion('e5003f68-f3aa-404b-85a9-847cdb103a81', generated.lesson_content, generated.topic_id, null, 'geometry', generated.validation as any);
    const reread = saved.lesson_content;
    expect(getStoredStagingMetadata(reread)).toEqual(metadata);
    expect(previewReviewWarnings(reread)).toEqual([warning]);
    expect((reread as Record<string, unknown>).levels).toEqual((geometryDraftLesson as Record<string, unknown>).levels);
  });

  it('surfaces the RLS rejection returned for a non-admin authenticated user', async () => {
    const single = vi.fn().mockResolvedValue({ data: null, error: { code: '42501', message: 'new row violates row-level security policy' } });
    from.mockReturnValue({ insert: vi.fn(() => ({ select: vi.fn(() => ({ single })) })) });
    await expect(saveDraftVersion('e5003f68-f3aa-404b-85a9-847cdb103a81', geometryDraftLesson)).rejects.toThrow(/row-level security/);
  });

  it('rejects incomplete geometry before a draft can be published', () => {
    const incomplete = structuredClone(geometryDraftLesson) as any;
    incomplete.levels[0].lesson.sequence[2].visual.data.radius = undefined;
    const validation = validateLessonVersion(incomplete);
    expect(validation.geometryValid).toBe(false);
    expect(validateDrawableGeometry(incomplete).some((issue) => issue.message.includes('positive radius'))).toBe(true);
  });

  it('makes exactly one staging edge request and does not retry', async () => {
    invoke.mockResolvedValue({ data: { success: true, providerCalls: 4, lesson_content: geometryDraftLesson, topic_id: "e5003f68-f3aa-404b-85a9-847cdb103a81", levelResults: [1, 2, 3, 4].map((level) => ({ level, status: 'complete', providerCalls: 1 })) }, error: null, response: null });
    await generateStagingDraft('e5003f68-f3aa-404b-85a9-847cdb103a81');
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke).toHaveBeenCalledWith('generate-lesson-content', expect.objectContaining({
      body: {
        mode: 'staging_draft',
        topicId: 'e5003f68-f3aa-404b-85a9-847cdb103a81',
        modelId: undefined,
        language: 'fr',
        allowPaidRepair: false,
        rejectionInBody: true,
      },
    }));
  });

  it('accepts a successful four-level staging result (one provider call per level)', async () => {
    invoke.mockResolvedValue({ data: { success: true, providerCalls: 4, lesson_content: geometryDraftLesson, topic_id: "e5003f68-f3aa-404b-85a9-847cdb103a81", levelResults: [1, 2, 3, 4].map((level) => ({ level, status: 'complete', providerCalls: 1 })) }, error: null, response: null });
    const result = await generateStagingDraft('e5003f68-f3aa-404b-85a9-847cdb103a81');
    expect(result.lesson_content).toBe(geometryDraftLesson);
    expect(result.providerCalls).toBe(4);
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it('rejects a success response that reports no provider calls', async () => {
    invoke.mockResolvedValue({ data: { success: true, providerCalls: 0, lesson_content: geometryDraftLesson }, error: null, response: null });
    await expect(generateStagingDraft('e5003f68-f3aa-404b-85a9-847cdb103a81')).rejects.toThrow(/Unexpected providerCalls value: 0/);
  });

  it('surfaces exact staging validation paths to the admin UI', async () => {
    const payload = {
      success: false,
      error: {
        code: 'staging_level_validation_failed',
        message: 'A staging level failed canonical, pedagogical, or geometry validation.',
        technicalDetail: 'levels[0].lesson.mastery.skills: Expected 0–many non-empty strings; sequence[0].key_points: content and key_points share too many pedagogically significant tokens',
      },
    };
    invoke.mockResolvedValue({
      data: null,
      error: { message: 'Edge Function returned a non-2xx status code' },
      response: { clone: () => ({ json: async () => payload }) },
    });
    await expect(generateStagingDraft('e5003f68-f3aa-404b-85a9-847cdb103a81')).rejects.toThrow(/levels\[0\]\.lesson\.mastery\.skills: Expected 0–many non-empty strings/);
    expect(from).not.toHaveBeenCalled();
  });

  it('treats a rejection delivered in a 200 body as a 422 failure and saves nothing', async () => {
    invoke.mockResolvedValue({
      data: { success: false, ok: false, httpStatus: 422, requestId: 'r1', error: { code: 'staging_level_validation_failed', message: 'Rejected.', technicalDetail: 'sequence[1].takeaway: overlap=4', providerCalls: 3, level: 3 } },
      error: null,
      response: null,
    });
    const error = await generateStagingDraft('e5003f68-f3aa-404b-85a9-847cdb103a81').catch((value) => value);
    expect(error).toMatchObject({ httpStatus: 422, code: 'staging_level_validation_failed', providerCalls: 3 });
    expect(String(error.message)).toMatch(/overlap=4/);
    expect(invoke).toHaveBeenCalledWith('generate-lesson-content', expect.objectContaining({ body: expect.objectContaining({ rejectionInBody: true }) }));
    expect(from).not.toHaveBeenCalled();
  });

  it('preserves transport failures with unknown provider calls when no response exists', async () => {
    invoke.mockResolvedValue({ data: null, error: Object.assign(new Error('Failed to send a request to the Edge Function'), { code: 'FunctionsFetchError' }), response: null });
    const error = await generateStagingDraft('e5003f68-f3aa-404b-85a9-847cdb103a81').catch((value) => value);
    expect(error).toMatchObject({ stage: 'pre_generation', failureStage: 'pre_generation', providerCallsKnown: false, databaseWrite: false, responseBodyAvailable: false });
    expect(error).not.toHaveProperty('providerCalls', 0);
    expect(error.message).toContain('Failed to send');
  });

  it('times out a hanging browser invocation without retrying or writing', async () => {
    vi.useFakeTimers();
    try {
      invoke.mockReturnValue(new Promise(() => {}));
      const pending = generateStagingDraft('e5003f68-f3aa-404b-85a9-847cdb103a81').catch((value) => value);
      await vi.advanceTimersByTimeAsync(120_000);
      const error = await pending;
      expect(error).toMatchObject({ code: 'staging_browser_timeout', stage: 'provider_failure', providerCallsKnown: false, databaseWrite: false, responseBodyAvailable: false });
      expect(error).not.toHaveProperty('providerCalls', 0);
      expect(invoke).toHaveBeenCalledTimes(1);
      expect(from).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('preserves structured 4xx and 5xx response diagnostics without saving', async () => {
    for (const [status, code] of [[422, 'staging_level_validation_failed'], [502, 'provider_error']] as const) {
      vi.clearAllMocks();
      const payload = { success: false, error: { code, message: `Failure ${status}`, technicalDetail: 'exact technical detail', requestId: `req-${status}`, providerCalls: status === 422 ? 1 : 2, level: 1, stage: status === 422 ? 'level_validation' : 'provider_failure' } };
      invoke.mockResolvedValue({ data: null, error: { message: 'Edge Function returned a non-2xx status code' }, response: { status, headers: new Headers({ 'x-request-id': `req-${status}` }), clone: () => ({ json: async () => payload }) } });
      const error = await generateStagingDraft('e5003f68-f3aa-404b-85a9-847cdb103a81').catch((value) => value);
      expect(error).toMatchObject({ httpStatus: status, code, requestId: `req-${status}`, providerCalls: payload.error.providerCalls, failedLevel: 1, failureStage: payload.error.stage });
      expect(error.message).toContain(`Failure ${status}`);
      expect(error.message).toContain('exact technical detail');
      expect(from).not.toHaveBeenCalled();
    }
  });

  it('rejects malformed success envelopes with a response-parsing diagnostic', async () => {
    invoke.mockResolvedValue({ data: { success: true, providerCalls: 0 }, error: null, response: new Response(null, { status: 200 }) });
    const error = await generateStagingDraft('e5003f68-f3aa-404b-85a9-847cdb103a81').catch((value) => value);
    expect(error).toMatchObject({ code: 'malformed_response', stage: 'response_parsing', providerCalls: 0 });
    expect(error.message).toContain('malformed');
  });

  it('does not update existing topic lesson_content during draft insertion', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: 'version-1', ...buildDraftInsertPayload('e5003f68-f3aa-404b-85a9-847cdb103a81', geometryDraftLesson, 'admin-1') }, error: null });
    from.mockReturnValue({ insert: vi.fn(() => ({ select: vi.fn(() => ({ single })) })) });
    await saveDraftVersion('e5003f68-f3aa-404b-85a9-847cdb103a81', geometryDraftLesson);
    expect(from).toHaveBeenCalledTimes(1);
    expect(from).toHaveBeenCalledWith('topic_lesson_versions');
    expect(from).not.toHaveBeenCalledWith('topics');
  });

  it('rejects a success response that reports fewer than four provider calls and saves nothing', async () => {
    invoke.mockResolvedValue({ data: { success: true, providerCalls: 3, lesson_content: geometryDraftLesson, topic_id: 'e5003f68-f3aa-404b-85a9-847cdb103a81', levelResults: [1, 2, 3, 4].map((level) => ({ level, status: 'complete', providerCalls: 1 })) }, error: null, response: null });
    const error = await generateStagingDraft('e5003f68-f3aa-404b-85a9-847cdb103a81').catch((value) => value);
    expect(error).toMatchObject({ code: 'staging_provider_call_count_invalid', stage: 'response_parsing', providerCalls: 3 });
    expect(error.message).toContain('providerCalls=3');
    expect(from).not.toHaveBeenCalled();
  });

  it('rejects a success response that reports more than four provider calls and saves nothing', async () => {
    invoke.mockResolvedValue({ data: { success: true, providerCalls: 5, lesson_content: geometryDraftLesson, topic_id: 'e5003f68-f3aa-404b-85a9-847cdb103a81', levelResults: [1, 2, 3, 4].map((level) => ({ level, status: 'complete', providerCalls: level === 3 ? 2 : 1 })) }, error: null, response: null });
    await expect(generateStagingDraft('e5003f68-f3aa-404b-85a9-847cdb103a81')).resolves.toMatchObject({ providerCalls: 5 });
    expect(from).not.toHaveBeenCalled();
  });

  it('rejects an incomplete level envelope before any draft insertion', async () => {
    invoke.mockResolvedValue({ data: { success: true, providerCalls: 4, lesson_content: geometryDraftLesson, topic_id: 'e5003f68-f3aa-404b-85a9-847cdb103a81', levelResults: [1, 2, 3, 4].map((level) => ({ level, status: level === 3 ? 'failed' : 'complete', providerCalls: 1 })) }, error: null, response: null });
    const error = await generateStagingDraft('e5003f68-f3aa-404b-85a9-847cdb103a81').catch((value) => value);
    expect(error).toMatchObject({ code: 'staging_level_results_invalid', stage: 'response_parsing', providerCalls: 4 });
    expect(from).not.toHaveBeenCalled();
  });

  it('publishes a time-topic draft without requiring geometry visuals', async () => {
    const timeLesson = structuredClone(geometryDraftLesson) as any;
    timeLesson.levels[0].lesson.sequence = [
      { kind: 'clock', alt_text: 'Horloge.', purpose: 'Lire l’heure.', data: { hour: 3, minute: 15 } },
      { kind: 'timeline', alt_text: 'Frise.', purpose: 'Ordonner.', data: { units: ['seconde', 'minute', 'heure'] } },
      { kind: 'unit_conversion', alt_text: 'Conversion.', purpose: 'Convertir.', data: { from: 'minute', to: 'seconde', factor: 60 } },
    ].map((visual, index) => ({ id: `time-${index}`, type: 'visual', title: `Bloc ${index + 1}`, content: 'On observe la représentation pour raisonner sur les durées.', visual }));
    rpc.mockResolvedValue({ data: { id: 'version-1', status: 'published' }, error: null });
    await publishValidatedDraft('version-1', '7588497a-6173-4144-864e-25bcab6b4011', timeLesson, true, 'time');
    expect(rpc).toHaveBeenCalledWith('publish_topic_lesson_version', { p_version_id: 'version-1', p_topic_id: '7588497a-6173-4144-864e-25bcab6b4011', p_confirm: true });
  });

  it('blocks publishing a time-topic draft when the geometry contract is applied by mistake', async () => {
    const timeLesson = structuredClone(geometryDraftLesson) as any;
    timeLesson.levels[0].lesson.sequence = [
      { kind: 'clock', alt_text: 'Horloge.', purpose: 'Lire l’heure.', data: { hour: 3, minute: 15 } },
    ].map((visual, index) => ({ id: `time-${index}`, type: 'visual', title: `Bloc ${index + 1}`, content: 'On observe la représentation pour raisonner sur les durées.', visual }));
    await expect(publishValidatedDraft('version-1', '7588497a-6173-4144-864e-25bcab6b4011', timeLesson, true)).rejects.toThrow(/publish_validation_failed/);
    expect(rpc).not.toHaveBeenCalled();
  });
});
