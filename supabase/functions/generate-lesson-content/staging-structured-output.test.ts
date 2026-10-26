import { describe, expect, it } from 'vitest';
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
