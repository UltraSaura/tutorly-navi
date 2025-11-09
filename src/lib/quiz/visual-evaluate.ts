import type {
  VisualUnion,
  VisualGrid,
  VisualPie,
  VisualShapeSelect,
  VisualLineRelation,
  VisualAngle,
} from "./visual-types";

function setsEqual<T>(a: Set<T>, b: Set<T>) {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

// The student's answer format per subtype:
// pie:          string[] of selected segment ids
// grid:         string[] of selected cell ids like "r1c2"
// shape_select: string[] of selected shape ids
// line_relation:string[] of selected pair ids
// angle:        number (degrees)

export function evaluateVisual(visual: VisualUnion, answer: unknown): boolean {
  switch (visual.subtype) {
    case "pie": {
      const v = visual as VisualPie;
      const selected = new Set<string>(Array.isArray(answer) ? (answer as string[]) : []);
      const correctIds = new Set(v.segments.filter((s) => s.correct).map((s) => s.id));
      return setsEqual(selected, correctIds);
    }
    case "grid": {
      const v = visual as VisualGrid;
      const selected = new Set<string>(Array.isArray(answer) ? (answer as string[]) : []);
      if (v.correctCells && v.correctCells.length > 0) {
        const corr = new Set(v.correctCells);
        return setsEqual(selected, corr);
      }
      if (v.requiredCount != null) {
        return selected.size === v.requiredCount;
      }
      return false;
    }
    case "shape_select": {
      const v = visual as VisualShapeSelect;
      const selected = new Set<string>(Array.isArray(answer) ? (answer as string[]) : []);
      const correctIds = new Set(v.shapes.filter((s) => s.correct).map((s) => s.id));
      return setsEqual(selected, correctIds);
    }
    case "line_relation": {
      const v = visual as VisualLineRelation;
      const selected = new Set<string>(Array.isArray(answer) ? (answer as string[]) : []);
      const correctIds = new Set(v.pairs.filter((p) => p.relation === v.target).map((p) => p.id));
      return setsEqual(selected, correctIds);
    }
    case "angle": {
      const v = visual as VisualAngle;
      if (v.multi) {
        const selectedArray = Array.isArray(answer) ? (answer as string[]) : [];
        const selected = new Set<string>(selectedArray);
        const correctIds = new Set<string>();
        if (v.baseCorrect) correctIds.add("base");
        (v.variants ?? [])
          .filter((variant) => variant.correct)
          .forEach((variant) => correctIds.add(variant.id));
        return setsEqual(selected, correctIds);
      }
      const num = typeof answer === "number" ? (answer as number) : Number.NaN;
      if (Number.isNaN(num)) return false;
      const angles = [
        { targetDeg: v.targetDeg, toleranceDeg: v.toleranceDeg },
        ...(v.variants ?? []).map((variant) => ({
          targetDeg: variant.targetDeg,
          toleranceDeg: variant.toleranceDeg,
        })),
      ];
      return angles.some(({ targetDeg, toleranceDeg }) => Math.abs(num - targetDeg) <= toleranceDeg);
    }
    default:
      return false;
  }
}
