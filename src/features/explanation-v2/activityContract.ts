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
const algebraTiles = z.object({
  ...common,
  kind: z.literal('algebra-tiles'),
  target: z.object({ x: z.number().int().min(0).max(4), units: z.number().int().min(0).max(6) })
    .refine(v => v.x + v.units > 0, 'Expression cannot be empty'),
});
const linearFunction = z.object({
  ...common,
  kind: z.literal('linear-function'),
  target: z.object({ m: z.number().int().min(-3).max(3), b: z.number().int().min(-3).max(3) })
    .refine(v => Math.abs(v.m + v.b) <= 5, 'Second handle must fit on graph'),
});
const lineFit = z.object({
  ...common,
  kind: z.literal('line-fit'),
  points: z.array(z.object({
    x: z.number().int().min(-4).max(4),
    y: z.number().min(-5).max(5),
  })).min(3).max(8).refine(points => new Set(points.map(p => p.x)).size === points.length,
    'Data points must have distinct x values'),
}).refine(v => {
  const meanX = v.points.reduce((a, p) => a + p.x, 0) / v.points.length;
  const meanY = v.points.reduce((a, p) => a + p.y, 0) / v.points.length;
  const denominator = v.points.reduce((a, p) => a + (p.x - meanX) ** 2, 0);
  const m = v.points.reduce((a, p) => a + (p.x - meanX) * (p.y - meanY), 0) / denominator;
  const b = meanY - m * meanX;
  return Number.isFinite(m) && Number.isFinite(b) && m >= -3 && m <= 3 && b >= -3 && b <= 3;
}, 'Best-fit line must be within interactive controls');
export const InteractiveActivitySchema = z.union([fraction, coordinate, fractionSelect, algebraTiles, linearFunction, lineFit]);
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
};
export const initialActivityProgress = (): ActivityProgress => ({
  phase: 0, input: '', selectedParts: [], x: 0, y: 0, attempts: 0, hintsUsed: 0, phaseHints: 0, completed: false, feedback: '', correct: null,
});
