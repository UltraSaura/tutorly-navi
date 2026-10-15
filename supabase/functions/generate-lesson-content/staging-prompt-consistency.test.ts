import { describe, expect, it } from 'vitest';
import { geometryVisualDataErrors } from './geometry-visual-contract.ts';
import { normalizeGeneratedLesson } from './lesson-normalization.ts';
import { meaningfulTokens, semanticDuplicationDiagnostics } from './pedagogical-quality.ts';
import {
  KEY_POINT_RULE,
  PREREQUISITE_ANSWER_RULE,
  STAGING_NUMERIC_PREREQUISITE_EXAMPLE,
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

describe('level-2 staging regressions: numeric prerequisite and key-point overlap (providerCalls=0)', () => {
  const level2 = metadata[1];
  const prompt = stagingLevelPrompt(topicName, 'CM2', 'fr', level2, '');
  const validate = (mutate: (lesson: any) => void) => {
    const lesson = structuredClone(stagingFullLevelExample(level2)) as any;
    mutate(lesson);
    const normalized = normalizeGeneratedLesson(lesson, topicName, { preserveProviderSequence: true }).lesson;
    return validateStagingLevel(normalized, level2, topicName, 'CM2');
  };
  const allIssues = (v: ReturnType<typeof validateStagingLevel>) => [...v.canonicalIssues, ...v.pedagogicalIssues, ...v.geometryIssues];

  it('prompt states the numeric expected_answer rule and shows a numeric prerequisite', () => {
    expect(prompt).toContain(PREREQUISITE_ANSWER_RULE);
    expect(prompt).toContain(JSON.stringify(STAGING_NUMERIC_PREREQUISITE_EXAMPLE));
  });

  it('numeric prerequisite example passes validation with a digits-only answer', () => {
    expect(STAGING_NUMERIC_PREREQUISITE_EXAMPLE.expected_answer).toMatch(/^\d+(?:[.,]\d+)?$/);
    expect(allIssues(validate(() => {}))).toEqual([]);
  });

  it('still rejects a numeric prerequisite with no expected_answer', () => {
    const issues = allIssues(validate((lesson) => { lesson.prerequisites = [lesson.prerequisites[0], { ...STAGING_NUMERIC_PREREQUISITE_EXAMPLE, id: 'p2', expected_answer: undefined }]; }));
    expect(issues.some((i) => /prerequisites\[1\]\.expected_answer/.test(i.path))).toBe(true);
  });

  it('still rejects a numeric prerequisite with a word answer', () => {
    const issues = allIssues(validate((lesson) => { lesson.prerequisites = [lesson.prerequisites[0], { ...STAGING_NUMERIC_PREREQUISITE_EXAMPLE, id: 'p2', expected_answer: 'quatre' }]; }));
    expect(issues.some((i) => /prerequisites\[1\]\.expected_answer/.test(i.path))).toBe(true);
  });

  it('prompt states the short key-point rule', () => {
    expect(prompt).toContain(KEY_POINT_RULE);
  });

  it.each(Object.entries(STAGING_VISUAL_EXAMPLES))('the %s example key points stay short and do not repeat the content', (_kind, example) => {
    for (const point of (example as { key_points: Array<{ label: string; text: string }> }).key_points) expect(meaningfulTokens(`${point.label} ${point.text}`).size).toBeLessThanOrEqual(5);
    expect(semanticDuplicationDiagnostics(example as any)).toEqual([]);
  });

  it('still rejects the observed overlapping angle key point at sequence[1]', () => {
    const v = validate((lesson) => { lesson.sequence[1].key_points = [{ label: 'Sommet', text: 'Point de départ des deux demi-droites' }, { label: 'Mesure', text: 'En degrés' }]; });
    expect(v.pedagogicalIssues.some((i) => i.path === 'sequence[1].key_points' && i.message.includes('partagent trop de tokens'))).toBe(true);
  });
});
