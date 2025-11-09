import { describe, expect, test } from "vitest";
import { evaluateVisual } from "@/lib/quiz/visual-evaluate";
import type { VisualUnion } from "@/lib/quiz/visual-types";

describe("visual evaluate", () => {
  test("pie exact match", () => {
    const v: VisualUnion = {
      subtype: "pie",
      segments: [
        { id: "a", value: 0.25, correct: true },
        { id: "b", value: 0.5 },
        { id: "c", value: 0.25, correct: true },
      ],
    };
    expect(evaluateVisual(v, ["a", "c"])).toBe(true);
    expect(evaluateVisual(v, ["a"])).toBe(false);
  });

  test("grid pattern vs count", () => {
    const pattern: VisualUnion = {
      subtype: "grid",
      rows: 2,
      cols: 2,
      correctCells: ["r0c0", "r0c1"],
      multi: true,
    };
    expect(evaluateVisual(pattern, ["r0c0", "r0c1"])).toBe(true);
    expect(evaluateVisual(pattern, ["r0c0"])).toBe(false);

    const count: VisualUnion = {
      subtype: "grid",
      rows: 2,
      cols: 3,
      requiredCount: 3,
      multi: true,
    };
    expect(evaluateVisual(count, ["r0c0", "r0c1", "r1c0"])).toBe(true);
    expect(evaluateVisual(count, ["r0c0", "r0c1"])).toBe(false);
  });

  test("shape_select exact match", () => {
    const v: VisualUnion = {
      subtype: "shape_select",
      shapes: [
        { id: "r", type: "rect", rect: { x: 0, y: 0, w: 10, h: 10 }, correct: true },
        { id: "c", type: "circle", circle: { cx: 20, cy: 20, r: 5 } },
        { id: "t", type: "triangle", triangle: { points: [0, 0, 5, 10, 10, 0] }, correct: true },
      ],
    };
    expect(evaluateVisual(v, ["r", "t"])).toBe(true);
    expect(evaluateVisual(v, ["r"])).toBe(false);
  });

  test("line_relation select all that apply", () => {
    const v: VisualUnion = {
      subtype: "line_relation",
      target: "perpendicular",
      multi: true,
      pairs: [
        {
          id: "p1",
          a: { x1: -10, y1: 0, x2: 10, y2: 0 },
          b: { x1: 0, y1: -10, x2: 0, y2: 10 },
          relation: "perpendicular",
        },
        {
          id: "p2",
          a: { x1: -10, y1: -10, x2: 10, y2: 10 },
          b: { x1: -10, y1: 10, x2: 10, y2: -10 },
          relation: "perpendicular",
        },
        {
          id: "p3",
          a: { x1: -10, y1: 5, x2: 10, y2: 5 },
          b: { x1: -10, y1: 8, x2: 10, y2: 8 },
          relation: "parallel",
        },
      ],
    };
    expect(evaluateVisual(v, ["p1", "p2"])).toBe(true);
    expect(evaluateVisual(v, ["p1"])).toBe(false);
  });

  test("angle tolerance check", () => {
    const v: VisualUnion = {
      subtype: "angle",
      aDeg: 0,
      bDeg: 60,
      targetDeg: 60,
      toleranceDeg: 2,
    };
    expect(evaluateVisual(v, 60)).toBe(true);
    expect(evaluateVisual(v, 58)).toBe(true);
    expect(evaluateVisual(v, 56)).toBe(false);
  });

  test("angle multi variants accepted", () => {
    const v: VisualUnion = {
      subtype: "angle",
      multi: true,
      baseCorrect: true,
      aDeg: 0,
      bDeg: 90,
      targetDeg: 90,
      toleranceDeg: 2,
      variants: [
        {
          id: "v1",
          aDeg: 0,
          bDeg: 30,
          targetDeg: 30,
          toleranceDeg: 2,
        },
        {
          id: "v2",
          aDeg: 0,
          bDeg: 180,
          targetDeg: 180,
          toleranceDeg: 3,
          correct: true,
        },
      ],
    };
    expect(evaluateVisual(v, ["base", "v2"])).toBe(true);
    expect(evaluateVisual(v, ["base"])).toBe(false);
    expect(evaluateVisual(v, ["v2"])).toBe(false);
    expect(evaluateVisual(v, ["base", "v1"])).toBe(false);
  });
});
