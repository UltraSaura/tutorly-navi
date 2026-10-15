import { describe, expect, it } from 'vitest';
import { geometryVisualDataErrors } from './geometry-visual-contract.ts';
import { normalizeGeneratedLesson } from './lesson-normalization.ts';
import { meaningfulTokens, semanticDuplicationDiagnostics } from './pedagogical-quality.ts';
import { TAKEAWAY_RULE, CONCEPT_LENGTH_RULE, STAGING_VISUAL_EXAMPLES as SVE } from './staging-level-workflow.ts';
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
    for (const point of (example as unknown as { key_points: Array<{ label: string; text: string }> }).key_points) expect(meaningfulTokens(`${point.label} ${point.text}`).size).toBeLessThanOrEqual(5);
    expect(semanticDuplicationDiagnostics(example as any)).toEqual([]);
  });

  it('still rejects the observed overlapping angle key point at sequence[1]', () => {
    const v = validate((lesson) => { lesson.sequence[1].key_points = [{ label: 'Sommet', text: 'Point de départ des deux demi-droites' }, { label: 'Mesure', text: 'En degrés' }]; });
    expect(v.pedagogicalIssues.some((i) => i.path === 'sequence[1].key_points' && i.message.includes('partagent trop de tokens'))).toBe(true);
  });
});

describe('staging takeaway rule', () => {
  it('quotes the failing staging takeaway as forbidden', () => {
    expect(TAKEAWAY_RULE).toContain('interdit');
    expect(TAKEAWAY_RULE).toContain('trois sommets');
  });
  it('rejects the exact takeaway that failed on staging', () => {
    const block = { id: 'c', type: 'concept', title: 'Triangle', content: 'Un triangle est un polygone qui possède trois sommets et trois côtés. On les nomme et on les note. La somme des angles est égale à 180 degrés.', key_points: [{ label: 'Côtés', text: 'AB, BC et CA' }], takeaway: 'Pour reconnaître un triangle, je compte ses trois sommets et ses trois côtés.' };
    const diags = semanticDuplicationDiagnostics(block);
    expect(JSON.stringify(diags)).toContain('takeaway');
  });
});

describe('staging concept length rule', () => {
  it('states a limit below the 55-word validator ceiling', () => {
    expect(CONCEPT_LENGTH_RULE).toContain('40 mots');
  });
  it.each(Object.entries(SVE))('%s example content stays within 40 words', (_k, ex) => {
    expect(String((ex as unknown as { content: string }).content).split(/\s+/).length).toBeLessThanOrEqual(40);
  });
});

describe('takeaway distinctness (staging level 3 regression, providerCalls=0)', () => {
  const failedSymmetryBlock = {
    type: 'concept',
    content: 'Pour vérifier une symétrie, je compte les carreaux entre un point et l’axe, puis je reporte la même distance de l’autre côté.',
    key_points: [{ label: 'Axe', text: 'Droite verticale' }],
    takeaway: 'Je compte les carreaux jusqu’à l’axe puis je reporte de l’autre côté.',
  };

  it('still rejects the exact takeaway that failed on staging (validator unchanged)', () => {
    const diags = semanticDuplicationDiagnostics(failedSymmetryBlock);
    expect(diags.some((d) => d.fieldB === 'takeaway' && d.diagnostic.overlap === 6)).toBe(true);
  });

  it.each(Object.entries(SVE))('the %s example takeaway shares at most one significant word with content and key_points', (_k, example) => {
    const ex = example as unknown as { content: string; takeaway: string; key_points: Array<{ label: string; text: string }> };
    const take = meaningfulTokens(ex.takeaway);
    const others = meaningfulTokens(`${ex.content} ${ex.key_points.map((p) => `${p.label} ${p.text}`).join(' ')}`);
    expect([...take].filter((t) => others.has(t)).length).toBeLessThanOrEqual(1);
    expect(semanticDuplicationDiagnostics(ex as unknown as Record<string, unknown>)).toEqual([]);
  });

  it.each(Object.entries(SVE))('the %s example takeaway stays valid even if copied next to the content the AI actually wrote', (_k, example) => {
    const ex = example as unknown as { takeaway: string };
    expect(semanticDuplicationDiagnostics({ ...failedSymmetryBlock, takeaway: ex.takeaway })).toEqual([]);
    expect(semanticDuplicationDiagnostics({ type: 'concept', content: 'Un triangle est un polygone qui possède trois sommets et trois côtés. On nomme et on note ses sommets; la somme de ses angles est égale à 180 degrés.', key_points: [{ label: 'Côtés', text: 'AB, BC, CA' }], takeaway: ex.takeaway })).toEqual([]);
  });

  it('the takeaway rule quotes the failed staging takeaway and forbids copying examples', () => {
    expect(TAKEAWAY_RULE).toContain('Je compte les carreaux jusqu’à l’axe');
    expect(TAKEAWAY_RULE).toContain('Ne recopie jamais');
  });
});
