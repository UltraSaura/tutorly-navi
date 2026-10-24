import { describe, expect, it, vi } from 'vitest';
import { geometryDraftLesson } from '@/components/admin/learning/geometryDraft';
import { runBulkStagingGeneration, validateBulkTopicIds } from './bulkStagingLessonWorkflow';
import { semanticDuplicationDiagnostics } from '../../supabase/functions/generate-lesson-content/pedagogical-quality';
import { stagingValidationFailure } from '../../supabase/functions/generate-lesson-content/staging-level-workflow';

const generated = (topicId: string, providerCalls = 4) => ({
  success: true,
  lesson_content: geometryDraftLesson,
  topic_id: topicId,
  providerCalls,
  canonicalValid: true as const,
  pedagogicalValid: true as const,
  geometryValid: true as const,
  levelResults: [1, 2, 3, 4].map((level) => ({ level, status: 'complete' as const, providerCalls: providerCalls === 4 ? 1 : Math.max(1, providerCalls - 3) })),
  progress: [1, 2, 3, 4].map((level) => ({ level, status: 'complete' as const, providerCalls: 1 })),
});

const valid = () => ({ canonicalValid: true, pedagogicalValid: true, prerequisiteValid: true, interactionValid: true, geometryValid: true, canonicalIssues: [], pedagogicalIssues: [], geometryIssues: [] });

describe('bulk staging lesson workflow', () => {
  it('never saves or retries after a genuine level-1 geometry duplicate rejection', async () => {
    const diagnostics = semanticDuplicationDiagnostics({
      content: 'Une aire décrit la surface occupée par une figure.',
      key_points: [{ label: 'A', text: 'Le rectangle possède quatre sommets.' }, { label: 'B', text: 'LE RECTANGLE possède quatre sommets !' }],
      takeaway: 'Astuce : pense à un tapis.',
    });
    expect(diagnostics).toHaveLength(1);
    const failure = stagingValidationFailure(1, diagnostics.map((d) => ({ path: 'sequence[0].key_points', message: d.reason })), 1);
    const generate = vi.fn(async () => { throw { ...failure, httpStatus: 422, requestId: 'req-aires', message: failure.technicalDetail }; });
    const save = vi.fn();
    const results = await runBulkStagingGeneration([{ id: '7be61901-cc83-4cb3-90bb-b7056c4542bc', name: 'Les aires' }], undefined, { generate, save });
    expect(results[0].failure).toMatchObject({ httpStatus: 422, failedLevel: 1, providerCalls: 1, requestId: 'req-aires' });
    expect(generate).toHaveBeenCalledTimes(1);
    expect(save).not.toHaveBeenCalled();
  });
  it('never saves or retries after the level-1 multiplier duplicate rejection', async () => {
    const diagnostics = semanticDuplicationDiagnostics({
      content: 'Une conversion relie deux unités de durée.',
      key_points: [{ label: 'A', text: 'multiplier' }, { label: 'B', text: 'Multiplier !' }],
      takeaway: 'Astuce : pense à une échelle.',
    });
    const failure = stagingValidationFailure(1, diagnostics.map((d) => ({ path: 'sequence[1].key_points', message: d.reason })), 1);
    const generate = vi.fn(async () => { throw { ...failure, httpStatus: 422, requestId: 'req-multiplier', message: failure.technicalDetail }; });
    const save = vi.fn();
    const results = await runBulkStagingGeneration([{ id: '7588497a-6173-4144-864e-25bcab6b4011', name: 'Le repérage dans le temps et les durées' }], undefined, { generate, save });
    expect(diagnostics.filter((d) => d.reason.includes('identiques après normalisation'))).toHaveLength(1);
    expect(results[0].status).toBe('failed');
    expect(results[0].failure).toMatchObject({ httpStatus: 422, failedLevel: 1, providerCalls: 1, requestId: 'req-multiplier' });
    expect(results[0].failure?.technicalDiagnostic).toContain('key_points[0].text et key_points[1].text');
    expect(generate).toHaveBeenCalledTimes(1);
    expect(save).not.toHaveBeenCalled();
  });
  it('saves one topic only after a complete four-call result', async () => {
    const generate = vi.fn(async (id: string) => generated(id));
    const save = vi.fn(async (id: string) => ({ id: `version-${id}` } as any));
    const results = await runBulkStagingGeneration([{ id: 'topic-1', name: 'Figures' }], undefined, { generate, save, validate: valid });
    expect(results[0].status).toBe('saved');
    expect(generate).toHaveBeenCalledTimes(1);
    expect(generate).toHaveBeenCalledWith('topic-1');
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('continues a multi-topic bundle after one topic fails, without retrying', async () => {
    const generate = vi.fn(async (id: string) => {
      if (id === 'bad') throw Object.assign(new Error('levels[2].lesson.sequence: invalid'), { providerCalls: 3, failedLevel: 3, failureStage: 'level_validation' });
      return generated(id);
    });
    const save = vi.fn(async (id: string) => ({ id } as any));
    const results = await runBulkStagingGeneration([{ id: 'bad', name: 'Bad' }, { id: 'good', name: 'Good' }], undefined, { generate, save, validate: valid });
    expect(results.map((result) => result.status)).toEqual(['failed', 'saved']);
    expect(generate).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenCalledTimes(1);
    expect(results[0].failure).toMatchObject({ topicId: 'bad', topicTitle: 'Bad', failedLevel: 3, failureStage: 'level_validation', providerCalls: 3 });
  });

  it('rejects duplicate and missing IDs before any provider call', async () => {
    const generate = vi.fn();
    expect(() => validateBulkTopicIds([{ id: 'same', name: 'A' }, { id: 'same', name: 'B' }])).toThrow(/duplicate_topic_id/);
    expect(() => validateBulkTopicIds([{ id: '', name: 'A' }])).toThrow(/staging_topic_id_required/);
    await expect(runBulkStagingGeneration([{ id: 'same', name: 'A' }, { id: 'same', name: 'B' }], undefined, { generate })).rejects.toThrow(/duplicate_topic_id/);
    expect(generate).not.toHaveBeenCalled();
  });

  it('rejects the known duplicate fixture before any provider call', async () => {
    const generate = vi.fn();
    await expect(runBulkStagingGeneration([{ id: '185f20b5-d698-446d-80e8-c3c462819b94', name: 'Fixture' }], undefined, { generate })).resolves.toEqual([
      expect.objectContaining({ status: 'failed', failure: expect.objectContaining({ failureStage: 'pre_generation', providerCalls: 0 }) }),
    ]);
    expect(generate).not.toHaveBeenCalled();
  });

  it('emits the required topic/level/call/status progress and has a provider-free dry run', async () => {
    const progress: string[] = [];
    const save = vi.fn();
    const results = await runBulkStagingGeneration([{ id: 'topic-1', name: 'Figures' }], (event) => {
      progress.push(`Topic ${event.topicIndex} of ${event.totalTopics} · Level ${event.level} of ${event.totalLevels} · Provider calls: ${event.providerCalls} · Status: ${event.status}`);
    }, { dryRun: true, dryRunContent: geometryDraftLesson, save });
    expect(results[0].status).toBe('saved');
    expect(progress).toContain('Topic 1 of 1 · Level 1 of 4 · Provider calls: 0 · Status: generating');
    expect(progress).toContain('Topic 1 of 1 · Level 4 of 4 · Provider calls: 0 · Status: saved');
    expect(save).not.toHaveBeenCalled();
  });

  it('never produces object-string diagnostics', async () => {
    const results = await runBulkStagingGeneration([{ id: 'bad', name: 'Bad' }], undefined, {
      generate: async () => { throw { code: 'validation', path: 'levels[0]', message: 'invalid' }; },
    });
    expect(results[0].failure?.technicalDiagnostic).not.toContain('[object Object]');
  });

  it('keeps failed per-level metadata from the Edge response for the UI', async () => {
    const progress = [{ level: 2, status: 'failed', providerCalls: 1, requestId: 'req-failed', promptVersion: 'staging-v21-prerequisite-contract-v2', build: 'practice-v21-compiler-1', diagnostics: ['prerequisites[0].expected_answer: missing'], validation: { canonicalValid: false, pedagogicalValid: true, prerequisiteValid: false, geometryValid: true, interactionValid: true } }];
    const results = await runBulkStagingGeneration([{ id: 'bad', name: 'Bad' }], undefined, {
      generate: async () => { throw { code: 'staging_level_validation_failed', message: 'Level validation failed', stage: 'level_validation', providerCalls: 1, level: 2, progress }; },
    });
    expect(results[0].levelResults).toEqual(progress);
    expect(JSON.stringify(results[0])).not.toContain('[object Object]');
  });

  it.each([
    ['topic lookup failure', { code: 'topic_lookup_failed', message: 'Topic could not be loaded.', stage: 'pre_generation' }, 'pre_generation'],
    ['duplicate-version refusal', { code: 'duplicate_staging_version_refused', message: 'A draft already exists.', stage: 'pre_generation' }, 'pre_generation'],
    ['transport failure', { code: 'edge_unavailable', message: 'The Edge Function is unavailable.', stage: 'pre_generation' }, 'pre_generation'],
  ])('preserves %s with zero provider calls', async (_name, error, expectedStage) => {
    const results = await runBulkStagingGeneration([{ id: 'topic-1', name: 'Figures' }], undefined, {
      generate: async () => { throw { ...error, httpStatus: 503, requestId: 'req-1', providerCalls: 0 }; },
    });
    expect(results[0].failure).toMatchObject({ code: error.code, message: error.message, failureStage: expectedStage, httpStatus: 503, requestId: 'req-1', providerCalls: 0 });
    expect(results[0].failure?.technicalDiagnostic).toContain(error.message);
  });

  it('keeps validation and database-save failures distinct', async () => {
    const validation = await runBulkStagingGeneration([{ id: 'topic-1', name: 'Figures' }], undefined, {
      generate: async () => { throw { code: 'canonical_validation_failed', message: 'Invalid lesson.', stage: 'validation_failure', providerCalls: 1, level: 2 }; },
    });
    expect(validation[0].failure).toMatchObject({ failureStage: 'validation_failure', failedLevel: 2, providerCalls: 1 });

    const save = await runBulkStagingGeneration([{ id: 'topic-1', name: 'Figures' }], undefined, {
      generate: async (id) => generated(id),
      validate: valid,
      save: async () => { throw { code: 'draft_save_failed', message: 'Insert failed.', stage: 'database_save', providerCalls: 4 }; },
    });
    expect(save[0].failure).toMatchObject({ failureStage: 'database_save', providerCalls: 4 });
  });

  it('reports the legacy prerequisite format clearly and never saves the Aires-like failure', async () => {
    const save = vi.fn();
    const results = await runBulkStagingGeneration([{ id: 'aires-topic', name: 'Aires' }], undefined, {
      generate: async (id) => ({ ...generated(id), providerCalls: 4 }),
      validate: () => ({
        canonicalValid: false,
        pedagogicalValid: true,
        geometryValid: true,
        canonicalIssues: [
          { path: 'levels[0].lesson.prerequisites[0].check_question', message: 'Required' },
          { path: 'levels[0].lesson.prerequisites[0].answer_type', message: 'Unsupported answer type' },
        ],
        pedagogicalIssues: [],
        geometryIssues: [],
      }),
      save,
    });
    expect(results[0].failure).toMatchObject({ failureStage: 'validation_failure', providerCalls: 4 });
    expect(results[0].failure?.technicalDiagnostic).toContain('Validation failed: prerequisites have the legacy format');
    expect(results[0].failure?.technicalDiagnostic).toContain('check_question');
    expect(save).not.toHaveBeenCalled();
  });

  it('uses one shared four-level generation result for a valid Aires-like topic', async () => {
    const levelResults = [1, 2, 3, 4].map((level) => ({ level, status: 'complete' as const, providerCalls: 1, canonicalValid: true, pedagogicalValid: true, prerequisiteValid: true, geometryValid: true, interactionValid: true, requestId: `req-${level}`, promptVersion: 'staging-v21-prerequisite-contract-v2', build: 'practice-v21-compiler-1', diagnostics: [], tokenUsage: { totalTokens: 30 } }));
    const generate = vi.fn(async (id: string) => ({ ...generated(id), providerCalls: 4, build: 'practice-v21-compiler-1', promptVersion: 'staging-v21-prerequisite-contract-v2', requestId: 'req-topic', levelResults, progress: levelResults }));
    const save = vi.fn(async (id: string) => ({ id } as any));
    const results = await runBulkStagingGeneration([{ id: 'aires-topic', name: 'Aires' }], undefined, { generate, save, validate: valid });
    expect(results[0]).toMatchObject({ status: 'saved', providerCalls: 4, build: 'practice-v21-compiler-1', promptVersion: 'staging-v21-prerequisite-contract-v2', requestId: 'req-topic', levelResults });
    expect(generate).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledTimes(1);
  });
});
