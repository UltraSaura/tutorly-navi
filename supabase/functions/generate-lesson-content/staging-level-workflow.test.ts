import { describe, expect, it } from 'vitest';
import { geometryDraftLesson } from '../../../src/components/admin/learning/geometryDraft.ts';
import { PEDAGOGICAL_CONCEPT_MAX_WORDS, PEDAGOGICAL_TAKEAWAY_MAX_WORDS } from './pedagogical-quality.ts';
import { ANSWER_TYPE_VALUES } from './lesson-v21-contract.ts';
import {
  assembleStagingLesson,
  isGeometryTopic,
  parseStagingLevelResponse,
  requiredGeometryIssues,
  requiredGeometryKindsIssues,
  stagingLevelMetadata,
  stagingTopicKind,
  stagingLevelPrompt,
  stagingPromptVisualKinds,
  stagingFullLevelExample,
  STAGING_PROMPT_VERSION,
  STAGING_VISUAL_EXAMPLES,
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
  { ...validLevel1.sequence[0], ...structuredClone(STAGING_VISUAL_EXAMPLES.rectangle) },
  { ...validLevel1.sequence[1], ...structuredClone(STAGING_VISUAL_EXAMPLES.triangle) },
  { id: 'guided-example', type: 'guided_example', content: 'On repère les sommets puis les côtés.', context: 'Décrire une figure plane.', steps: [{ instruction: 'Nommer les sommets.', reason: 'Chaque sommet porte une lettre.' }], visual: validLevel1.sequence[2].visual },
  { id: 'student-try', type: 'student_try', content: 'À toi de reconnaître la figure.', question: 'Combien de sommets possède un rectangle ?', answer_type: 'numeric', correct_answer: 4, success_feedback: 'Correct.', error_feedback: 'Compte les sommets.', visual: validLevel1.sequence[3].visual },
  { id: 'mastery-check', type: 'mastery_check', content: 'Vérifie ta maîtrise.', questions: [{ id: 'mastery-q1', question: 'Quel est le nombre de côtés d’un triangle ?', answer_type: 'numeric', correct_answer: 3, skill: 'figures_planes', difficulty: 1, success_feedback: 'Correct.', error_feedback: 'Un triangle a trois côtés.' }], visual: validLevel1.sequence[4].visual },
];

const maxLengthConcept = (base: string) => {
  const words = base.trim().split(/\s+/);
  return [...words, ...Array.from({ length: Math.max(0, PEDAGOGICAL_CONCEPT_MAX_WORDS - words.length) }, (_, index) => `repère${index}`)].join(' ');
};

const overlongTakeaway = Array.from({ length: PEDAGOGICAL_TAKEAWAY_MAX_WORDS + 1 }, (_, index) => `action${index}`).join(' ');

const validNumericPrerequisite = {
  id: 'p-angle-droit',
  description: 'Connaître la mesure d’un angle droit',
  type: 'numeric',
  prompt: 'Combien de degrés mesure un angle droit ?',
  expected_answer: 90,
  remediation_hint: 'Un angle droit correspond à un quart de tour.',
};

const level2Candidate = () => {
  const candidate = structuredClone(validLevel1) as any;
  candidate.prerequisites = [structuredClone(validNumericPrerequisite)];
  candidate.sequence[0] = { ...candidate.sequence[0], ...structuredClone(STAGING_VISUAL_EXAMPLES.circle), id: 'circle-concept' };
  candidate.sequence[1] = { ...candidate.sequence[1], ...structuredClone(STAGING_VISUAL_EXAMPLES.angle), id: 'angle-concept' };
  return candidate;
};

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

  it('accepts valid prerequisite and misconception objects with the staging field names', () => {
    const candidate = structuredClone(validLevel1) as any;
    candidate.prerequisites = [{ id: 'p1', description: 'Lire une longueur', type: 'short_text', prompt: 'Quel segment mesure 6 cm ?', expected_answer: 'AB', remediation_hint: 'Observe les extrémités.' }];
    candidate.misconceptions = [{ id: 'm1', description: 'Confondre rayon et diamètre', detect_if: 'Le segment traverse le centre', feedback: 'Le diamètre traverse le centre.', remediation_strategy: 'Compare les deux segments.' }];
    const result = validateStagingLevel(candidate, metadata[0], topicName, 'CM2');
    expect(result.canonicalIssues).toEqual([]);
  });

  it('accepts the exact numeric staging prerequisite shape and answer', () => {
    const result = validateStagingLevel(level2Candidate(), metadata[1], topicName, 'CM2');
    expect(result.canonicalIssues).toEqual([]);
    expect(result.pedagogicalIssues).toEqual([]);
    expect(result.geometryIssues).toEqual([]);
  });

  it('keeps modern prerequisite fields intact before canonical validation', () => {
    const parsed = parseStagingLevelResponse(JSON.stringify({ ...validLevel1, prerequisites: [validNumericPrerequisite] }));
    expect(parsed.value.prerequisites).toEqual([expect.objectContaining({ id: validNumericPrerequisite.id, type: 'numeric', prompt: validNumericPrerequisite.prompt, expected_answer: 90 })]);
    expect(() => parseStagingLevelResponse(JSON.stringify({ ...validLevel1, prerequisites: [{ id: 'legacy', description: 'Ancien', check_question: 'Combien ?', answer_type: 'numeric', expected_answer: 12, remediation_hint: 'Recommence.' }] }), metadata[1])).toThrow(/Legacy prerequisite format rejected/);
  });

  it('accepts four Aires-like prompt examples with four modern prerequisite objects', () => {
    metadata.forEach((item, index) => {
      const example = stagingFullLevelExample(item) as any;
      example.prerequisites = [
        { ...structuredClone(validNumericPrerequisite), id: `aires-p-${index + 1}` },
        { id: `aires-p-choice-${index + 1}`, description: 'Choisir la propriété utile', type: 'multiple_choice', prompt: 'Quelle propriété aide ici ?', choices: ['La propriété utile', 'Une réponse hors sujet'], expected_answer: 'La propriété utile', remediation_hint: 'Relis la propriété.' },
        { id: `aires-p-text-${index + 1}`, description: 'Nommer la mesure', type: 'short_text', prompt: 'Quelle mesure dois-tu relever ?', expected_answer: 'La mesure demandée', remediation_hint: 'Observe les données.' },
        { id: `aires-p-time-${index + 1}`, description: 'Lire une durée', type: 'time', prompt: 'Quelle heure est indiquée ?', expected_answer: '8 h', remediation_hint: 'Lis les aiguilles.' },
      ];
      const issues = stagingSequenceContractIssues(example, item);
      expect(issues.filter((issue) => issue.path.startsWith('prerequisites'))).toEqual([]);
    });
  });

  it('rejects a numeric prerequisite without expected_answer', () => {
    const candidate = level2Candidate();
    delete candidate.prerequisites[0].expected_answer;
    const result = validateStagingLevel(candidate, metadata[1], topicName, 'CM2');
    expect(result.canonicalIssues).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: 'prerequisites[0].expected_answer', message: 'Required value' }),
      expect.objectContaining({ path: 'prerequisites[0].expected_answer', message: 'Numeric prerequisite requires a numeric expected answer' }),
    ]));
    expect(result.pedagogicalIssues).toEqual([]);
  });

  it('rejects a numeric prerequisite with a non-numeric expected_answer', () => {
    const candidate = level2Candidate();
    candidate.prerequisites[0].expected_answer = 'ninety';
    const result = validateStagingLevel(candidate, metadata[1], topicName, 'CM2');
    expect(result.canonicalIssues).toContainEqual(expect.objectContaining({
      path: 'prerequisites[0].expected_answer',
      message: 'Numeric prerequisite requires a numeric expected answer',
    }));
    expect(stagingSequenceContractIssues(candidate, metadata[1])).toContainEqual({
      path: 'prerequisites[0].expected_answer',
      message: 'Numeric prerequisite requires a numeric expected answer',
    });
  });

  it('rejects a legacy numeric prerequisite without renaming its fields', () => {
    const candidate = level2Candidate();
    candidate.prerequisites[0] = { id: 'p-angle', description: 'Mesurer un angle droit', check_question: 'Combien de degrés ?', answer_type: 'numeric', expected_answer: 90, remediation_hint: 'Un quart de tour.' };
    const result = validateStagingLevel(candidate, metadata[1], topicName, 'CM2');
    expect(stagingSequenceContractIssues(candidate, metadata[1])).toContainEqual(expect.objectContaining({
      path: 'prerequisites[0]',
      message: expect.stringContaining('Legacy prerequisite format rejected'),
    }));
    expect(result.canonicalIssues).toContainEqual(expect.objectContaining({
      path: 'prerequisites[0]',
      message: expect.stringContaining('Legacy prerequisite format rejected'),
    }));
  });

  it('reproduces the exact version-162 level-2 failure without retry or database write', () => {
    const candidate = level2Candidate();
    candidate.prerequisites.push({ ...structuredClone(validNumericPrerequisite), id: 'p-angle', expected_answer: undefined });
    candidate.sequence[1].key_points = [{ label: 'Résumé', text: 'Un angle est formé par deux demi-droites qui partent du même sommet O et se mesure en degrés.' }, { label: 'Rappel', text: 'Deux demi-droites' }];
    const result = validateStagingLevel(candidate, metadata[1], topicName, 'CM2');
    expect(result.canonicalIssues).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: 'prerequisites[1].expected_answer', message: 'Required value' }),
      expect.objectContaining({ path: 'prerequisites[1].expected_answer', message: 'Numeric prerequisite requires a numeric expected answer' }),
    ]));
    expect(result.pedagogicalIssues).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: 'sequence[1].key_points', message: expect.stringContaining('partagent trop de tokens') }),
    ]));
    expect(candidate.prerequisites[1].expected_answer).toBeUndefined();
    expect(candidate.sequence[1].key_points[0].text).toContain('deux demi-droites');
  });

  it('accepts level-2 key_points as concise facts distinct from explanation and takeaway', () => {
    const result = validateStagingLevel(level2Candidate(), metadata[1], topicName, 'CM2');
    expect(result.pedagogicalIssues).toEqual([]);
  });

  it('rejects string prerequisites and misconceptions', () => {
    const candidate = structuredClone(validLevel1) as any;
    candidate.prerequisites = ['Lire une longueur'];
    candidate.misconceptions = ['Confondre rayon et diamètre'];
    const result = validateStagingLevel(candidate, metadata[0], topicName, 'CM2');
    expect(result.canonicalIssues.map((issue) => issue.path)).toEqual(expect.arrayContaining([
      'prerequisites[0]',
      'misconceptions[0]',
    ]));
  });

  it('rejects missing required prerequisite and misconception object fields', () => {
    const candidate = structuredClone(validLevel1) as any;
    candidate.prerequisites = [{ id: 'p1' }];
    candidate.misconceptions = [{ id: 'm1' }];
    const result = validateStagingLevel(candidate, metadata[0], topicName, 'CM2');
    expect(result.canonicalIssues.map((issue) => issue.path)).toEqual(expect.arrayContaining([
      'prerequisites[0].description',
      'prerequisites[0].prompt',
      'prerequisites[0].remediation_hint',
      'misconceptions[0].description',
      'misconceptions[0].detect_if',
      'misconceptions[0].feedback',
      'misconceptions[0].remediation_strategy',
    ]));
  });

  it('requires the real object fields in the compact prompt', () => {
    const prompt = stagingLevelPrompt(topicName, 'CM2', 'fr', metadata[0], 'geometry');
    expect(prompt).toContain(STAGING_PROMPT_VERSION);
    expect(prompt).not.toContain('check_question');
    expect(prompt).toContain('type":"numeric"');
    expect(prompt).toContain('expected_answer":90');
    expect(prompt).toContain('remediation_hint');
    expect(prompt).toContain('detect_if');
    expect(prompt).toContain('remediation_strategy');
    expect(prompt).toContain('jamais des tableaux de chaînes');
    expect(prompt).toContain('Tous les cinq blocs');
    expect(prompt).toContain('2 ou 3 rappels factuels courts');
    expect(prompt).toContain('Le takeaway ne doit jamais reformuler');
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
    expect(result.canonicalIssues).not.toEqual(expect.arrayContaining([expect.objectContaining({ path: 'mastery.skills' })]));
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
      expect.objectContaining({ path: 'mastery.skills', message: 'Expected 0–many non-empty strings' }),
    ]));
  });

  it('accepts concise distinct key_points and preserves their exact text', () => {
    const result = validateStagingLevel(validLevel1, metadata[0], topicName, 'CM2');
    expect(result.pedagogicalIssues).toEqual([]);
    expect(validLevel1.sequence[0].key_points).toEqual([
      { label: 'Forme', text: 'La figure possède quatre côtés.' },
      { label: 'Angles', text: 'Chaque coin forme un angle droit.' },
    ]);
  });

  it('accepts a structured concept at the pedagogical maximum of 55 words', () => {
    const candidate = structuredClone(validLevel1) as any;
    candidate.sequence[0].content = maxLengthConcept(STAGING_VISUAL_EXAMPLES.rectangle.content as string);
    expect(candidate.sequence[0].content.trim().split(/\s+/)).toHaveLength(PEDAGOGICAL_CONCEPT_MAX_WORDS);
    const result = validateStagingLevel(candidate, metadata[0], topicName, 'CM2');
    expect(result.pedagogicalIssues).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ path: 'sequence[0].content', message: expect.stringContaining('Concept structuré trop long') }),
    ]));
  });

  it('rejects a structured concept above the exact 55-word limit', () => {
    const candidate = structuredClone(validLevel1) as any;
    candidate.sequence[0].content = `${maxLengthConcept(STAGING_VISUAL_EXAMPLES.rectangle.content as string)} supplémentaire`;
    const result = validateStagingLevel(candidate, metadata[0], topicName, 'CM2');
    expect(result.pedagogicalIssues).toContainEqual(expect.objectContaining({ path: 'sequence[0].content', message: 'Concept structuré trop long (56 mots); garder une introduction de 1 à 3 phrases.' }));
    expect(stagingSequenceContractIssues(candidate, metadata[0])).toContainEqual({ path: 'sequence[0].content', message: 'Expected at most 55 words for a structured concept' });
  });

  it('accepts a concise actionable takeaway within the exact 24-word limit', () => {
    const candidate = structuredClone(validLevel1) as any;
    candidate.sequence[0].takeaway = 'Pour vérifier une figure, contrôle les angles, puis compare les côtés opposés avant de conclure.';
    expect(candidate.sequence[0].takeaway.trim().split(/\s+/).length).toBeLessThanOrEqual(PEDAGOGICAL_TAKEAWAY_MAX_WORDS);
    const result = validateStagingLevel(candidate, metadata[0], topicName, 'CM2');
    expect(result.pedagogicalIssues).not.toContainEqual(expect.objectContaining({ path: 'sequence[0].takeaway', message: 'Le takeaway doit rester concis.' }));
  });

  it('rejects an overlong takeaway above the exact 24-word limit', () => {
    const candidate = structuredClone(validLevel1) as any;
    candidate.sequence[0].takeaway = overlongTakeaway;
    const result = validateStagingLevel(candidate, metadata[0], topicName, 'CM2');
    expect(result.pedagogicalIssues).toContainEqual({ path: 'sequence[0].takeaway', message: 'Le takeaway doit rester concis.' });
    expect(stagingSequenceContractIssues(candidate, metadata[0])).toContainEqual({ path: 'sequence[0].takeaway', message: 'Expected at most 24 words' });
  });

  it('reports every path from the exact observed version-160 invalid response', () => {
    const candidate = structuredClone(validLevel1) as any;
    candidate.sequence[0].takeaway = overlongTakeaway;
    candidate.sequence[1].content = `${maxLengthConcept(STAGING_VISUAL_EXAMPLES.triangle.content as string)} ${Array.from({ length: 18 }, (_, index) => `mot${index}`).join(' ')}`;
    candidate.sequence[1].takeaway = overlongTakeaway;
    const result = validateStagingLevel(candidate, metadata[0], topicName, 'CM2');
    expect(result.pedagogicalIssues).toEqual(expect.arrayContaining([
      { path: 'sequence[0].takeaway', message: 'Le takeaway doit rester concis.' },
      { path: 'sequence[1].content', message: 'Concept structuré trop long (73 mots); garder une introduction de 1 à 3 phrases.' },
      { path: 'sequence[1].takeaway', message: 'Le takeaway doit rester concis.' },
    ]));
  });

  it('accepts the distinct rectangle and triangle content, reminders, and actions', () => {
    const result = validateStagingLevel(validLevel1, metadata[0], topicName, 'CM2');
    expect(result).toEqual({ canonicalIssues: [], pedagogicalIssues: [], geometryIssues: [] });
    expect(validLevel1.sequence[0]).toMatchObject(STAGING_VISUAL_EXAMPLES.rectangle);
    expect(validLevel1.sequence[1]).toMatchObject(STAGING_VISUAL_EXAMPLES.triangle);
  });

  it.each(ANSWER_TYPE_VALUES)('accepts allowed answer_type %s in every interactive question', (answerType) => {
    const candidate = structuredClone(validLevel1) as any;
    candidate.sequence[3].answer_type = answerType;
    candidate.sequence[4].questions[0].answer_type = answerType;
    const result = validateStagingLevel(candidate, metadata[0], topicName, 'CM2');
    expect(result.canonicalIssues).not.toEqual(expect.arrayContaining([expect.objectContaining({ path: 'sequence[3].answer_type' })]));
    expect(result.canonicalIssues).not.toEqual(expect.arrayContaining([expect.objectContaining({ path: 'sequence[4].questions[0].answer_type' })]));
  });

  it.each(['boolean', 'freeform', 'multipleChoice', 'unknown'])('reports unsupported answer_type %s with its received value', (answerType) => {
    const candidate = structuredClone(validLevel1) as any;
    candidate.sequence[3].answer_type = answerType;
    const result = validateStagingLevel(candidate, metadata[0], topicName, 'CM2');
    expect(result.canonicalIssues).toContainEqual({
      path: 'sequence[3].answer_type',
      message: `Unsupported answer type "${answerType}". Allowed values: ${ANSWER_TYPE_VALUES.join(', ')}`,
    });
  });

  it('accepts complete symmetry concepts with distinct pedagogical roles', () => {
    const candidate = structuredClone(validLevel1) as any;
    candidate.sequence[0] = { ...candidate.sequence[0], ...structuredClone(STAGING_VISUAL_EXAMPLES.symmetry), id: 'symmetry-concept-1' };
    candidate.sequence[1] = { ...candidate.sequence[1], ...structuredClone(STAGING_VISUAL_EXAMPLES.symmetry), id: 'symmetry-concept-2' };
    const result = validateStagingLevel(candidate, metadata[2], topicName, 'CM2');
    expect(result.canonicalIssues).toEqual([]);
    expect(result.pedagogicalIssues).toEqual([]);
    expect(result.geometryIssues).toEqual([]);
  });

  it('rejects repeated symmetry fields with exact local paths', () => {
    const candidate = structuredClone(validLevel1) as any;
    candidate.sequence[0] = { ...candidate.sequence[0], ...structuredClone(STAGING_VISUAL_EXAMPLES.symmetry), id: 'symmetry-concept-1' };
    candidate.sequence[1] = { ...candidate.sequence[1], ...structuredClone(STAGING_VISUAL_EXAMPLES.symmetry), id: 'symmetry-concept-2' };
    candidate.sequence[0].key_points = [{ label: 'Résumé', text: candidate.sequence[0].content }, { label: 'Rappel', text: 'Même distance' }];
    candidate.sequence[0].takeaway = candidate.sequence[0].content;
    candidate.sequence[1].key_points = [{ label: 'Résumé', text: candidate.sequence[1].content }, { label: 'Rappel', text: 'Même distance' }];
    candidate.sequence[1].takeaway = candidate.sequence[1].content;
    const result = validateStagingLevel(candidate, metadata[2], topicName, 'CM2');
    expect(result.pedagogicalIssues.map((issue) => issue.path)).toEqual(expect.arrayContaining([
      'sequence[0].key_points', 'sequence[0].takeaway', 'sequence[1].key_points', 'sequence[1].takeaway',
    ]));
  });

  it('maps the exact version-161 per-level response to user-facing level 3', () => {
    const candidate = structuredClone(validLevel1) as any;
    candidate.sequence[0] = { ...candidate.sequence[0], ...structuredClone(STAGING_VISUAL_EXAMPLES.symmetry), id: 'symmetry-concept-1' };
    candidate.sequence[1] = { ...candidate.sequence[1], ...structuredClone(STAGING_VISUAL_EXAMPLES.symmetry), id: 'symmetry-concept-2' };
    candidate.sequence[3].answer_type = 'unsupported_value';
    candidate.sequence[0].key_points = [{ label: 'Résumé', text: candidate.sequence[0].content }, { label: 'Rappel', text: 'Même distance' }];
    candidate.sequence[0].takeaway = candidate.sequence[0].content;
    candidate.sequence[1].key_points = [{ label: 'Résumé', text: candidate.sequence[1].content }, { label: 'Rappel', text: 'Même distance' }];
    candidate.sequence[1].takeaway = candidate.sequence[1].content;
    const result = validateStagingLevel(candidate, metadata[2], topicName, 'CM2');
    expect(result.canonicalIssues).toContainEqual(expect.objectContaining({ path: 'sequence[3].answer_type', message: expect.stringContaining('"unsupported_value"') }));
    expect(result.pedagogicalIssues.map((issue) => issue.path)).toEqual(expect.arrayContaining(['sequence[0].takeaway', 'sequence[1].takeaway']));
    const failure = stagingValidationFailure(metadata[2].level_number, [...result.canonicalIssues, ...result.pedagogicalIssues], 3);
    expect(failure.level).toBe(3);
    expect(failure.technicalDetail).toContain('sequence[3].answer_type');
    expect(failure.technicalDetail).not.toContain('levels[0].lesson');
  });

  it('rejects the exact version-158 level-1 response with field-specific takeaway paths', () => {
    const rejected = structuredClone(validLevel1) as any;
    rejected.sequence[0].takeaway = 'Pour reconnaitre un rectangle, vérifie ses quatre angles droits et ses côtés opposés égaux.';
    rejected.sequence[1].takeaway = 'Pour reconnaitre un triangle, compte ses trois sommets et ses côtés.';
    const result = validateStagingLevel(rejected, metadata[0], topicName, 'CM2');
    expect(result.pedagogicalIssues.filter((issue) => issue.path.endsWith('.takeaway')).map((issue) => issue.path)).toEqual(expect.arrayContaining([
      'sequence[0].takeaway',
      'sequence[1].takeaway',
    ]));
    expect(rejected.sequence[0].takeaway).toContain('rectangle');
    expect(rejected.sequence[1].takeaway).toContain('triangle');
  });

  it('rejects a repeated takeaway without rewriting it', () => {
    const rejected = structuredClone(validLevel1) as any;
    rejected.sequence[0].takeaway = rejected.sequence[0].content;
    rejected.sequence[1].takeaway = rejected.sequence[1].key_points.map((point: any) => `${point.label} ${point.text}`).join(' ');
    const result = validateStagingLevel(rejected, metadata[0], topicName, 'CM2');
    expect(result.pedagogicalIssues.filter((issue) => issue.path.endsWith('.takeaway')).map((issue) => issue.path)).toEqual(expect.arrayContaining([
      'sequence[0].takeaway',
      'sequence[1].takeaway',
    ]));
    expect(rejected.sequence[0].takeaway).toBe(rejected.sequence[0].content);
  });

  it('requires a takeaway and two or three key points in the compact contract', () => {
    const missingTakeaway = structuredClone(validLevel1) as any;
    delete missingTakeaway.sequence[0].takeaway;
    expect(stagingSequenceContractIssues(missingTakeaway, metadata[0])).toContainEqual({ path: 'sequence[0].takeaway', message: 'Required non-empty string' });
    const oneKeyPoint = structuredClone(validLevel1) as any;
    oneKeyPoint.sequence[0].key_points = [oneKeyPoint.sequence[0].key_points[0]];
    expect(stagingSequenceContractIssues(oneKeyPoint, metadata[0])).toContainEqual({ path: 'sequence[0].key_points', message: 'Expected 2–3 concise factual key point objects' });
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
      validationCategory: 'prerequisite',
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

describe('time-topic visual contract (providerCalls=0)', () => {
  const timeTopic = 'Le repérage dans le temps et les durées';
  const timeMetadata = stagingLevelMetadata('time-topic', timeTopic, [], 'Résoudre des problèmes impliquant des durées; lire une horloge et convertir des unités.');

  it('builds topic-specific prompts for clock, timeline, and unit_conversion visuals', () => {
    expect(timeMetadata.flatMap((level) => level.required_geometry_kinds)).toEqual(expect.arrayContaining(['clock', 'timeline', 'unit_conversion']));
    expect(stagingLevelPrompt(timeTopic, 'CM2', 'fr', timeMetadata[0], 'Convertir des durées')).toContain('Visuels obligatoires dans ce niveau: unit_conversion, timeline');
    expect(stagingLevelPrompt(timeTopic, 'CM2', 'fr', timeMetadata[1], 'Lire une horloge')).toContain('Visuels obligatoires dans ce niveau: clock, timeline');
    expect(stagingLevelPrompt(timeTopic, 'CM2', 'fr', timeMetadata[0], 'Convertir des durées')).toContain(JSON.stringify(STAGING_VISUAL_EXAMPLES.unit_conversion));
    expect(stagingLevelPrompt(timeTopic, 'CM2', 'fr', timeMetadata[1], 'Lire une horloge')).toContain(JSON.stringify(STAGING_VISUAL_EXAMPLES.clock));
    expect(stagingLevelPrompt(timeTopic, 'CM2', 'fr', timeMetadata[1], 'Lire une horloge')).toContain('hour doit être un entier JavaScript compris entre 1 et 12');
    expect(stagingLevelPrompt(timeTopic, 'CM2', 'fr', timeMetadata[1], 'Lire une horloge')).toContain('minute doit être un entier JavaScript compris entre 0 et 59');
  });

  it('accepts complete time visuals through the real geometry and pedagogical validators', () => {
    for (const level of timeMetadata) {
      const candidate = structuredClone(stagingFullLevelExample(level));
      const validation = validateStagingLevel(candidate, level, timeTopic, 'CM2');
      expect(validation.canonicalIssues).toEqual([]);
      expect(validation.pedagogicalIssues).toEqual([]);
      expect(validation.geometryIssues).toEqual([]);
      expect(requiredGeometryKindsIssues(candidate, level.required_geometry_kinds)).toEqual([]);
    }
    const assembled = assembleStagingLesson(timeTopic, timeMetadata.map((metadata) => ({ metadata, lesson: stagingFullLevelExample(metadata) })));
    expect(requiredGeometryIssues(assembled, [...new Set(timeMetadata.flatMap((level) => level.required_geometry_kinds))])).toEqual([]);
  });

  it('rejects rectangle/polygon-only provider output for a time topic', () => {
    const level = timeMetadata[0];
    const candidate = structuredClone(stagingFullLevelExample(level)) as any;
    candidate.sequence[0].visual = structuredClone(STAGING_VISUAL_EXAMPLES.rectangle.visual);
    candidate.sequence[1].visual = structuredClone(STAGING_VISUAL_EXAMPLES.triangle.visual);
    const validation = validateStagingLevel(candidate, level, timeTopic, 'CM2');
    const required = requiredGeometryKindsIssues(candidate, level.required_geometry_kinds);
    expect(required).toEqual(expect.arrayContaining([
      expect.objectContaining({ message: expect.stringContaining('unit_conversion') }),
      expect.objectContaining({ message: expect.stringContaining('timeline') }),
    ]));
    expect([...validation.geometryIssues, ...required]).not.toEqual([]);
  });

  describe('general-topic staging metadata and visual validation', () => {
    const decimalTopic = 'Les nombres décimaux';
    const decimalMetadata = stagingLevelMetadata('decimal-topic', decimalTopic, [], 'Comprendre, comparer et calculer avec les nombres décimaux.');

    it('correctly discriminates geometry and general topics with isGeometryTopic', () => {
      expect(isGeometryTopic('La géométrie plane')).toBe(true);
      expect(isGeometryTopic('Les figures planes')).toBe(true);
      expect(isGeometryTopic('Angles et triangles')).toBe(true);
      expect(isGeometryTopic('Les aires et surfaces')).toBe(true);
      expect(isGeometryTopic('Symétrie axiale')).toBe(true);
      expect(isGeometryTopic('Droites perpendiculaires')).toBe(true);
      expect(isGeometryTopic('Les nombres décimaux')).toBe(false);
      expect(isGeometryTopic('Les fractions')).toBe(false);
      expect(isGeometryTopic('Algèbre')).toBe(false);
      expect(isGeometryTopic('Calcul posé')).toBe(false);
      expect(isGeometryTopic('Durées et horaires')).toBe(false);
    });

    it('exposes one authoritative server visual contract for decimal and geometry topics', () => {
      expect(stagingTopicKind(decimalTopic, 'Comparer des dixièmes')).toBe('general');
      expect(stagingTopicKind('Le repérage dans le temps et les durées')).toBe('time');
      expect(stagingTopicKind('La géométrie plane')).toBe('geometry');
    });

    it('builds progressive levels for general topics with empty required_geometry_kinds', () => {
      expect(decimalMetadata).toHaveLength(4);
      expect(decimalMetadata.flatMap((level) => level.required_geometry_kinds)).toEqual([]);
      expect(decimalMetadata[0].title).toBe('Comprendre le sens et les bases');
      expect(decimalMetadata[1].title).toBe('Représenter et comparer');
      expect(decimalMetadata[2].title).toBe('Appliquer les méthodes et techniques');
      expect(decimalMetadata[3].title).toBe('Résoudre des problèmes');
    });

    it('suggests general visuals (number_line, table, diagram) in prompt visual kinds', () => {
      const kinds = stagingPromptVisualKinds(decimalMetadata[0], decimalTopic);
      expect(kinds).toEqual(['number_line', 'table', 'diagram']);
    });

    it('builds a general prompt containing general visual choices and no mandatory geometry figures', () => {
      const prompt = stagingLevelPrompt(decimalTopic, 'CM2', 'fr', decimalMetadata[0], 'Comprendre les dixièmes et centièmes');
      expect(prompt).toContain('Chaque bloc concept DOIT contenir un visual dessinable complet, choisi parmi: number_line, table, diagram');
      expect(prompt).toContain(JSON.stringify(STAGING_VISUAL_EXAMPLES.number_line));
      expect(prompt).toContain(JSON.stringify(STAGING_VISUAL_EXAMPLES.table));
      expect(prompt).not.toContain('Visuels obligatoires dans ce niveau: rectangle, triangle');
    });

    it('accepts complete general visuals through the real staging validators', () => {
      for (const level of decimalMetadata) {
        const candidate = structuredClone(stagingFullLevelExample(level, decimalTopic));
        const validation = validateStagingLevel(candidate, level, decimalTopic, 'CM2');
        expect(validation.canonicalIssues).toEqual([]);
        expect(validation.pedagogicalIssues).toEqual([]);
        expect(validation.geometryIssues).toEqual([]);
        expect(requiredGeometryKindsIssues(candidate, level.required_geometry_kinds)).toEqual([]);
      }
      const assembled = assembleStagingLesson(decimalTopic, decimalMetadata.map((metadata) => ({ metadata, lesson: stagingFullLevelExample(metadata, decimalTopic) })));
      expect(requiredGeometryIssues(assembled, [])).toEqual([]);
    });
  });
});
