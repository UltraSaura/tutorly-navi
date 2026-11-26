import { z } from 'zod';
const unitFraction = z.object({
  n: z.number().int().min(0).max(12),
  d: z.number().int().min(1).max(12),
}).refine(v => v.n <= v.d, 'Numerator must not exceed denominator');
const transferFraction = z.object({
  n: z.number().int().min(0).max(12), d: z.number().int().min(1).max(12),
}).refine(v => v.n <= v.d, 'Transfer numerator cannot exceed denominator');
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
  transfer: z.object({ left: transferFraction, right: transferFraction, targetDenominator: z.number().int().min(2).max(12) }).optional(),
}).superRefine((v, ctx) => {
  if (v.targetDenominator !== v.left.d || v.targetDenominator % v.right.d !== 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'MVP requires left denominator = target and divisible right denominator' });
  }
  if (v.transfer && (v.transfer.targetDenominator !== v.transfer.left.d || v.transfer.targetDenominator % v.transfer.right.d !== 0)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Transfer fractions must use a valid common denominator' });
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
  transfer: z.object({ n: z.number().int().min(0).max(12), d: z.number().int().min(2).max(12) })
    .refine(v => v.n <= v.d, 'Transfer numerator cannot exceed denominator').optional(),
});
const coordinate = z.object({
  ...common,
  kind: z.literal('coordinate-plane'),
  target: z.object({ x: z.number().int().min(-5).max(5), y: z.number().int().min(-5).max(5) }),
  transfer: z.object({ x: z.number().int().min(-5).max(5), y: z.number().int().min(-5).max(5) }).optional(),
});
const algebraTiles = z.object({
  ...common,
  kind: z.literal('algebra-tiles'),
  target: z.object({ x: z.number().int().min(0).max(4), units: z.number().int().min(0).max(6) })
    .refine(v => v.x + v.units > 0, 'Expression cannot be empty'),
  transfer: z.object({ x: z.number().int().min(0).max(4), units: z.number().int().min(0).max(6) })
    .refine(v => v.x + v.units > 0, 'Transfer expression cannot be empty').optional(),
});
const linearFunction = z.object({
  ...common,
  kind: z.literal('linear-function'),
  target: z.object({ m: z.number().int().min(-3).max(3), b: z.number().int().min(-3).max(3) })
    .refine(v => Math.abs(v.m + v.b) <= 5, 'Second handle must fit on graph'),
  transfer: z.object({ m: z.number().int().min(-3).max(3), b: z.number().int().min(-3).max(3) })
    .refine(v => Math.abs(v.m + v.b) <= 5, 'Transfer handle must fit on graph').optional(),
});
const lineFit = z.object({
  ...common,
  kind: z.literal('line-fit'),
  points: z.array(z.object({
    x: z.number().int().min(-4).max(4),
    y: z.number().min(-5).max(5),
  })).min(3).max(8).refine(points => new Set(points.map(p => p.x)).size === points.length,
    'Data points must have distinct x values'),
  interpretation: z.object({ examplePointIndex: z.number().int().min(0).max(7), questionPointIndex: z.number().int().min(0).max(7) }).optional(),
}).superRefine((v, ctx) => {
  const meanX = v.points.reduce((a, p) => a + p.x, 0) / v.points.length;
  const meanY = v.points.reduce((a, p) => a + p.y, 0) / v.points.length;
  const denominator = v.points.reduce((a, p) => a + (p.x - meanX) ** 2, 0);
  const m = v.points.reduce((a, p) => a + (p.x - meanX) * (p.y - meanY), 0) / denominator;
  const b = meanY - m * meanX;
  if (!(Number.isFinite(m) && Number.isFinite(b) && m >= -3 && m <= 3 && b >= -3 && b <= 3)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Best-fit line must be within interactive controls' });
  }
  if (v.interpretation && (v.interpretation.examplePointIndex >= v.points.length || v.interpretation.questionPointIndex >= v.points.length || v.interpretation.examplePointIndex === v.interpretation.questionPointIndex)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Interpretation points must be distinct valid point indexes' });
  }
});
/** Unique-solution bounded linear equations, including negative coefficients and rational answers. */
const equationDecomposition = z.object({
  ...common,
  kind: z.literal('equation-decomposition'),
  a: z.number().int().min(-8).max(8),
  b: z.number().int().min(-20).max(20),
  c: z.number().int().min(-20).max(20),
  d: z.number().int().min(-8).max(8).optional(),
  transfer: z.object({ a: z.number().int().min(-8).max(8), b: z.number().int().min(-20).max(20), c: z.number().int().min(-20).max(20), d: z.number().int().min(-8).max(8).optional() }).optional(),
}).superRefine((v, ctx) => {
  if (v.a === (v.d ?? 0)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Equation must have a unique solution' });
  if (v.transfer && v.transfer.a === (v.transfer.d ?? 0)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Transfer equation must have a unique solution' });
});

export const InteractiveActivitySchema = z.union([fraction, coordinate, fractionSelect, algebraTiles, linearFunction, lineFit, equationDecomposition]);
export type InteractiveActivitySpec = z.infer<typeof InteractiveActivitySchema>;
export type ActivityProgress = {
  phase: number;
  input: string;
  selectedParts?: number[];
  tileCounts?: { x: number; units: number };
  slope?: number;
  intercept?: number;
  x: number;
  y: number;
  attempts: number;
  hintsUsed: number;
  phaseHints: number;
  completed: boolean;
  feedback: string;
  correct: boolean | null;
  /** Has the learner used guided or worked-solution assistance? */
  assisted?: boolean;
  /** Separate mode and transfer evidence; kept with activity progress across mode switches. */
  learningEvidence?: {
    exposure: boolean;
    guidedCompleted: boolean;
    assisted: boolean;
    independent: boolean;
    transfer: boolean;
    disclosedItems: string[];
    transferAttempts: number;
    transferHintsUsed: number;
  };
  /** Mode-scoped equation state and historical assessment evidence. */
  equationModes?: {
    guidedCompleted: boolean;
    soloCompleted: boolean;
    soloAttempts: number;
    soloHintsUsed: number;
    independentEvidence: boolean;
    assistedEvidence: boolean;
    soloFeedback: string;
    soloCorrect: boolean | null;
    guidedFeedback: string;
    guidedCorrect: boolean | null;
    soloPhase?: 'original' | 'transfer';
    soloBaseCompleted?: boolean;
    soloTransferAttempts?: number;
    soloTransferHintsUsed?: number;
  };
};
export const initialActivityProgress = (): ActivityProgress => ({
  phase: 0, input: '', selectedParts: [], x: 0, y: 0, attempts: 0, hintsUsed: 0, phaseHints: 0, completed: false, feedback: '', correct: null,
});

export const initialLearningEvidence = (): NonNullable<ActivityProgress['learningEvidence']> => ({
  exposure: false, guidedCompleted: false, assisted: false, independent: false, transfer: false, disclosedItems: [], transferAttempts: 0, transferHintsUsed: 0,
});

export function learningEvidence(p: ActivityProgress) {
  return { ...initialLearningEvidence(), ...p.learningEvidence };
}

export function discloseLearningItem(p: ActivityProgress, item: string) {
  const evidence = learningEvidence(p);
  return { ...evidence, disclosedItems: evidence.disclosedItems.includes(item) ? evidence.disclosedItems : [...evidence.disclosedItems, item] };
}
