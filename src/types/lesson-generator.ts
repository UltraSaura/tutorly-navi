import { z } from 'zod';
import { validateLessonV21 } from './lesson-v21-contract';

const base = { id: z.string().min(1) };

export const LessonBlockSchema = z.discriminatedUnion('type', [
  z.object({ ...base, type: z.literal('hook'), title: z.string(), content: z.string() }),
  z.object({ ...base, type: z.literal('concept'), title: z.string(), content: z.string() }),
  z.object({ ...base, type: z.literal('visual'), title: z.string(), content: z.string(), visual: z.object({ kind: z.enum(['number_line','groups','timeline','clock','comparison','part_whole','table','equation','diagram','sequence']), data: z.unknown() }) }),
  z.object({ ...base, type: z.literal('prediction'), question: z.string(), choices: z.array(z.string()).min(2).optional(), correct_answer: z.unknown(), hint: z.string().optional(), hints: z.array(z.string()).default([]), success_feedback: z.string().optional(), error_feedback: z.string().optional(), explanation: z.string() }),
  z.object({ ...base, type: z.literal('guided_example'), context: z.string(), steps: z.array(z.object({ instruction: z.string(), representation: z.string().optional(), reason: z.string() })).min(1) }),
  z.object({ ...base, type: z.literal('student_try'), question: z.string(), answer_type: z.enum(['multiple_choice','numeric','text','selection','ordering']), choices: z.array(z.string()).optional(), correct_answer: z.unknown(), hints: z.array(z.string()).default([]), success_feedback: z.string(), error_feedback: z.string() }),
  z.object({ ...base, type: z.literal('feedback_checkpoint'), question: z.string(), answer_type: z.enum(['multiple_choice','numeric','text','selection','ordering']), choices: z.array(z.string()).optional(), correct_answer: z.unknown(), hints: z.array(z.string()).default([]), success_feedback: z.string(), error_feedback: z.string() }),
  z.object({ ...base, type: z.literal('contrast'), title: z.string(), left: z.string(), right: z.string(), explanation: z.string() }),
  z.object({ ...base, type: z.literal('rule'), title: z.string(), content: z.string(), representation: z.string().optional() }),
  z.object({ ...base, type: z.literal('worked_example'), context: z.string(), steps: z.array(z.union([z.string(), z.object({ instruction: z.string(), representation: z.string().optional(), reason: z.string() })])).min(1), conclusion: z.string() }),
  z.object({ ...base, type: z.literal('reflection'), question: z.string(), expected_idea: z.string() }),
  z.object({ ...base, type: z.literal('mastery_check'), hints: z.array(z.string()).default([]), questions: z.array(z.object({ id: z.string(), question: z.string(), answer_type: z.enum(['multiple_choice','numeric','text','selection','ordering']), choices: z.array(z.string()).optional(), correct_answer: z.unknown(), skill: z.string(), difficulty: z.union([z.string(), z.number()]), success_feedback: z.string(), error_feedback: z.string() })).min(1).max(4) }),
]);

export type LessonBlock = z.infer<typeof LessonBlockSchema>;

export const LessonV2Schema = z.object({
  version: z.literal('2.0'),
  lesson_goal: z.string(),
  success_criteria: z.array(z.string()).min(1).max(3),
  prerequisites: z.array(z.object({ id: z.string(), description: z.string(), check_question: z.string(), expected_answer: z.string(), remediation_hint: z.string() })).min(1).max(4),
  sequence: z.array(LessonBlockSchema).min(1),
  misconceptions: z.array(z.object({ id: z.string(), description: z.string(), detect_if: z.string(), feedback: z.string(), remediation_strategy: z.string() })),
  mastery: z.object({ skills: z.array(z.string()), threshold: z.number().min(0).max(1) }),
});

export type LessonV2 = z.infer<typeof LessonV2Schema>;

export type LessonV21 = {
  version: '2.1'; topic_goal: string; levels: LessonLevelV21[];
};
export type LessonLevelV21 = {
  id: string; level_number: number; title: string; purpose: string; difficulty: string;
  objective_ids: string[];
  lesson: {
    lesson_goal: string; success_criteria: string[]; prerequisites: Array<Record<string, unknown>>;
    sequence: LessonBlock[]; misconceptions: Array<Record<string, unknown>>;
    mastery: { skills: string[]; threshold: number };
  };
};

// Runtime validity is owned exclusively by validateLessonV21. This schema is
// a typed Zod adapter and cannot introduce a second, stricter contract.
export const LessonLevelV21Schema = z.custom<LessonLevelV21>((value) => validateLessonV21({ version: '2.1', topic_goal: 'adapter', levels: [value] }).success);
export const LessonV21Schema = z.custom<LessonV21>((value) => validateLessonV21(value).success);

export function parseLessonContent(value: unknown): LessonV2 | null {
  const result = LessonV2Schema.safeParse(value);
  if (result.success) return result.data;
  // AI providers may add harmless block-specific fields or vary scalar
  // representations (for example difficulty 1 vs "1"). Keep the required
  // V2 envelope strict while normalizing those compatible representations so
  // a valid persisted lesson can never fall through to the legacy blank shell.
  if (value && typeof value === 'object') {
    const candidate = value as Record<string, unknown>;
    const sequence = candidate.sequence;
    if (candidate.version === '2.0'
      && typeof candidate.lesson_goal === 'string'
      && Array.isArray(candidate.success_criteria)
      && Array.isArray(candidate.prerequisites)
      && Array.isArray(sequence) && sequence.length > 0
      && Array.isArray(candidate.misconceptions)
      && candidate.mastery && typeof candidate.mastery === 'object') {
      const normalized = {
        ...candidate,
        sequence: sequence.map((block, index) => ({ ...(block as Record<string, unknown>), id: String((block as Record<string, unknown>)?.id || `block-${index + 1}`) })),
        mastery: { ...(candidate.mastery as Record<string, unknown>), threshold: Number((candidate.mastery as Record<string, unknown>).threshold ?? 0.8) },
      };
      const retry = LessonV2Schema.safeParse(normalized);
      if (retry.success) return retry.data;
      const supportedTypes = new Set(['hook','concept','visual','prediction','guided_example','student_try','feedback_checkpoint','contrast','rule','worked_example','reflection','mastery_check']);
      if (sequence.every((block) => {
        const item = block as Record<string, unknown>;
        return typeof item.type === 'string' && supportedTypes.has(item.type) && typeof item.id === 'string';
      }) && typeof (candidate.mastery as Record<string, unknown>).threshold === 'number') {
        // The persisted payload has the complete V2 envelope and only differs
        // in an optional provider-specific field. Keep it on the V2 player;
        // unsupported optional fields are handled by the block fallback UI.
        return normalized as unknown as LessonV2;
      }
      if (import.meta.env?.DEV) console.debug('[LessonV2] compatible payload rejected', retry.error.issues);
    }
  }
  if (import.meta.env?.DEV) console.debug('[LessonV2] invalid lesson payload', result.error.issues);
  return null;
}

export function parseLessonV21(value: unknown): LessonV21 | null {
  const contract = validateLessonV21(value);
  return contract.success ? value as LessonV21 : null;
}
