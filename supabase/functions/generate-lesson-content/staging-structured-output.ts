/**
 * Provider capability boundary for the staging level response.
 *
 * The deployed staging path uses DeepSeek Chat Completions. That endpoint
 * supports JSON mode, but the current adapter does not send the Responses API
 * `text.format` json_schema contract or the beta tool `strict` flag.
 * DeepSeek documents both strict mechanisms, while leaving array cardinality
 * to application validation because minItems/maxItems are unsupported.
 * Keep this fact explicit so a future provider change cannot silently claim
 * stronger guarantees than the request actually has.
 */

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
    mastery_check: { type: 'object' },
    misconceptions: { type: 'array', items: { type: 'object' } },
    mastery: { type: 'object' },
  },
  required: [
    'lesson_goal', 'success_criteria', 'prerequisites', 'misconceptions', 'mastery',
    'concept_1', 'concept_2', 'guided_example', 'student_try', 'mastery_check',
  ],
} as const;

const strictObject = (properties: Record<string, unknown>) => ({
  type: 'object',
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});
const nullable = (schema: unknown) => ({ anyOf: [schema, { type: 'null' }] });
const strictString = { type: 'string' };
const strictNumber = { type: 'number' };
const strictAnswer = { anyOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }, { type: 'array', items: { type: 'string' } }] };
const strictPoint = strictObject({ x: strictNumber, y: strictNumber, label: nullable(strictString) });
const strictRelation = strictObject({
  from: nullable({ anyOf: [strictString, strictNumber] }), to: nullable({ anyOf: [strictString, strictNumber] }), start: nullable({ anyOf: [strictString, strictNumber] }), end: nullable({ anyOf: [strictString, strictNumber] }),
  through: nullable({ type: 'array', items: strictString }), points: nullable({ type: 'array', items: strictPoint }),
  label: nullable(strictString), title: nullable(strictString), type: nullable(strictString), text: nullable(strictString), value: nullable({ anyOf: [strictString, strictNumber] }),
  source: nullable(strictString), target: nullable(strictString), unit: nullable(strictString), detail: nullable(strictString),
  next: nullable(strictString), relation: nullable(strictString), multiplier: nullable({ anyOf: [strictString, strictNumber] }), factor: nullable(strictNumber),
  count: nullable({ anyOf: [strictString, strictNumber] }), quantity: nullable({ anyOf: [strictString, strictNumber] }),
  hours: nullable(strictString), hour: nullable(strictString), minutes: nullable(strictString), minute: nullable(strictString),
  x: nullable(strictNumber), y: nullable(strictNumber), infinite: nullable({ type: 'boolean' }), extends: nullable({ type: 'boolean' }),
});
const strictItem = { anyOf: [strictString, strictNumber, strictRelation] };
const strictPointArray = { type: 'array', items: strictPoint };
const strictRelationArray = { type: 'array', items: strictRelation };
const strictVisualData = strictObject({
  // The renderer accepts these fields across the supported visual families.
  // They are nullable because Responses strict schemas require every property
  // to be listed and present; the application validators still enforce the
  // fields required by the selected visual kind.
  kind: nullable(strictString), shape: nullable(strictString), name: nullable(strictString), title: nullable(strictString), label: nullable(strictString), text: nullable(strictString),
  x: nullable(strictNumber), y: nullable(strictNumber), hour: nullable({ type: 'integer' }), minute: nullable({ type: 'integer' }),
  center: nullable(strictPoint), centre: nullable(strictPoint), vertex: nullable(strictPoint), radius: nullable(strictNumber), diameter: nullable({ anyOf: [strictNumber, { type: 'boolean' }] }), unit: nullable(strictString),
  radiusEnd: nullable(strictPoint), diameterEnd: nullable(strictPoint), center_label: nullable(strictString), radius_label: nullable(strictString), diameter_label: nullable(strictString),
  degrees: nullable(strictNumber), angle: nullable(strictNumber), value: nullable(strictNumber), rightAngle: nullable({ type: 'boolean' }),
  rays: nullable(strictPointArray), points: nullable(strictPointArray), vertices: nullable(strictPointArray), coordinates: nullable(strictPointArray),
  segments: nullable(strictRelationArray), lines: nullable(strictRelationArray), arrows: nullable(strictRelationArray),
  axis: nullable(strictObject({ x: nullable(strictNumber), y: nullable(strictNumber) })),
  grid: nullable(strictObject({ width: nullable(strictNumber), height: nullable(strictNumber), size: nullable(strictNumber) })),
  figure: nullable(strictPointArray), original: nullable(strictPointArray), symmetric_figure: nullable(strictPointArray), reflected: nullable(strictPointArray),
  units: nullable({ type: 'array', items: strictString }), relations: nullable({ type: 'array', items: strictItem }), relationships: nullable({ type: 'array', items: strictString }),
  events: nullable({ type: 'array', items: strictItem }), nodes: nullable({ type: 'array', items: strictItem }), items: nullable({ type: 'array', items: strictItem }), labels: nullable({ type: 'array', items: strictItem }),
  conversions: nullable(strictRelationArray), equivalences: nullable(strictRelationArray), pairs: nullable(strictRelationArray),
  from: nullable(strictString), to: nullable(strictString), factor: nullable(strictNumber), min: nullable(strictNumber), max: nullable(strictNumber), step: nullable(strictNumber), ticks: nullable({ type: 'array', items: strictNumber }),
  parts: nullable({ type: 'integer' }), filled: nullable({ type: 'integer' }), numerator: nullable({ type: 'integer' }), denominator: nullable({ type: 'integer' }),
  annotations: nullable({ type: 'array', items: strictItem }), hand_labels: nullable(strictRelation), handLabels: nullable(strictRelation),
  side_labels: nullable(strictRelationArray), dimensions: nullable(strictRelationArray), relations_label: nullable(strictString),
  groups: nullable({ type: 'array', items: strictItem }), columns: nullable({ type: 'array', items: strictItem }), rows: nullable({ type: 'array', items: strictItem }),
  equations: nullable({ type: 'array', items: strictString }), terms: nullable({ type: 'array', items: strictItem }),
});
const strictVisual = strictObject({ kind: strictString, purpose: nullable(strictString), alt_text: nullable(strictString), data: strictVisualData });
const strictKeyPoint = strictObject({ label: strictString, text: strictString });
const strictConcept = strictObject({
  id: strictString, type: { const: 'concept' }, title: strictString, content: strictString,
  key_points: { type: 'array', items: strictKeyPoint }, takeaway: strictString, visual: nullable(strictVisual),
});
const strictStep = strictObject({ instruction: strictString, representation: nullable(strictString), reason: strictString });
const strictGuidedExample = strictObject({ id: strictString, type: { const: 'guided_example' }, content: strictString, context: strictString, steps: { type: 'array', items: strictStep } });
const strictInteractive = strictObject({
  id: strictString, type: { enum: ['student_try', 'feedback_checkpoint'] }, content: strictString,
  question: strictString, answer_type: { enum: ['multiple_choice', 'numeric', 'time', 'short_text', 'text', 'selection', 'ordering'] },
  choices: nullable({ type: 'array', items: strictString }), correct_answer: strictAnswer, hints: nullable({ type: 'array', items: strictString }),
  success_feedback: strictString, error_feedback: strictString,
});
const strictMasteryQuestion = strictObject({
  id: strictString, question: strictString, answer_type: { enum: ['multiple_choice', 'numeric', 'time', 'short_text', 'text', 'selection', 'ordering'] },
  choices: nullable({ type: 'array', items: strictString }), correct_answer: strictAnswer, skill: strictString, difficulty: { anyOf: [strictString, strictNumber] },
  success_feedback: strictString, error_feedback: strictString,
});
const strictMasteryCheck = strictObject({ id: strictString, type: { const: 'mastery_check' }, content: strictString, questions: { type: 'array', items: strictMasteryQuestion } });
const strictPrerequisite = strictObject({ id: strictString, description: strictString, type: { enum: ['multiple_choice', 'numeric', 'time', 'short_text', 'text', 'selection', 'ordering'] }, prompt: strictString, choices: nullable({ type: 'array', items: strictString }), expected_answer: { anyOf: [{ type: 'string' }, { type: 'number' }] }, remediation_hint: strictString, visual: nullable(strictVisual) });
const strictMisconception = strictObject({ id: strictString, description: strictString, detect_if: strictString, feedback: strictString, remediation_strategy: strictString });

/** Full nested prototype for Responses json_schema. It is only passed when
 * both experimental flags are enabled; the normal staging path remains JSON
 * mode until the model/transport compatibility test is approved. */
export const STAGING_LEVEL_STRICT_SCHEMA = strictObject({
  lesson_goal: strictString,
  success_criteria: { type: 'array', items: strictString },
  prerequisites: { type: 'array', items: strictPrerequisite },
  concept_1: strictConcept,
  concept_2: strictConcept,
  guided_example: strictGuidedExample,
  student_try: strictInteractive,
  mastery_check: strictMasteryCheck,
  misconceptions: { type: 'array', items: strictMisconception },
  mastery: strictObject({ skills: { type: 'array', items: strictString }, threshold: strictNumber }),
});

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
  currentConfiguredModel: 'deepseek-chat';
  responsesSupportedModels: readonly ['deepseek-flash', 'deepseek-v4-pro'];
  unsupportedFeatures: string[];
  diagnostic: string;
  estimatedMultiOutputCallsPerTopic: number;
  estimatedWorstCaseCallsPerTopic: number;
};

/** Provider-free request shape for a future Responses API migration. It is
 * deliberately not used by the deployed path; the application validators
 * remain authoritative for nested fields and array cardinality. */
export function stagingResponsesJsonSchemaPrototype() {
  return {
    model: 'deepseek-flash',
    input: '<level prompt>',
    reasoning: { effort: 'none' },
    max_output_tokens: 4096,
    temperature: 0,
    text: {
      format: {
        type: 'json_schema',
        name: 'staging_level_compact_v1',
        schema: STAGING_LEVEL_STRICT_SCHEMA,
      },
    },
  } as const;
}

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
 * A strict one-level object would preserve the intended call budget: four
 * initial level calls and at most one JSON retry per level, hence eight total.
 * It is not activated until the provider model and transport are migrated and
 * verified. This is not a claim that JSON mode itself enforces the schema.
 */
export function assessDeepSeekStrictSchemaCompatibility(): StrictSchemaCompatibility {
  return {
    compatible: false,
    endpoint: DEEPSEEK_CHAT_COMPLETIONS_ENDPOINT,
    mode: 'chat_json_object',
    currentConfiguredModel: 'deepseek-chat',
    responsesSupportedModels: ['deepseek-flash', 'deepseek-v4-pro'],
    unsupportedFeatures: [
      'The current ai-chat adapter sends Chat Completions /v1/chat/completions with response_format=json_object only.',
      'The configured model is deepseek-chat; the current Responses API documentation lists deepseek-flash and deepseek-v4-pro.',
      'The adapter does not select the beta /beta endpoint or send a strict function tool.',
      'DeepSeek strict schemas do not support minItems/maxItems; application validation must keep question-count rules.',
    ],
    diagnostic: 'A strict one-level object is compatible in principle with a Responses/tool transport, but the configured model and current Chat Completions adapter are not yet a verified path. Application-side validation remains mandatory.',
    estimatedMultiOutputCallsPerTopic: 4,
    estimatedWorstCaseCallsPerTopic: 8,
  };
}
