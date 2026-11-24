import { z } from 'zod';
const unitFraction = z.object({
  n: z.number().int().min(0).max(12),
  d: z.number().int().min(1).max(12),
}).refine(v => v.n <= v.d, 'Numerator must not exceed denominator');
const common = {
  schemaVersion: z.literal(1),
  id: z.string().min(1).max(120),
  title: z.string().min(1).max(120),
  prompt: z.string().min(1).max(400),
  schoolLevel: z.enum(['CE1', 'CE2', 'CM1', 'CM2', '6e', '5e', '4e', '3e', '2nde', '1re', 'terminale']).optional(),
};
const fraction = z.object({
  ...common,
  kind: z.literal('fraction-bar'),
  left: unitFraction,
  right: unitFraction,
  targetDenominator: z.number().int().min(2).max(12),
}).superRefine((v, ctx) => {
  if (v.targetDenominator !== v.left.d || v.targetDenominator % v.right.d !== 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'MVP requires left denominator = target and divisible right denominator' });
  }
});
/** A student constructs a fraction by selecting the required number of equal parts. */
const fractionSelect = z.object({
  ...common,
  kind: z.literal('fraction-select'),
  target: z.object({
    n: z.number().int().min(0).max(12),
    d: z.number().int().min(2).max(12),
  }).refine(v => v.n <= v.d, 'Selected numerator cannot exceed denominator'),
});
const coordinate = z.object({
  ...common,
  kind: z.literal('coordinate-plane'),
  target: z.object({ x: z.number().int().min(-5).max(5), y: z.number().int().min(-5).max(5) }),
});
export const InteractiveActivitySchema = z.union([fraction, coordinate, fractionSelect]);
export type InteractiveActivitySpec = z.infer<typeof InteractiveActivitySchema>;
export type ActivityProgress = {
  phase: number;
  input: string;
  selectedParts?: number[];
  x: number;
  y: number;
  attempts: number;
  hintsUsed: number;
  phaseHints: number;
  completed: boolean;
  feedback: string;
  correct: boolean | null;
};
export const initialActivityProgress = (): ActivityProgress => ({
  phase: 0, input: '', selectedParts: [], x: 0, y: 0, attempts: 0, hintsUsed: 0, phaseHints: 0, completed: false, feedback: '', correct: null,
});
