export const DEEPSEEK_RESPONSES_ENDPOINT = 'https://api.deepseek.com/responses';

export type DeepSeekResponsesSchema = Record<string, unknown>;

export function shouldUseDeepSeekResponsesJsonSchema(args: {
  requestMode?: unknown;
  useResponsesJsonSchema?: unknown;
  responsesJsonSchemaEnabled?: string | undefined;
  responsesModel?: unknown;
  structuredOutputSchema?: unknown;
}): args is {
  requestMode: 'lessonGeneration';
  useResponsesJsonSchema: true;
  responsesJsonSchemaEnabled: 'true';
  responsesModel: 'deepseek-flash' | 'deepseek-v4-pro';
  structuredOutputSchema: DeepSeekResponsesSchema;
} {
  return args.requestMode === 'lessonGeneration'
    && args.useResponsesJsonSchema === true
    && args.responsesJsonSchemaEnabled === 'true'
    && (args.responsesModel === 'deepseek-flash' || args.responsesModel === 'deepseek-v4-pro')
    && !!args.structuredOutputSchema
    && typeof args.structuredOutputSchema === 'object'
    && !Array.isArray(args.structuredOutputSchema);
}

export type DeepSeekResponsesMetadata = {
  choiceCount: number;
  finishReason: string;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  contentLength: number;
};

export function buildDeepSeekResponsesRequest(args: {
  model: 'deepseek-flash' | 'deepseek-v4-pro';
  instructions: unknown;
  input: unknown;
  schema: DeepSeekResponsesSchema;
  maxOutputTokens: number;
  temperature: number;
}) {
  const instructions = typeof args.instructions === 'string'
    ? args.instructions
    : args.instructions && typeof args.instructions === 'object' && typeof (args.instructions as Record<string, unknown>).content === 'string'
      ? (args.instructions as Record<string, unknown>).content as string
      : '';
  return {
    model: args.model,
    instructions,
    input: args.input,
    reasoning: { effort: 'none' },
    max_output_tokens: args.maxOutputTokens,
    temperature: args.temperature,
    text: {
      format: {
        type: 'json_schema',
        name: 'staging_level_compact_v1',
        schema: args.schema,
      },
    },
  };
}

/** Extract only the output text from a Responses envelope. Never includes
 * provider content in thrown errors or diagnostics. */
export function extractDeepSeekResponsesContent(payload: Record<string, unknown>): { content: string; metadata: DeepSeekResponsesMetadata } {
  const output = Array.isArray(payload.output) ? payload.output : [];
  const message = output.find((item) => item && typeof item === 'object' && (item as Record<string, unknown>).type === 'message') as Record<string, unknown> | undefined;
  const parts = message && Array.isArray(message.content) ? message.content : [];
  const textPart = parts.find((item) => item && typeof item === 'object' && (item as Record<string, unknown>).type === 'output_text') as Record<string, unknown> | undefined;
  const content = typeof textPart?.text === 'string' ? textPart.text : '';
  const status = typeof payload.status === 'string' ? payload.status : 'unknown';
  if (status !== 'completed') throw new Error(`DeepSeek Responses API returned non-completed status: ${status}.`);
  if (!content) throw new Error('DeepSeek Responses API returned no structured output text.');
  const usage = payload.usage && typeof payload.usage === 'object' ? payload.usage as Record<string, unknown> : {};
  return {
    content,
    metadata: {
      choiceCount: message ? 1 : 0,
      finishReason: status === 'completed' ? 'stop' : status,
      promptTokens: typeof usage.input_tokens === 'number' ? usage.input_tokens : null,
      completionTokens: typeof usage.output_tokens === 'number' ? usage.output_tokens : null,
      totalTokens: typeof usage.total_tokens === 'number' ? usage.total_tokens : null,
      contentLength: content.length,
    },
  };
}
