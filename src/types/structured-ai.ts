import { z } from 'zod';
import type { PedagogicalAgeBand } from '@/config/ageConfig';

export const structuredGenerationKindSchema = z.enum(['exercise_set', 'hint', 'remediation', 'contextual_problem']);
export type StructuredGenerationKind = z.infer<typeof structuredGenerationKindSchema>;

export const structuredCurriculumContextSchema = z.object({
  subjectId: z.string().min(1).max(120),
  subjectName: z.string().min(1).max(160),
  conceptId: z.string().min(1).max(180),
  conceptName: z.string().min(1).max(240),
  objectiveId: z.string().max(180).optional(),
  objectiveText: z.string().max(600).optional(),
  ageBand: z.enum(['early_primary', 'upper_primary', 'middle_school', 'high_school']),
  schoolLevel: z.string().max(80).optional(),
  language: z.enum(['fr', 'en']),
  curriculumEvidence: z.array(z.string().min(1).max(800)).max(12).default([]),
});

export type StructuredCurriculumContext = Omit<z.infer<typeof structuredCurriculumContextSchema>, 'ageBand'> & { ageBand: PedagogicalAgeBand };

const choiceSchema = z.object({ id: z.string().min(1).max(40), text: z.string().min(1).max(500) });
const exerciseSchema = z.object({
  id: z.string().min(1).max(80),
  prompt: z.string().min(1).max(1200),
  answerType: z.enum(['multiple_choice', 'short_answer', 'numeric', 'ordering', 'open_response']),
  choices: z.array(choiceSchema).max(8).optional(),
  correctAnswer: z.union([z.string().max(800), z.number(), z.array(z.string().max(200)).max(12)]).optional(),
  explanation: z.string().min(1).max(1200),
  hint: z.string().min(1).max(600),
  masteryLevel: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  difficulty: z.number().int().min(1).max(5),
  tags: z.array(z.string().min(1).max(80)).max(8).default([]),
});

export const structuredExerciseSetSchema = z.object({
  kind: z.literal('exercise_set'),
  exercises: z.array(exerciseSchema).min(1).max(8),
  groundingNote: z.string().min(1).max(500),
});

export const structuredHintSchema = z.object({
  kind: z.literal('hint'),
  hint: z.object({
    text: z.string().min(1).max(700),
    strategy: z.string().min(1).max(500),
    revealLevel: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    avoidsFinalAnswer: z.boolean(),
  }),
  groundingNote: z.string().min(1).max(500),
});

export const structuredRemediationSchema = z.object({
  kind: z.literal('remediation'),
  remediation: z.object({
    misconception: z.string().min(1).max(600),
    explanation: z.string().min(1).max(1200),
    steps: z.array(z.string().min(1).max(500)).min(1).max(6),
    checkQuestion: z.string().min(1).max(800),
    checkAnswer: z.string().min(1).max(500),
  }),
  groundingNote: z.string().min(1).max(500),
});

export const structuredContextualProblemSchema = z.object({
  kind: z.literal('contextual_problem'),
  problem: z.object({
    prompt: z.string().min(1).max(1400),
    expectedMethod: z.string().min(1).max(900),
    answer: z.string().min(1).max(700),
    hints: z.array(z.string().min(1).max(500)).min(1).max(4),
    transferContext: z.string().min(1).max(500),
  }),
  groundingNote: z.string().min(1).max(500),
});

export const structuredLearningGenerationSchema = z.discriminatedUnion('kind', [
  structuredExerciseSetSchema,
  structuredHintSchema,
  structuredRemediationSchema,
  structuredContextualProblemSchema,
]);

export type StructuredLearningGeneration = z.infer<typeof structuredLearningGenerationSchema>;

export interface StructuredGenerationRequest {
  kind: StructuredGenerationKind;
  context: StructuredCurriculumContext;
  count?: number;
  difficulty?: number;
  masteryLevel?: 1 | 2 | 3 | 4;
  studentNeed?: string;
  originalQuestion?: string;
  incorrectAnswer?: string;
  modelId?: string;
}
