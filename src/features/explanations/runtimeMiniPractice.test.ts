import { describe, expect, it } from "vitest";
import {
  isMiniPracticeAnswerCorrect,
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
});
