import { describe, expect, it } from 'vitest';
import { buildDeepSeekResponsesRequest, extractDeepSeekResponsesContent, shouldUseDeepSeekResponsesJsonSchema } from './deepseek-responses';
import { STAGING_LEVEL_STRICT_SCHEMA } from '../generate-lesson-content/staging-structured-output';

const schema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    concept_1: { type: 'object' },
    concept_2: { type: 'object' },
    guided_example: { type: 'object' },
    student_try: { type: 'object' },
    mastery_check: { type: 'object' },
  },
  required: ['concept_1', 'concept_2', 'guided_example', 'student_try', 'mastery_check'],
};

describe('DeepSeek Responses API provider-free boundary', () => {
  it('validates the complete staging request gate, request body, schema, and extraction path', () => {
    const flags = {
      requestMode: 'lessonGeneration',
      useResponsesJsonSchema: true,
      responsesJsonSchemaEnabled: 'true',
      responsesModel: 'deepseek-flash',
      structuredOutputSchema: STAGING_LEVEL_STRICT_SCHEMA,
    };
    expect(shouldUseDeepSeekResponsesJsonSchema(flags)).toBe(true);
    const request = buildDeepSeekResponsesRequest({
      model: flags.responsesModel,
      instructions: { role: 'system', content: 'structured lesson instructions' },
      input: 'one level input',
      schema: flags.structuredOutputSchema,
      maxOutputTokens: 4096,
      temperature: 0,
    });
    expect(request).toMatchObject({
      model: 'deepseek-flash',
      instructions: 'structured lesson instructions',
      temperature: 0,
      text: { format: { type: 'json_schema', schema: STAGING_LEVEL_STRICT_SCHEMA } },
    });
    const extracted = extractDeepSeekResponsesContent({
      status: 'completed',
      output: [{ type: 'message', content: [{ type: 'output_text', text: '{"concept_1":{}}' }] }],
      usage: { input_tokens: 12, output_tokens: 8, total_tokens: 20 },
    });
    expect(extracted.content).toBe('{"concept_1":{}}');
    expect(extracted.metadata).toMatchObject({ choiceCount: 1, finishReason: 'stop', totalTokens: 20 });
  });

  it('keeps the gate closed unless all activation conditions are present', () => {
    expect(shouldUseDeepSeekResponsesJsonSchema({
      requestMode: 'lessonGeneration', useResponsesJsonSchema: true, responsesJsonSchemaEnabled: 'false',
      responsesModel: 'deepseek-flash', structuredOutputSchema: schema,
    })).toBe(false);
    expect(shouldUseDeepSeekResponsesJsonSchema({
      requestMode: 'chat', useResponsesJsonSchema: true, responsesJsonSchemaEnabled: 'true',
      responsesModel: 'deepseek-flash', structuredOutputSchema: schema,
    })).toBe(false);
    expect(shouldUseDeepSeekResponsesJsonSchema({
      requestMode: 'lessonGeneration', useResponsesJsonSchema: true, responsesJsonSchemaEnabled: 'true',
      responsesModel: 'deepseek-chat', structuredOutputSchema: schema,
    })).toBe(false);
  });

  it('builds one strict json_schema request for one level', () => {
    const request = buildDeepSeekResponsesRequest({
      model: 'deepseek-flash',
      instructions: 'system',
      input: 'level prompt',
      schema,
      maxOutputTokens: 4096,
      temperature: 0,
    });
    expect(request).toMatchObject({
      model: 'deepseek-flash',
      max_output_tokens: 4096,
      temperature: 0,
      text: { format: { type: 'json_schema', name: 'staging_level_compact_v1', schema } },
    });
  });

  it('extracts only completed output text and token metadata', () => {
    expect(extractDeepSeekResponsesContent({
      status: 'completed',
      output: [{ type: 'message', content: [{ type: 'output_text', text: '{"ok":true}' }] }],
      usage: { input_tokens: 10, output_tokens: 20, total_tokens: 30 },
    })).toEqual({
      content: '{"ok":true}',
      metadata: { choiceCount: 1, finishReason: 'stop', promptTokens: 10, completionTokens: 20, totalTokens: 30, contentLength: 11 },
    });
  });

  it.each([
    [{ status: 'completed', output: [] }, 'no structured output'],
    [{ status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' } }, 'non-completed status: incomplete'],
    [{ status: 'failed', error: { code: 'provider_error' } }, 'non-completed status: failed'],
  ])('rejects %s without exposing provider content', (payload, message) => {
    expect(() => extractDeepSeekResponsesContent(payload as Record<string, unknown>)).toThrow(message);
    expect(() => extractDeepSeekResponsesContent(payload as Record<string, unknown>)).toThrowError(/^(?!.*lesson).*$/);
  });

  it('rejects any non-completed status even when output_text is present', () => {
    expect(() => extractDeepSeekResponsesContent({
      status: 'queued',
      output: [{ type: 'message', content: [{ type: 'output_text', text: '{"unexpected":true}' }] }],
    })).toThrow('non-completed status: queued');
  });
});
