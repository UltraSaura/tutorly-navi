import { describe, expect, it } from 'vitest';
import { geometryVisualDataErrors } from './geometry-visual-contract.ts';
import { normalizeGeneratedLesson } from './lesson-normalization.ts';
import {
  STAGING_VISUAL_EXAMPLES,
  requiredGeometryKindsIssues,
  stagingFullLevelExample,
  stagingLevelMetadata,
  stagingLevelPrompt,
  stagingPromptVisualKinds,
  validateStagingLevel,
} from './staging-level-workflow.ts';

const topicName = 'La géométrie plane';
const metadata = stagingLevelMetadata('topic-1', topicName, ['objective-1']);

describe('staging prompt ↔ validator consistency (providerCalls=0)', () => {
  it.each(Object.entries(STAGING_VISUAL_EXAMPLES))('the %s example passes the real drawing validator', (_kind, example) => {
    expect(geometryVisualDataErrors(example.visual.kind, example.visual.data)).toEqual([]);
  });

  it.each(metadata.map((level) => [level.level_number, level] as const))('level %i full prompt example passes every staging validator unchanged', (_n, level) => {
    const example = stagingFullLevelExample(level);
    const lesson = normalizeGeneratedLesson(structuredClone(example), topicName, { preserveProviderSequence: true }).lesson;
    const validation = validateStagingLevel(lesson, level, topicName, 'CM2');
    expect(validation.canonicalIssues).toEqual([]);
    expect(validation.pedagogicalIssues).toEqual([]);
    expect(validation.geometryIssues).toEqual([]);
    expect(requiredGeometryKindsIssues(lesson, level.required_geometry_kinds)).toEqual([]);
  });

  it.each(metadata.map((level) => [level.level_number, level] as const))('level %i prompt embeds every required visual example verbatim and never says figures are optional', (_n, level) => {
    const prompt = stagingLevelPrompt(topicName, 'CM2', 'francais', level, 'objectif');
    for (const kind of stagingPromptVisualKinds(level)) {
      expect(prompt).toContain(JSON.stringify(STAGING_VISUAL_EXAMPLES[kind as keyof typeof STAGING_VISUAL_EXAMPLES]));
    }
    expect(prompt).not.toMatch(/seulement les visuels utiles/);
    expect(prompt).toContain('Chaque bloc concept DOIT contenir un visual dessinable');
    expect(prompt).toContain('data.rays');
    expect(prompt).toContain('data.symmetric_figure');
    expect(prompt).toContain('data.diameter');
  });
});
