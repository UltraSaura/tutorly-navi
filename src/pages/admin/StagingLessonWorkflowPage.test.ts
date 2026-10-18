import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { storedGeometryVisualFixture } from '@/components/admin/learning/geometryLesson.fixture';
import { runBulkStagingGeneration } from '@/services/bulkStagingLessonWorkflow';
import { playerLesson, previewVisualKinds, providerFreeFourLevelLesson } from './StagingLessonWorkflowPage';

describe('independent staging lesson-version workflow', () => {
  it('keeps destructive legacy controls isolated and clearly labelled', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/components/admin/learning/BulkLessonGenerator.tsx'), 'utf8');
    expect(source).toContain('Afficher les contrôles legacy');
    expect(source).toContain('Générateur legacy (modifie topics.lesson_content)');
    expect(source).toContain('Le bouton staging ci-dessus n’utilise jamais cette persistance.');
  });

  it('adapts every stored level for the shared student player and keeps visuals', () => {
    const level = storedGeometryVisualFixture.levels[3];
    const player = playerLesson(level);
    expect(player.version).toBe('2.0');
    expect(player.sequence.length).toBeGreaterThan(0);
    expect(previewVisualKinds(level.lesson)).toEqual(['diagram', 'angle', 'rectangle', 'circle', 'symmetry']);
  });

  it('supports one-topic and multi-topic provider-free runs without writes', async () => {
    const save = async () => { throw new Error('save must not be called in dry-run'); };
    const one = await runBulkStagingGeneration([{ id: 'topic-one', name: 'One' }], undefined, { dryRun: true, dryRunContent: providerFreeFourLevelLesson, save });
    const many = await runBulkStagingGeneration([{ id: 'topic-one', name: 'One' }, { id: 'topic-two', name: 'Two' }], undefined, { dryRun: true, dryRunContent: providerFreeFourLevelLesson, save });
    expect(one[0]).toMatchObject({ status: 'saved', providerCalls: 0 });
    expect(many).toHaveLength(2);
    expect(many.every((result) => result.status === 'saved')).toBe(true);
    expect(one[0].providerCalls).toBe(0);
    expect(one[0].levelResults).toHaveLength(4);
    expect(JSON.stringify(one[0])).not.toContain('[object Object]');
  });

  it('continues after a failed topic and preserves per-topic diagnostics', async () => {
    const results = await runBulkStagingGeneration([{ id: 'bad', name: 'Bad' }, { id: 'good', name: 'Good' }], undefined, {
      generate: async (id) => id === 'bad'
        ? Promise.reject({ code: 'level_validation_failed', message: 'Bad level', technicalDetail: 'exact diagnostic', stage: 'validation_failure', providerCalls: 1, level: 2 })
        : Promise.resolve({ success: true, lesson_content: storedGeometryVisualFixture, topic_id: id, providerCalls: 4, canonicalValid: true, pedagogicalValid: true, geometryValid: true }),
      validate: () => ({ canonicalValid: true, pedagogicalValid: true, geometryValid: true, canonicalIssues: [], pedagogicalIssues: [], geometryIssues: [] }),
      save: async (id) => ({ id: `draft-${id}` } as any),
    });
    expect(results.map((result) => result.status)).toEqual(['failed', 'saved']);
    expect(results[0].failure).toMatchObject({ failureStage: 'validation_failure', failedLevel: 2, providerCalls: 1, technicalDiagnostic: expect.stringContaining('exact diagnostic') });
    expect(results[1].version?.id).toBe('draft-good');
  });
});
