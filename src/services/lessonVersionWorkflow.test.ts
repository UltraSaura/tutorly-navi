import { beforeEach, describe, expect, it, vi } from 'vitest';
import { geometryDraftLesson } from '@/components/admin/learning/geometryDraft';

const { authGetUser, from, invoke } = vi.hoisted(() => ({ authGetUser: vi.fn(), from: vi.fn(), invoke: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: authGetUser },
    from,
    functions: { invoke },
    rpc: vi.fn(),
  },
}));

import {
  buildDraftInsertPayload,
  generateStagingDraft,
  saveDraftVersion,
  validateDrawableGeometry,
  validateLessonVersion,
} from './lessonVersionWorkflow';

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
    invoke.mockResolvedValue({ data: { success: true, providerCalls: 1, lesson_content: geometryDraftLesson, topic_id: "e5003f68-f3aa-404b-85a9-847cdb103a81" }, error: null, response: null });
    await generateStagingDraft('e5003f68-f3aa-404b-85a9-847cdb103a81');
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke).toHaveBeenCalledWith('generate-lesson-content', expect.objectContaining({ body: expect.objectContaining({ mode: 'staging_draft', allowPaidRepair: false }) }));
  });

  it('accepts a successful four-level staging result (one provider call per level)', async () => {
    invoke.mockResolvedValue({ data: { success: true, providerCalls: 4, lesson_content: geometryDraftLesson, topic_id: "e5003f68-f3aa-404b-85a9-847cdb103a81" }, error: null, response: null });
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

  it('does not update existing topic lesson_content during draft insertion', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: 'version-1', ...buildDraftInsertPayload('e5003f68-f3aa-404b-85a9-847cdb103a81', geometryDraftLesson, 'admin-1') }, error: null });
    from.mockReturnValue({ insert: vi.fn(() => ({ select: vi.fn(() => ({ single })) })) });
    await saveDraftVersion('e5003f68-f3aa-404b-85a9-847cdb103a81', geometryDraftLesson);
    expect(from).toHaveBeenCalledTimes(1);
    expect(from).toHaveBeenCalledWith('topic_lesson_versions');
    expect(from).not.toHaveBeenCalledWith('topics');
  });
});
