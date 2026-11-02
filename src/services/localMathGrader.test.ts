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
  });

  it("keeps explicit division on the arithmetic path", () => {
    expect(localGrade("Pose la division 748 ÷ 4", "187")).toMatchObject({
      isCorrect: true,
      confidence: "high",
    });
  });
});
