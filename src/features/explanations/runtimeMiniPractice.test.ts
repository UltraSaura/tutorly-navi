import { describe, expect, it } from "vitest";
import {
  generateRuntimeMiniPractice,
  isVerticalOperationVisualText,
  isMiniPracticeAnswerCorrect,
  parseSimpleArithmeticExercise,
  validateRuntimeMiniPractice,
} from "./runtimeMiniPractice";

describe("runtimeMiniPractice", () => {
  it("validates a multiple choice practice item", () => {
    const practice = validateRuntimeMiniPractice({
      id: "p1",
      concept: "addition",
      learningStyleUsed: "visual",
      questionType: "multiple_choice",
      prompt: "Which answer matches two groups of 3?",
      visualText: "● ● ●\n● ● ●",
      choices: [
        { id: "A", label: "5" },
        { id: "B", label: "6" },
      ],
      correctAnswer: "B",
      hint: "Count both rows.",
      feedback: {
        correct: "Yes, both rows make 6.",
        incorrect: "Count each dot once.",
      },
    });

    expect(practice).not.toBeNull();
    expect(practice?.learningStyleUsed).toBe("visual");
    expect(isMiniPracticeAnswerCorrect(practice!, "B")).toBe(true);
    expect(isMiniPracticeAnswerCorrect(practice!, "A")).toBe(false);
  });

  it("rejects invalid practice items", () => {
    expect(validateRuntimeMiniPractice({
      questionType: "matching",
      prompt: "Unsupported",
      correctAnswer: "A",
      hint: "Hint",
      feedback: { correct: "Yes", incorrect: "No" },
    })).toBeNull();
  });

  it("checks ordering answers by selected id order", () => {
    const practice = validateRuntimeMiniPractice({
      id: "p2",
      concept: "steps",
      learningStyleUsed: "kinesthetic",
      questionType: "ordering",
      prompt: "Put the steps in order.",
      choices: [
        { id: "A", label: "Draw groups" },
        { id: "B", label: "Count all" },
      ],
      correctAnswer: ["A", "B"],
      hint: "Start by making the groups.",
      feedback: {
        correct: "That order works.",
        incorrect: "Make the groups before counting.",
      },
    });

    expect(practice).not.toBeNull();
    expect(isMiniPracticeAnswerCorrect(practice!, ["A", "B"])).toBe(true);
    expect(isMiniPracticeAnswerCorrect(practice!, ["B", "A"])).toBe(false);
  });

  it("detects vertical operation visual text", () => {
    expect(isVerticalOperationVisualText("77\n+  6\n----")).toBe(true);
    expect(isVerticalOperationVisualText("325\n− 148\n-----")).toBe(true);
    expect(isVerticalOperationVisualText("● ● ●\n● ● ●")).toBe(false);
    expect(isVerticalOperationVisualText("Use a number line from 0 to 10.")).toBe(false);
  });

  it("parses simple arithmetic expressions", () => {
    expect(parseSimpleArithmeticExercise("66 + 88")).toEqual({ a: 66, b: 88, op: "+" });
  });

  it("keeps direct arithmetic for CM1-level kid practice", async () => {
    const practice = await generateRuntimeMiniPractice({
      exercise: "66 + 88",
      gradeLevel: "CM1",
      language: "fr",
      learningStyle: "visual",
      enabled: true,
    });

    expect(practice).not.toBeNull();
    expect(practice?.prompt).toContain("Calcule");
    expect(practice?.visualText).toContain("66");
    expect(practice?.visualText).not.toContain("barres");
    expect(practice?.choices?.some((choice) => choice.label === "154")).toBe(true);
  });

  it("does not use barres for two-digit arithmetic when grade context is missing", async () => {
    const practice = await generateRuntimeMiniPractice({
      exercise: "22 + 3",
      language: "fr",
      learningStyle: "visual",
      enabled: true,
    });

    expect(practice).not.toBeNull();
    expect(practice?.prompt).toContain("Calcule");
    expect(practice?.visualText?.toLowerCase()).not.toContain("barre");
    expect(practice?.visualText?.toLowerCase()).not.toContain("cube");
    expect(practice?.choices?.some((choice) => choice.label === "25")).toBe(true);
  });
});
