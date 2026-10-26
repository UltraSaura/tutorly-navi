/**
 * Provider capability boundary for the staging level response.
 *
 * The deployed staging path uses DeepSeek Chat Completions. That endpoint
 * supports JSON mode, but it does not accept the Responses API `text.format`
 * json_schema contract. DeepSeek's beta strict tool mode also cannot express
 * the exact five-item sequence because minItems/maxItems are unsupported.
 * Keep this fact explicit so a future provider change cannot silently claim
 * stronger guarantees than the request actually has.
 */

const STAGING_MASTERY_QUESTION_PROPERTIES = {
  id: { type: 'string' },
  question: { type: 'string' },
  answer_type: { type: 'string' },
  correct_answer: {
    oneOf: [
      { type: 'string', minLength: 1 },
      { type: 'number' },
      { type: 'array', minItems: 1, items: { type: 'string', minLength: 1 } },
    ],
  },
  skill: { type: 'string' },
  difficulty: { type: 'number' },
  success_feedback: { type: 'string' },
  error_feedback: { type: 'string' },
  choices: { type: 'array', items: { type: 'string' }, minItems: 2 },
} as const;

const STAGING_MASTERY_QUESTION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: STAGING_MASTERY_QUESTION_PROPERTIES,
  required: ['id', 'question', 'answer_type', 'correct_answer', 'skill', 'difficulty', 'success_feedback', 'error_feedback'],
  oneOf: [
    {
      properties: {
        answer_type: { enum: ['multiple_choice', 'selection'] },
        choices: { type: 'array', items: { type: 'string' }, minItems: 2 },
      },
      required: ['choices'],
    },
    {
      properties: {
        answer_type: { enum: ['numeric', 'time', 'short_text', 'text', 'ordering'] },
      },
    },
  ],
} as const;

const STAGING_MASTERY_CHECK_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    id: { type: 'string' },
    type: { enum: ['mastery_check'] },
    content: { type: 'string' },
    questions: { type: 'array', minItems: 1, maxItems: 4, items: STAGING_MASTERY_QUESTION_SCHEMA },
  },
  required: ['id', 'type', 'content', 'questions'],
} as const;

export const DEEPSEEK_CHAT_COMPLETIONS_ENDPOINT = 'https://api.deepseek.com/v1/chat/completions';

export const STAGING_LEVEL_OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    lesson_goal: { type: 'string' },
    success_criteria: { type: 'array', items: { type: 'string' } },
    prerequisites: { type: 'array', items: { type: 'object' } },
    concept_1: { type: 'object' },
    concept_2: { type: 'object' },
    guided_example: { type: 'object' },
    student_try: { type: 'object' },
    mastery_check: STAGING_MASTERY_CHECK_SCHEMA,
    misconceptions: { type: 'array', items: { type: 'object' } },
    mastery: { type: 'object' },
  },
  required: [
    'lesson_goal', 'success_criteria', 'prerequisites', 'misconceptions', 'mastery',
    'concept_1', 'concept_2', 'guided_example', 'student_try', 'mastery_check',
  ],
} as const;

export type StagingProviderOutputContract = {
  responseFormat: { type: 'json_object' };
  strictSchemaActive: false;
  providerGuarantee: 'valid-json-object-only';
  applicationGuarantee: 'full-level-contract-validation-and-five-block-assembly';
};

export type StrictSchemaCompatibility = {
  compatible: false;
  endpoint: string;
  mode: 'chat_json_object';
  unsupportedFeatures: string[];
  diagnostic: string;
  estimatedMultiOutputCallsPerTopic: number;
  estimatedWorstCaseCallsPerTopic: number;
};

/**
 * Returns the only contract currently safe for the deployed Chat Completions
 * integration. This does not pretend that JSON mode validates the nested
 * lesson schema; parseStagingLevelResponse remains authoritative.
 */
export function stagingProviderOutputContract(): StagingProviderOutputContract {
  return {
    responseFormat: { type: 'json_object' },
    strictSchemaActive: false,
    providerGuarantee: 'valid-json-object-only',
    applicationGuarantee: 'full-level-contract-validation-and-five-block-assembly',
  };
}

/**
 * The strict schema alternative is intentionally not activated. Five small
 * outputs (one per block) across four levels would be 20 initial calls/topic;
 * applying the existing one-bounded-JSON-retry policy per output would make
 * the worst case 40 calls/topic. The current policy remains 4 initial calls,
 * with at most 8 total calls/topic.
 */
export function assessDeepSeekStrictSchemaCompatibility(): StrictSchemaCompatibility {
  return {
    compatible: false,
    endpoint: DEEPSEEK_CHAT_COMPLETIONS_ENDPOINT,
    mode: 'chat_json_object',
    unsupportedFeatures: [
      'Responses API text.format=json_schema is not part of the current Chat Completions request.',
      'The current ai-chat adapter has no strict-schema/tool-call transport for these five named block properties.',
      'Switching to Responses API or beta strict tools would be a provider-path change and is not activated here.',
    ],
    diagnostic: 'Strict provider schema is not compatible with the current deployed endpoint and exact five-block contract; application-side validation remains mandatory.',
    estimatedMultiOutputCallsPerTopic: 20,
    estimatedWorstCaseCallsPerTopic: 40,
  };
}
