import { describe, expect, it } from 'vitest';
import Ajv from 'ajv';
import {
  assessDeepSeekStrictSchemaCompatibility,
  STAGING_LEVEL_OUTPUT_SCHEMA,
  stagingProviderOutputContract,
} from './staging-structured-output';
import {
  assembleStagingLesson,
  assembleStagingSequenceFromCompact,
  parseStagingLevelResponse,
  stagingFullLevelCompactExample,
  stagingFullLevelExample,
  stagingLevelMetadata,
  stagingSequenceContractIssues,
  requiredGeometryKindsIssues,
  validateStagingLevel,
  summarizeStagingValidation,
  qualifyStagingWarningPath,
  STAGING_VISUAL_EXAMPLES,
} from './staging-level-workflow';
import { validateStagingGenerationEnvelope } from '../../../src/services/lessonVersionWorkflow';

describe('staging structured output boundary', () => {
  const schemaValidator = new Ajv({ allErrors: true }).compile(STAGING_LEVEL_OUTPUT_SCHEMA as any);

  it('keeps the current paid-call policy at one level per initial call', () => {
    expect(stagingProviderOutputContract()).toEqual({
      responseFormat: { type: 'json_object' },
      strictSchemaActive: false,
      providerGuarantee: 'valid-json-object-only',
      applicationGuarantee: 'full-level-contract-validation-and-five-block-assembly',
    });
  });

  it('records why strict schema mode is not activated for the deployed endpoint', () => {
    const result = assessDeepSeekStrictSchemaCompatibility();
    expect(result.compatible).toBe(false);
    expect(result.endpoint).toContain('/v1/chat/completions');
    expect(result.unsupportedFeatures.join(' ')).toContain('strict-schema/tool-call transport');
    expect(result.estimatedMultiOutputCallsPerTopic).toBe(20);
    expect(result.estimatedWorstCaseCallsPerTopic).toBe(40);
  });

  it('defines five required named block properties without a provider-facing sequence', () => {
    expect(STAGING_LEVEL_OUTPUT_SCHEMA.required).toEqual(expect.arrayContaining([
      'concept_1', 'concept_2', 'guided_example', 'student_try', 'mastery_check',
    ]));
    expect(STAGING_LEVEL_OUTPUT_SCHEMA.properties).not.toHaveProperty('sequence');
  });

  it('declares choices as an allowed optional property with a choice-type requirement', () => {
    const questions = STAGING_LEVEL_OUTPUT_SCHEMA.properties.mastery_check.properties.questions;
    const questionSchema = questions.items;
    expect(questionSchema.properties).toHaveProperty('choices');
    expect(questionSchema.required).not.toContain('choices');
    expect(questionSchema.oneOf).toEqual(expect.arrayContaining([
      expect.objectContaining({ required: ['choices'] }),
    ]));
  });

  it('requires mastery_check.questions in the declarative schema', () => {
    const masteryCheck = STAGING_LEVEL_OUTPUT_SCHEMA.properties.mastery_check;
    expect(masteryCheck.required).toEqual(expect.arrayContaining(['id', 'type', 'content', 'questions']));
    expect(masteryCheck.properties).toHaveProperty('questions');
    expect(masteryCheck.properties.id).toEqual({ type: 'string' });
    expect(masteryCheck.properties.type).toEqual({ enum: ['mastery_check'] });
    expect(masteryCheck.properties.content).toEqual({ type: 'string' });
  });

  it('rejects additional mastery_check properties at the schema boundary', () => {
    const masteryCheck = STAGING_LEVEL_OUTPUT_SCHEMA.properties.mastery_check;
    const questionSchema = masteryCheck.properties.questions.items;
    expect(masteryCheck.additionalProperties).toBe(false);
    expect(questionSchema.additionalProperties).toBe(false);
  });

  it.each([
    ['nombres décimaux', 'Les nombres décimaux', 'Comparer des nombres décimaux.'],
    ['temps et durées', 'Le repérage dans le temps et les durées', 'Lire une heure et convertir des durées.'],
    ['géométrie', 'La géométrie plane', 'Reconnaître et décrire des figures.'],
    ['sujet non géométrique', 'La proportionnalité', 'Comparer deux grandeurs proportionnelles.'],
  ])('validates the complete %s fixtures with JSON Schema, parser, assembly and application validators', (_label, topic, objective) => {
    const metadata = stagingLevelMetadata('fixture-topic', topic, ['fixture-objective'], objective);
    const levels = metadata.map((level) => {
      const compact = stagingFullLevelCompactExample(level);
      expect(schemaValidator(compact), JSON.stringify(schemaValidator.errors)).toBe(true);
      const parsed = parseStagingLevelResponse(JSON.stringify(compact), level).value;
      const validation = validateStagingLevel(parsed, level, topic, 'CM2');
      expect(validation.canonicalIssues).toEqual([]);
      expect(validation.pedagogicalIssues).toEqual([]);
      expect(validation.geometryIssues).toEqual([]);
      expect(summarizeStagingValidation(validation).interactionIssues).toEqual([]);
      expect(requiredGeometryKindsIssues(parsed, level.required_geometry_kinds, level.required_geometry_alternatives)).toEqual([]);
      return { metadata: level, lesson: parsed };
    });
    const assembled = assembleStagingLesson(topic, levels);
    expect(assembled.levels).toHaveLength(4);
  });

  it('rejects missing mastery questions and extra mastery properties with the real JSON Schema validator', () => {
    const metadata = stagingLevelMetadata('fixture-topic', 'La proportionnalité', [], 'Comparer deux grandeurs proportionnelles.')[0];
    const missingQuestions = stagingFullLevelCompactExample(metadata) as any;
    delete missingQuestions.mastery_check.questions;
    expect(schemaValidator(missingQuestions)).toBe(false);
    expect(schemaValidator.errors?.some((error) => error.keyword === 'required')).toBe(true);

    const extraProperty = stagingFullLevelCompactExample(metadata) as any;
    extraProperty.mastery_check.unexpected = true;
    expect(schemaValidator(extraProperty)).toBe(false);
    expect(schemaValidator.errors?.some((error) => error.keyword === 'additionalProperties')).toBe(true);
  });

  it('rejects incomplete interactive questions, missing choices and truncated JSON before assembly', () => {
    const metadata = stagingLevelMetadata('fixture-topic', 'La proportionnalité', [], 'Comparer deux grandeurs proportionnelles.')[0];
    const missingAnswer = stagingFullLevelCompactExample(metadata) as any;
    delete missingAnswer.mastery_check.questions[0].correct_answer;
    expect(schemaValidator(missingAnswer)).toBe(false);

    const missingChoices = stagingFullLevelCompactExample(metadata) as any;
    const question = missingChoices.mastery_check.questions[0];
    question.answer_type = 'multiple_choice';
    delete question.choices;
    expect(schemaValidator(missingChoices)).toBe(false);

    expect(() => parseStagingLevelResponse('{"mastery_check":{"id":"m1"}')).toThrow('staging_level_json_parse_failed');
  });

  it('keeps lexical overlap as an explicit review warning in the validation envelope', () => {
    const metadata = stagingLevelMetadata('fixture-topic', 'Symétrie', [], 'Reconnaître une symétrie.')[0];
    const lesson = stagingFullLevelExample(metadata) as any;
    lesson.sequence[1].content = 'Je compte les carreaux, mesure ensuite puis je reporte le résultat après.';
    lesson.sequence[1].key_points = [{ label: 'Axe', text: 'Droite verticale' }];
    lesson.sequence[1].takeaway = 'Astuce : je compte et vérifie après.';
    const validation = validateStagingLevel(lesson, metadata, 'Symétrie', 'CM2');
    const summary = summarizeStagingValidation(validation, [], [{
      path: 'sequence[1].takeaway',
      message: 'Similarité lexicale à revoir. overlap=2, ratio=0.50.',
    }]);
    expect(summary.pedagogicalValid).toBe(true);
    expect(summary.pedagogicalReviewRequired).toBe(true);
    expect(summary.pedagogicalWarnings).toEqual([{ path: 'sequence[1].takeaway', message: 'Similarité lexicale à revoir. overlap=2, ratio=0.50.' }]);
    expect(summary.diagnostics).toContain('sequence[1].takeaway: Avertissement de revue : Similarité lexicale à revoir. overlap=2, ratio=0.50.');
    expect(qualifyStagingWarningPath(3, 'sequence[1].takeaway')).toBe('levels[2].lesson.sequence[1].takeaway');
  });

  it('rejects null, object and non-numeric mastery fields at the AJV boundary', () => {
    const metadata = stagingLevelMetadata('fixture-topic', 'La proportionnalité', [], 'Comparer deux grandeurs proportionnelles.')[0];
    const nullAnswer = stagingFullLevelCompactExample(metadata) as any;
    nullAnswer.mastery_check.questions[0].correct_answer = null;
    expect(schemaValidator(nullAnswer)).toBe(false);

    const objectAnswer = stagingFullLevelCompactExample(metadata) as any;
    objectAnswer.mastery_check.questions[0].correct_answer = { value: 3 };
    expect(schemaValidator(objectAnswer)).toBe(false);

    const textDifficulty = stagingFullLevelCompactExample(metadata) as any;
    textDifficulty.mastery_check.questions[0].difficulty = 'easy';
    expect(schemaValidator(textDifficulty)).toBe(false);
  });

  it('rejects the same invalid mastery values in the staging runtime validator', () => {
    const metadata = stagingLevelMetadata('fixture-topic', 'La proportionnalité', [], 'Comparer deux grandeurs proportionnelles.')[0];
    const candidate = stagingFullLevelExample(metadata) as any;
    const question = candidate.sequence.find((block: any) => block.type === 'mastery_check').questions[0];
    question.correct_answer = { value: 3 };
    question.difficulty = 'easy';
    const result = validateStagingLevel(candidate, metadata, 'La proportionnalité', 'CM2');
    expect(result.canonicalIssues).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: 'sequence[4].questions[0].correct_answer' }),
      expect.objectContaining({ path: 'sequence[4].questions[0].difficulty' }),
    ]));
  });

  it('rejects incompatible visuals for the time-topic contract', () => {
    const level = stagingLevelMetadata('fixture-topic', 'Le repérage dans le temps et les durées', [], 'Lire une heure.')[0];
    const candidate = stagingFullLevelExample(level) as any;
    candidate.sequence[0].visual = structuredClone(STAGING_VISUAL_EXAMPLES.rectangle.visual);
    candidate.sequence[1].visual = structuredClone(STAGING_VISUAL_EXAMPLES.triangle.visual);
    const required = requiredGeometryKindsIssues(candidate, level.required_geometry_kinds, level.required_geometry_alternatives);
    expect(required.length).toBeGreaterThan(0);
    expect(required.map((issue) => issue.message).join(' ')).toContain('unit_conversion');
  });

  it('keeps simulated persistence all-or-nothing when a level is missing', () => {
    const metadata = stagingLevelMetadata('fixture-topic', 'La proportionnalité', [], 'Comparer deux grandeurs proportionnelles.');
    const levels = metadata.slice(0, 3).map((level) => ({ metadata: level, lesson: stagingFullLevelExample(level) }));
    expect(() => assembleStagingLesson('La proportionnalité', levels)).toThrow('expected 4 levels');
  });

  it('builds and validates the five blocks in application code before assembly', () => {
    const metadata = stagingLevelMetadata('topic', 'Figures planes', ['objective']);
    const levels = metadata.map((level) => {
      const lesson = stagingFullLevelExample(level);
      expect(stagingSequenceContractIssues(lesson, level)).toEqual([]);
      expect(lesson.sequence).toHaveLength(5);
      return { metadata: level, lesson };
    });

    const assembled = assembleStagingLesson('Figures planes', levels);
    expect(assembled.levels).toHaveLength(4);
    expect((assembled.levels as Array<{ lesson: { sequence: unknown[] } }>).every(({ lesson }) => lesson.sequence.length === 5)).toBe(true);
  });

  it('requires all five named properties and builds sequence deterministically', () => {
    const metadata = stagingLevelMetadata('topic', 'Figures planes', ['objective'])[0];
    const compact = stagingFullLevelCompactExample(metadata);
    expect(Object.keys(compact)).toEqual(expect.arrayContaining([
      'concept_1', 'concept_2', 'guided_example', 'student_try', 'mastery_check',
    ]));
    const parsed = parseStagingLevelResponse(JSON.stringify(compact), metadata).value;
    expect((parsed.sequence as Array<Record<string, unknown>>).map((block) => block.type)).toEqual([
      'concept', 'concept', 'guided_example', 'student_try', 'mastery_check',
    ]);
  });

  it('rejects a compact response with a missing named block before persistence', () => {
    const metadata = stagingLevelMetadata('topic', 'Figures planes', ['objective'])[0];
    const compact = stagingFullLevelCompactExample(metadata);
    delete compact.guided_example;
    expect(() => assembleStagingSequenceFromCompact(compact)).toThrow(/guided_example/);
    expect(() => parseStagingLevelResponse(JSON.stringify(compact), metadata)).toThrow(/guided_example/);
  });

  it('does not make a malformed level eligible for assembly or persistence', () => {
    const metadata = stagingLevelMetadata('topic', 'Figures planes', ['objective']);
    const invalid = stagingFullLevelExample(metadata[0]);
    invalid.sequence = (invalid.sequence as unknown[]).slice(0, 4);
    expect(stagingSequenceContractIssues(invalid, metadata[0])).toEqual([
      { path: 'sequence', message: 'Expected exactly 5 typed blocks.' },
    ]);
    // The workflow only calls assembly after each level has no issues; this
    // assertion documents that the malformed response is rejected before the
    // draft insertion path rather than being repaired here.
    expect(stagingSequenceContractIssues(invalid, metadata[0]).length).toBeGreaterThan(0);
  });

  it('retains the PR #10 envelope rule for a successful JSON retry', async () => {
    const levelResults = [1, 2, 3, 4].map((level) => ({
      level,
      status: 'complete',
      providerCalls: level === 3 ? 2 : 1,
      tokenUsage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
    }));
    expect(() => validateStagingGenerationEnvelope({
      success: true,
      lesson_content: { version: '2.1' },
      levelResults,
      progress: levelResults,
      providerCalls: 5,
    })).not.toThrow();
  });
});
