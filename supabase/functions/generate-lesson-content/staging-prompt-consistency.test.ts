import { describe, expect, it } from 'vitest';
import { geometryVisualDataErrors } from './geometry-visual-contract.ts';
import { normalizeGeneratedLesson } from './lesson-normalization.ts';
import { meaningfulTokens, semanticDuplicationDiagnostics } from './pedagogical-quality.ts';
import { TAKEAWAY_RULE, CONCEPT_LENGTH_RULE, STAGING_VISUAL_EXAMPLES as SVE } from './staging-level-workflow.ts';
import {
  KEY_POINT_RULE,
  PREREQUISITE_ANSWER_RULE,
  STAGING_NUMERIC_PREREQUISITE_EXAMPLE,
  STAGING_CHOICE_PREREQUISITE_EXAMPLE,
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
    expect(prompt).toContain('exactement UN objet JSON de premier niveau');
    expect(prompt).toContain('pas de ```json');
    expect(prompt).toContain('aucun second objet JSON');
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
    expect(String(STAGING_NUMERIC_PREREQUISITE_EXAMPLE.expected_answer)).toMatch(/^\d+(?:[.,]\d+)?$/);
    expect(STAGING_NUMERIC_PREREQUISITE_EXAMPLE.type).toBe('numeric');
    expect(STAGING_NUMERIC_PREREQUISITE_EXAMPLE.prompt).toBeTruthy();
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

  it('levels 2-4 prompts show a multiple-choice prerequisite whose expected_answer is a choice', () => {
    for (const level of metadata.slice(1)) {
      expect(stagingLevelPrompt(topicName, 'CM2', 'fr', level, '')).toContain(JSON.stringify(STAGING_CHOICE_PREREQUISITE_EXAMPLE));
    }
    expect(STAGING_CHOICE_PREREQUISITE_EXAMPLE.choices).toContain(STAGING_CHOICE_PREREQUISITE_EXAMPLE.expected_answer);
    expect(PREREQUISITE_ANSWER_RULE).toMatch(/COPIE EXACTE/);
    expect(PREREQUISITE_ANSWER_RULE).toMatch(/correct_answer/);
  });

  it('staging 01a14515: choice prerequisite using correct_answer instead of expected_answer is still rejected', () => {
    const { expected_answer: _omit, ...rest } = STAGING_CHOICE_PREREQUISITE_EXAMPLE;
    const issues = allIssues(validate((lesson) => { lesson.prerequisites = [lesson.prerequisites[0], { ...rest, correct_answer: 'Un axe de symétrie' }]; }));
    expect(issues.some((i) => /prerequisites\[1\]\.expected_answer/.test(i.path))).toBe(true);
  });

  it('still rejects a choice prerequisite whose expected_answer is not one of the choices', () => {
    const issues = allIssues(validate((lesson) => { lesson.prerequisites = [lesson.prerequisites[0], { ...STAGING_CHOICE_PREREQUISITE_EXAMPLE, expected_answer: 'A' }]; }));
    expect(issues.some((i) => /prerequisites\[1\]\.expected_answer/.test(i.path))).toBe(true);
  });

  it('prompt states the short key-point rule', () => {
    expect(prompt).toContain(KEY_POINT_RULE);
  });

  it.each(Object.entries(STAGING_VISUAL_EXAMPLES))('the %s example key points stay short and do not repeat the content', (_kind, example) => {
    for (const point of (example as unknown as { key_points: Array<{ label: string; text: string }> }).key_points) {
      expect(meaningfulTokens(`${point.label} ${point.text}`).size).toBeLessThanOrEqual(5);
      expect(point.text.trim().split(/\s+/).length).toBeGreaterThanOrEqual(4);
    }
    expect(semanticDuplicationDiagnostics(example as any)).toEqual([]);
  });

  it('does not reject an angle key point solely for shared subject vocabulary at sequence[1]', () => {
    const v = validate((lesson) => { lesson.sequence[1].key_points = [{ label: 'Sommet', text: 'Point de départ des deux demi-droites' }, { label: 'Mesure', text: 'En degrés' }]; });
    expect(v.pedagogicalIssues.filter((i) => i.path === 'sequence[1].key_points')).toEqual([]);
  });
});

describe('staging takeaway rule', () => {
  it('states the distinct practical-action takeaway role', () => {
    expect(TAKEAWAY_RULE).toContain('action');
    expect(TAKEAWAY_RULE).toContain('8 mots');
    expect(TAKEAWAY_RULE).toContain('ne reformule');
    expect(TAKEAWAY_RULE).toContain('RÈGLE ZÉRO');
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

  it.each(Object.entries(SVE))('the %s example takeaway passes semantic-overlap validation', (_k, example) => {
    const ex = example as unknown as { content: string; takeaway: string; key_points: Array<{ label: string; text: string }> };
    expect(semanticDuplicationDiagnostics(ex as unknown as Record<string, unknown>)).toEqual([]);
  });

  it.each(Object.entries(SVE))('the %s example remains unchanged by validation', (_k, example) => {
    expect(semanticDuplicationDiagnostics(example as unknown as Record<string, unknown>)).toEqual([]);
  });

  it('still rejects the short procedural takeaway that failed on staging level 3 (overlap=2)', () => {
    const diags = semanticDuplicationDiagnostics({
      type: 'concept',
      content: 'Pour vérifier une figure symétrique, je compte les carreaux entre un point et l’axe, puis je reporte la même distance de l’autre côté.',
      key_points: [{ label: 'Axe', text: 'Droite verticale' }],
      takeaway: 'Astuce : je compte et je reporte.',
    });
    expect(diags.some((d) => d.fieldB === 'takeaway' && d.diagnostic.overlap === 2)).toBe(true);
  });

  it('the takeaway rule preserves the practical-action contract', () => {
    expect(TAKEAWAY_RULE).toContain('action');
    expect(TAKEAWAY_RULE).toContain('8 mots');
    expect(TAKEAWAY_RULE).toContain('ne reformule');
    expect(TAKEAWAY_RULE).toContain('RÈGLE ZÉRO');
  });
});

describe('staging 01a14518: folding takeaway regression (providerCalls=0)', () => {
  const failed = {
    type: 'concept',
    content: 'Pour vérifier, je plie mentalement le long de l’axe : les deux parties se superposent, la figure est symétrique.',
    key_points: [{ label: 'Axe', text: 'Ligne de pliage' }],
    takeaway: 'Si je plie la figure le long de l’axe, les bords coïncident : elle est symétrique.',
  };
  it('the exact failed takeaway is still rejected (validator unchanged)', () => {
    expect(semanticDuplicationDiagnostics(failed).some((d) => d.fieldB === 'takeaway' && d.diagnostic.overlap === 4)).toBe(true);
  });
  it('the rule quotes the failed takeaway as forbidden', () => {
    expect(TAKEAWAY_RULE).toContain('Si je plie la figure le long de l’axe, les bords coïncident');
  });
  it.each(Object.entries(SVE))('the %s example takeaway reuses no important word from content, title or key points', (_k, ex) => {
    const e = ex as unknown as { title: string; content: string; takeaway: string; key_points: Array<{ label: string; text: string }> };
    const source = meaningfulTokens([e.title, e.content, ...e.key_points.map((p) => `${p.label} ${p.text}`)].join(' '));
    const reused = [...meaningfulTokens(e.takeaway)].filter((t) => source.has(t));
    expect(reused).toEqual([]);
  });
  it.each(Object.entries(SVE))('the %s example takeaway still passes next to the failed symmetry explanation', (_k, ex) => {
    const takeaway = (ex as unknown as { takeaway: string }).takeaway;
    expect(semanticDuplicationDiagnostics({ ...failed, takeaway }).filter((d) => d.fieldB === 'takeaway')).toEqual([]);
  });
});

describe('recognition prerequisites use a choice type', () => {
  it('rule forbids numeric/time for recognition prompts and its example passes the check', async () => {
    const { PREREQUISITE_ANSWER_RULE: rule } = await import('./staging-level-workflow');
    expect(rule).toMatch(/JAMAIS "numeric" ni "time"/);
    const { validateLessonV21: v } = await import('./lesson-v21-contract');
    const issuesFor = (prereq: Record<string, unknown>) => {
      const r = v({ levels: [{ lesson: { prerequisites: [prereq] } }] } as never) as { success: boolean; issues?: Array<{ path: string; message: string }> };
      return (r.issues ?? []).filter((i) => i.message.startsWith('Identification question'));
    };
    expect(issuesFor({ id: 'p', description: 'd', type: 'multiple_choice', prompt: 'Quelle forme a trois côtés ?', choices: ['Le triangle', 'Le carré', 'Le cercle'], expected_answer: 'Le triangle', remediation_hint: 'h' })).toEqual([]);
    // The check is unchanged: a numeric recognition question is still rejected.
    expect(issuesFor({ id: 'p', description: 'd', type: 'numeric', prompt: 'Comment reconnaître un triangle : combien de sommets ?', expected_answer: 3, remediation_hint: 'h' }).length).toBeGreaterThan(0);
  });
});
