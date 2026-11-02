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

  it("accepts integer bounds when the task only asks for two bounds", () => {
    expect(evaluateFractionBounds("Encadrer 7/3 entre 2 fractions", "2 et 3")).toMatchObject({
      isCorrect: true,
    });
  });

  it("accepts the same two bounds in reverse order because the answer has no bound fields", () => {
    expect(evaluateFractionBounds("Encadrer 7/3 entre 2 fractions", "3 et 2")).toMatchObject({
      isCorrect: true,
    });
  });

  it("rejects extra values instead of silently selecting a valid pair", () => {
    expect(evaluateFractionBounds("Encadrer 7/3 entre 2 fractions", "2 et 3 et 4")).toMatchObject({
      isCorrect: false,
    });
  });
});
