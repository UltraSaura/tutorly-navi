import { describe, expect, it } from "vitest";
import { localGrade } from "./localMathGrader";

describe("localMathGrader", () => {
  it("grades fraction bounds as a bounds task", () => {
    expect(localGrade("Encadrer 7/3 entre deux entiers consécutifs", "2 et 3")).toMatchObject({
      isCorrect: true,
      correctAnswer: "2 et 3",
      confidence: "high",
    });
  });

  it("rejects non-consecutive or incorrect fraction bounds", () => {
    expect(localGrade("Encadrer 7/3 entre deux entiers", "2 et 4")).toMatchObject({ isCorrect: false });
    expect(localGrade("Encadrer 7/3 entre deux entiers consécutifs", "2 et 5")).toMatchObject({ isCorrect: false });
  });

  it("rejects an equal fraction in a strict fraction bound without AI fallback", () => {
    expect(localGrade("Encadrer 7/3 entre 2 fractions", "7/2 et 7/3")).toMatchObject({
      isCorrect: false,
      confidence: "high",
    });
  });

  it("rejects integer-only bounds when fractions are explicitly requested", () => {
    expect(localGrade("Encadrer 7/3 entre 2 fractions", "2 et 3")).toMatchObject({
      isCorrect: false,
      evaluation: {
        numericValid: true,
        formatValid: false,
        reason: "format",
      },
      confidence: "high",
    });
  });

  it("rejects integer-only bounds even when their numeric values are strict", () => {
    expect(localGrade("Encadrer 7/3 entre deux fractions", "2 et 5")).toMatchObject({
      isCorrect: false,
      evaluation: { numericValid: true, formatValid: false, reason: "format" },
    });
  });

  it("accepts explicit fraction bounds with denominator one", () => {
    expect(localGrade("Encadrer 7/3 entre deux fractions", "2/1 et 5/1")).toMatchObject({
      isCorrect: true,
      evaluation: { numericValid: true, formatValid: true, reason: "correct" },
    });
  });

  it("rejects bounds that are both above the target", () => {
    expect(localGrade("Encadrer 7/3 entre deux fractions", "3/1 et 4/1")).toMatchObject({
      isCorrect: false,
      evaluation: { numericValid: false, reason: "bounds" },
    });
  });

  it("accepts equivalent strict fraction bounds", () => {
    expect(localGrade("Encadrer 7/3 entre 2 fractions", "6/3 et 8/3")).toMatchObject({
      isCorrect: true,
      confidence: "high",
    });
  });

  it("keeps explicit division on the arithmetic path", () => {
    expect(localGrade("Pose la division 748 ÷ 4", "187")).toMatchObject({
      isCorrect: true,
      confidence: "high",
    });
  });
});
