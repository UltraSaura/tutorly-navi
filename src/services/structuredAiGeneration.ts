import { supabase } from '@/integrations/supabase/client';
import {
  structuredCurriculumContextSchema,
  structuredGenerationKindSchema,
  structuredLearningGenerationSchema,
  type StructuredGenerationRequest,
  type StructuredLearningGeneration,
} from '@/types/structured-ai';

function sanitizeOptional(value: string | undefined, max: number): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
}

export async function generateStructuredLearningContent(
  input: StructuredGenerationRequest,
): Promise<StructuredLearningGeneration> {
  const kind = structuredGenerationKindSchema.parse(input.kind);
  const context = structuredCurriculumContextSchema.parse(input.context);
  const payload = {
    kind,
    context,
    count: input.count ? Math.max(1, Math.min(8, Math.round(input.count))) : undefined,
    difficulty: input.difficulty ? Math.max(1, Math.min(5, Math.round(input.difficulty))) : undefined,
    masteryLevel: input.masteryLevel,
    studentNeed: sanitizeOptional(input.studentNeed, 600),
    originalQuestion: sanitizeOptional(input.originalQuestion, 1600),
    incorrectAnswer: sanitizeOptional(input.incorrectAnswer, 800),
    modelId: sanitizeOptional(input.modelId, 100),
  };

  const { data, error } = await supabase.functions.invoke('structured-learning-generation', { body: payload });
  if (error) throw new Error(error.message || 'Structured learning generation failed');

  const parsed = structuredLearningGenerationSchema.safeParse(data);
  if (!parsed.success) {
    if (import.meta.env.DEV) console.warn('[StructuredAI] rejected invalid generated payload', parsed.error.flatten());
    throw new Error('AI returned invalid structured learning content');
  }
  if (parsed.data.kind !== kind) throw new Error('AI returned the wrong generation kind');
  return parsed.data;
}
