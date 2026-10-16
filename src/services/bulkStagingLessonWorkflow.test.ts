import { describe, expect, it, vi } from 'vitest';
import { geometryDraftLesson } from '@/components/admin/learning/geometryDraft';
import { runBulkStagingGeneration, validateBulkTopicIds } from './bulkStagingLessonWorkflow';

const generated = (topicId: string, providerCalls = 4) => ({
  success: true,
  lesson_content: geometryDraftLesson,
  topic_id: topicId,
  providerCalls,
  canonicalValid: true,
  pedagogicalValid: true,
  geometryValid: true,
});

const valid = () => ({ canonicalValid: true, pedagogicalValid: true, geometryValid: true, canonicalIssues: [], pedagogicalIssues: [], geometryIssues: [] });

describe('bulk staging lesson workflow', () => {
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
      expect.objectContaining({ status: 'failed', failure: expect.objectContaining({ failureStage: 'generation_or_save', providerCalls: 0 }) }),
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
});
