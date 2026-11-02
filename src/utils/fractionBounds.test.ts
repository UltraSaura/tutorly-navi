import { describe, expect, it } from "vitest";
import { evaluateFractionBounds } from "./fractionBounds";

describe("fraction bounds", () => {
  it("accepts strict bounds between fractions", () => {
    expect(evaluateFractionBounds("Encadrer 7/3 entre 2 fractions", "2/1 et 5/2")).toMatchObject({
      isCorrect: true,
    });
  });

  it("rejects an equal fraction as a strict bound", () => {
    expect(evaluateFractionBounds("Encadrer 7/3 entre 2 fractions", "7/2 et 7/3")).toMatchObject({
      isCorrect: false,
      lower: null,
    });
  });

  it("accepts equivalent representations when both sides are strict", () => {
    expect(evaluateFractionBounds("Encadrer 7/3 entre 2 fractions", "4/2 et 7/2")).toMatchObject({
      isCorrect: true,
    });
  });
});
