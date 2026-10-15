import { describe, expect, it } from 'vitest';
import { geometryDraftLesson } from '../../../src/components/admin/learning/geometryDraft.ts';
import {
  assembleStagingLesson,
  parseStagingLevelResponse,
  requiredGeometryIssues,
  requiredGeometryKindsIssues,
  stagingLevelMetadata,
  stagingLevelPrompt,
  stagingSequenceContractIssues,
  stagingTokenUsage,
  stagingValidationFailure,
  validateStagingLevel,
} from './staging-level-workflow.ts';

const topicName = 'La géométrie plane — CM2';
const metadata = stagingLevelMetadata('topic-1', topicName, ['geometry']);
const lesson = geometryDraftLesson.levels[0].lesson as unknown as Record<string, unknown>;

const validLevel1 = structuredClone(lesson) as any;
validLevel1.sequence = [
  { ...validLevel1.sequence[0], id: 'rectangle-concept', type: 'concept', content: 'Un rectangle est un quadrilatère dont les quatre angles sont droits. Ses côtés opposés ont la même longueur.', key_points: [{ label: 'Angles', text: '4 angles droits' }, { label: 'Longueurs', text: 'Côtés opposés de même longueur' }], takeaway: 'Je vérifie les angles puis les côtés opposés.' },
  { ...validLevel1.sequence[1], id: 'triangle-concept', type: 'concept', content: 'Les segments AB, BC et CA ferment une figure à trois points.', key_points: [{ label: 'Repérage', text: 'Trois sommets nommés' }], takeaway: 'Je commence par relever les lettres.' },
  { id: 'guided-example', type: 'guided_example', content: 'On repère les sommets puis les côtés.', context: 'Décrire une figure plane.', steps: [{ instruction: 'Nommer les sommets.', reason: 'Chaque sommet porte une lettre.' }], visual: validLevel1.sequence[2].visual },
  { id: 'student-try', type: 'student_try', content: 'À toi de reconnaître la figure.', question: 'Combien de sommets possède un rectangle ?', answer_type: 'numeric', correct_answer: 4, success_feedback: 'Correct.', error_feedback: 'Compte les sommets.', visual: validLevel1.sequence[3].visual },
  { id: 'mastery-check', type: 'mastery_check', content: 'Vérifie ta maîtrise.', questions: [{ id: 'mastery-q1', question: 'Quel est le nombre de côtés d’un triangle ?', answer_type: 'numeric', correct_answer: 3, skill: 'figures_planes', difficulty: 1, success_feedback: 'Correct.', error_feedback: 'Un triangle a trois côtés.' }], visual: validLevel1.sequence[4].visual },
];

describe('staging level workflow', () => {
  it('assembles four independently valid level responses into one canonical lesson', () => {
    const levels = metadata.map((item) => ({ metadata: item, lesson: structuredClone(validLevel1) }));
    const assembled = assembleStagingLesson(topicName, levels);
    expect(assembled.version).toBe('2.1');
    expect((assembled.levels as unknown[]).map((level: any) => level.level_number)).toEqual([1, 2, 3, 4]);
    expect(requiredGeometryIssues(assembled)).toEqual([]);
  });

  it('rejects a truncated level response before validation or assembly', () => {
    expect(() => stagingTokenUsage({ finishReason: 'length', completionTokens: 3600 })).toThrow('finish_reason=length');
    expect(() => parseStagingLevelResponse('{"lesson_goal":"incomplete"')).toThrow('staging_level_json_parse_failed');
  });

  it('rejects a malformed level response', () => {
    expect(() => parseStagingLevelResponse('not json')).toThrow('staging_level_json_parse_failed');
  });

  it('rejects incomplete geometry in one level', () => {
    const incomplete = structuredClone(validLevel1) as any;
    incomplete.sequence[0].visual.data.vertices = [{ x: 1, y: 1 }];
    const result = validateStagingLevel(incomplete, metadata[0], topicName, 'CM2');
    expect(result.geometryIssues.some((issue) => issue.path.includes('vertices'))).toBe(true);
  });

  it('accepts valid prerequisite and misconception objects with the production field names', () => {
    const candidate = structuredClone(validLevel1) as any;
    candidate.prerequisites = [{ id: 'p1', description: 'Lire une longueur', check_question: 'Quel segment mesure 6 cm ?', answer_type: 'short_text', expected_answer: 'AB', remediation_hint: 'Observe les extrémités.' }];
    candidate.misconceptions = [{ id: 'm1', description: 'Confondre rayon et diamètre', detect_if: 'Le segment traverse le centre', feedback: 'Le diamètre traverse le centre.', remediation_strategy: 'Compare les deux segments.' }];
    const result = validateStagingLevel(candidate, metadata[0], topicName, 'CM2');
    expect(result.canonicalIssues).toEqual([]);
  });

  it('rejects string prerequisites and misconceptions', () => {
    const candidate = structuredClone(validLevel1) as any;
    candidate.prerequisites = ['Lire une longueur'];
    candidate.misconceptions = ['Confondre rayon et diamètre'];
    const result = validateStagingLevel(candidate, metadata[0], topicName, 'CM2');
    expect(result.canonicalIssues.map((issue) => issue.path)).toEqual(expect.arrayContaining([
      'levels[0].lesson.prerequisites[0]',
      'levels[0].lesson.misconceptions[0]',
    ]));
  });

  it('rejects missing required prerequisite and misconception object fields', () => {
    const candidate = structuredClone(validLevel1) as any;
    candidate.prerequisites = [{ id: 'p1' }];
    candidate.misconceptions = [{ id: 'm1' }];
    const result = validateStagingLevel(candidate, metadata[0], topicName, 'CM2');
    expect(result.canonicalIssues.map((issue) => issue.path)).toEqual(expect.arrayContaining([
      'levels[0].lesson.prerequisites[0].description',
      'levels[0].lesson.prerequisites[0].check_question',
      'levels[0].lesson.prerequisites[0].remediation_hint',
      'levels[0].lesson.misconceptions[0].description',
      'levels[0].lesson.misconceptions[0].detect_if',
      'levels[0].lesson.misconceptions[0].feedback',
      'levels[0].lesson.misconceptions[0].remediation_strategy',
    ]));
  });

  it('requires the real object fields in the compact prompt', () => {
    const prompt = stagingLevelPrompt(topicName, 'CM2', 'fr', metadata[0], 'geometry');
    expect(prompt).toContain('check_question');
    expect(prompt).toContain('remediation_hint');
    expect(prompt).toContain('detect_if');
    expect(prompt).toContain('remediation_strategy');
    expect(prompt).toContain('jamais des tableaux de chaînes');
    expect(prompt).toContain('Tous les cinq blocs');
    expect(prompt).toContain('Exemple complet des cinq blocs');
    expect(prompt).toContain('À toi: compte les sommets');
    expect(prompt).toContain('Vérifie ta compréhension');
  });

  it('accepts a valid level 1 with five typed provider blocks', () => {
    const result = validateStagingLevel(validLevel1, metadata[0], topicName, 'CM2');
    expect(result.canonicalIssues).toEqual([]);
    expect(result.pedagogicalIssues).toEqual([]);
    expect(result.geometryIssues).toEqual([]);
    expect(validLevel1.sequence.map((block: any) => block.type)).toEqual(['concept', 'concept', 'guided_example', 'student_try', 'mastery_check']);
  });

  it('accepts mastery.skills as the canonical non-empty string array', () => {
    const result = validateStagingLevel(validLevel1, metadata[0], topicName, 'CM2');
    expect(result.canonicalIssues).not.toEqual(expect.arrayContaining([expect.objectContaining({ path: 'levels[0].lesson.mastery.skills' })]));
    expect(validLevel1.mastery.skills).toEqual(['figures_planes']);
  });

  it.each([
    [{ id: 'skill-object' }],
    'figures_planes',
  ])('rejects malformed mastery.skills provider values: %j', (skills) => {
    const candidate = structuredClone(validLevel1) as any;
    candidate.mastery.skills = skills;
    const result = validateStagingLevel(candidate, metadata[0], topicName, 'CM2');
    expect(result.canonicalIssues).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: 'levels[0].lesson.mastery.skills', message: 'Expected 0–many non-empty strings' }),
    ]));
  });

  it('accepts concise distinct key_points and preserves their exact text', () => {
    const result = validateStagingLevel(validLevel1, metadata[0], topicName, 'CM2');
    expect(result.pedagogicalIssues).toEqual([]);
    expect(validLevel1.sequence[0].key_points).toEqual([
      { label: 'Angles', text: '4 angles droits' },
      { label: 'Longueurs', text: 'Côtés opposés de même longueur' },
    ]);
  });

  it('rejects copied or repetitive key_points without rewriting them', () => {
    const candidate = structuredClone(validLevel1) as any;
    candidate.sequence[0].key_points = [{ label: 'Résumé', text: 'Un rectangle est un quadrilatère dont les quatre angles sont droits' }];
    const result = validateStagingLevel(candidate, metadata[0], topicName, 'CM2');
    expect(result.pedagogicalIssues.some((issue) => issue.path === 'sequence[0].key_points' && issue.message.includes('partagent trop de tokens'))).toBe(true);
    expect(candidate.sequence[0].key_points[0].text).toContain('quadrilatère');
  });

  it.each([
    [2, 'guided_example'],
    [3, 'student_try'],
    [4, 'mastery_check'],
  ])('rejects missing content for sequence[%s] (%s)', (index, type) => {
    const candidate = structuredClone(validLevel1) as any;
    delete candidate.sequence[index].content;
    const issues = stagingSequenceContractIssues(candidate, metadata[0]);
    expect(issues).toContainEqual({ path: `sequence[${index}].content`, message: 'Required non-empty string' });
    expect(candidate.sequence[index].type).toBe(type);
  });

  it('rejects whitespace-only content with the exact validation path', () => {
    const candidate = structuredClone(validLevel1) as any;
    candidate.sequence[3].content = ' \n  ';
    expect(stagingSequenceContractIssues(candidate, metadata[0])).toContainEqual({
      path: 'sequence[3].content',
      message: 'Required non-empty string',
    });
  });

  it('preserves provider content and interactive metadata without alias mapping', () => {
    const raw = structuredClone(validLevel1) as any;
    raw.sequence[2].content = 'Exemple travaillé conservé tel quel.';
    raw.sequence[3].content = 'Agis sur la figure puis réponds.';
    raw.sequence[4].content = 'Contrôle final de compréhension.';
    raw.sequence[3].question = 'Combien de sommets ?';
    raw.sequence[4].questions[0].question = 'Combien de côtés ?';
    const parsed = parseStagingLevelResponse(JSON.stringify(raw), metadata[0]).value as any;
    expect(parsed.sequence[2].content).toBe('Exemple travaillé conservé tel quel.');
    expect(parsed.sequence[3]).toMatchObject({ content: 'Agis sur la figure puis réponds.', question: 'Combien de sommets ?' });
    expect(parsed.sequence[4]).toMatchObject({ content: 'Contrôle final de compréhension.' });
    expect(parsed.sequence[4].questions[0].question).toBe('Combien de côtés ?');
  });

  it('rejects missing provider-owned block ids and types', () => {
    const missingId = structuredClone(validLevel1) as any;
    delete missingId.sequence[0].id;
    expect(stagingSequenceContractIssues(missingId, metadata[0]).map((issue) => issue.path)).toContain('sequence[0].id');
    const missingType = structuredClone(validLevel1) as any;
    delete missingType.sequence[1].type;
    expect(stagingSequenceContractIssues(missingType, metadata[0]).map((issue) => issue.path)).toContain('sequence[1].type');
  });

  it('rejects missing rectangle and triangle visuals', () => {
    const noRectangle = structuredClone(validLevel1) as any;
    delete noRectangle.sequence[0].visual;
    expect(requiredGeometryKindsIssues(noRectangle, ['rectangle'])).not.toEqual([]);
    const noTriangle = structuredClone(validLevel1) as any;
    delete noTriangle.sequence[1].visual;
    expect(requiredGeometryKindsIssues(noTriangle, ['triangle'])).not.toEqual([]);
  });

  it('rejects interaction after mastery', () => {
    const candidate = structuredClone(validLevel1) as any;
    [candidate.sequence[3], candidate.sequence[4]] = [candidate.sequence[4], candidate.sequence[3]];
    expect(stagingSequenceContractIssues(candidate, metadata[0]).some((issue) => issue.message.includes('interaction before mastery'))).toBe(true);
  });

  it('reports level-one validation failure with one provider call and no save signal', () => {
    const failure = stagingValidationFailure(1, [{ path: 'levels[0].lesson.prerequisites[0]', message: 'Expected object' }], 1);
    expect(failure).toEqual({
      code: 'staging_level_validation_failed',
      level: 1,
      stage: 'level_validation',
      technicalDetail: 'levels[0].lesson.prerequisites[0]: Expected object',
      providerCalls: 1,
    });
    expect(failure.providerCalls).toBe(1);
  });

  it('does not expose a partial-save operation', () => {
    expect(assembleStagingLesson).not.toHaveProperty('save');
    expect(() => assembleStagingLesson(topicName, metadata.slice(0, 3).map((item) => ({ metadata: item, lesson })))).toThrow('expected 4 levels');
  });

  it('keeps provider-free orchestration at one response per level with no retry helper', () => {
    const prompts = metadata.map((item) => item.level_number);
    expect(prompts).toEqual([1, 2, 3, 4]);
    expect(metadata).toHaveLength(4);
  });
});
