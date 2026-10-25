import { describe, expect, it } from 'vitest';
import {
  assessDeepSeekStrictSchemaCompatibility,
  STAGING_LEVEL_OUTPUT_SCHEMA,
  STAGING_LEVEL_STRICT_SCHEMA,
  stagingResponsesJsonSchemaPrototype,
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
} from './staging-level-workflow';
import { validateStagingGenerationEnvelope } from '../../../src/services/lessonVersionWorkflow';

describe('staging structured output boundary', () => {
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
    expect(result.currentConfiguredModel).toBe('deepseek-chat');
    expect(result.responsesSupportedModels).toEqual(['deepseek-flash', 'deepseek-v4-pro']);
    expect(result.unsupportedFeatures.join(' ')).toContain('Chat Completions');
    expect(result.unsupportedFeatures.join(' ')).toContain('minItems/maxItems');
    expect(result.estimatedMultiOutputCallsPerTopic).toBe(4);
    expect(result.estimatedWorstCaseCallsPerTopic).toBe(8);
  });

  it('prototypes one Responses API json_schema request without activating it', () => {
    const request = stagingResponsesJsonSchemaPrototype();
    expect(request.model).toBe('deepseek-flash');
    expect(request.temperature).toBe(0);
    expect(request.text.format).toMatchObject({ type: 'json_schema', name: 'staging_level_compact_v1' });
    expect(request.text.format.schema.required).toEqual(expect.arrayContaining([
      'concept_1', 'concept_2', 'guided_example', 'student_try', 'mastery_check',
    ]));
    const strictSchema = request.text.format.schema as any;
    expect(strictSchema.properties.student_try.required).toContain('correct_answer');
    expect(strictSchema.properties.mastery_check.properties.questions.items.required).toContain('correct_answer');
    expect(stagingProviderOutputContract().strictSchemaActive).toBe(false);
  });

  it('represents optional choices, hints, visuals, and renderer data without weakening application validation', () => {
    const schema = STAGING_LEVEL_STRICT_SCHEMA as any;
    const visual = schema.properties.concept_1.properties.visual;
    const visualSchema = visual.anyOf[0];
    const dataSchema = visualSchema.properties.data;
    const dataFields = new Set(Object.keys(dataSchema.properties));
    const rendererVariants = [
      ['clock', ['hour', 'minute', 'annotations']],
      ['timeline', ['items', 'relations', 'units']],
      ['unit_conversion', ['from', 'to', 'factor', 'relations']],
      ['number_line', ['min', 'max', 'step', 'ticks', 'value']],
      ['fraction_bar', ['parts', 'filled', 'numerator', 'denominator']],
      ['polygon', ['shape', 'vertices', 'side_labels', 'dimensions']],
      ['angle', ['vertex', 'rays', 'degrees', 'rightAngle']],
      ['circle', ['center', 'radius', 'diameter', 'radiusEnd', 'diameterEnd']],
      ['symmetry', ['axis', 'grid', 'figure', 'symmetric_figure', 'original', 'reflected']],
      ['diagram', ['points', 'segments', 'lines', 'arrows', 'annotations', 'relations']],
      ['generic', ['groups', 'labels', 'nodes', 'text']],
    ] as const;
    for (const [, fields] of rendererVariants) {
      for (const field of fields) expect(dataFields).toContain(field);
    }
    expect(visualSchema.properties.data).toBeDefined();
    expect(schema.properties.student_try.properties.choices.anyOf).toEqual(expect.arrayContaining([{ type: 'null' }]));
    expect(schema.properties.student_try.properties.hints.anyOf).toEqual(expect.arrayContaining([{ type: 'null' }]));
    expect(schema.properties.prerequisites.items.properties.visual.anyOf).toEqual(expect.arrayContaining([{ type: 'null' }]));
  });

  it('keeps every strict object closed while making all optional runtime fields explicit', () => {
    const schema = STAGING_LEVEL_STRICT_SCHEMA as any;
    const nestedObjects = [
      schema,
      schema.properties.concept_1,
      schema.properties.concept_1.properties.visual.anyOf[0],
      schema.properties.concept_1.properties.visual.anyOf[0].properties.data,
      schema.properties.student_try,
      schema.properties.mastery_check,
      schema.properties.prerequisites.items,
    ];
    nestedObjects.forEach((objectSchema) => {
      expect(objectSchema.additionalProperties).toBe(false);
      expect(objectSchema.required).toEqual(Object.keys(objectSchema.properties));
    });
  });

  it('keeps the strict prototype separate from the legacy JSON-mode schema', () => {
    expect([...STAGING_LEVEL_STRICT_SCHEMA.required].sort()).toEqual([...STAGING_LEVEL_OUTPUT_SCHEMA.required].sort());
    expect(STAGING_LEVEL_STRICT_SCHEMA.additionalProperties).toBe(false);
  });

  it('defines five required named block properties without a provider-facing sequence', () => {
    expect(STAGING_LEVEL_OUTPUT_SCHEMA.required).toEqual(expect.arrayContaining([
      'concept_1', 'concept_2', 'guided_example', 'student_try', 'mastery_check',
    ]));
    expect(STAGING_LEVEL_OUTPUT_SCHEMA.properties).not.toHaveProperty('sequence');
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
