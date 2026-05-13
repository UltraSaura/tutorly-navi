import { describe, expect, it } from "vitest";
import { validateAnswer } from "./validateAnswer";
import type { TrainingQuestion } from "@/types/training";

describe("validateAnswer", () => {
  it("returns null when no validation", () => {
    const q: TrainingQuestion = { id: "q1", type: "text", prompt: "p" };
    expect(validateAnswer(q, "x")).toEqual({ correct: null });
  });

  it("validates exact", () => {
    const q: TrainingQuestion = {
      id: "q1",
      type: "text",
      prompt: "p",
      validation: { type: "exact", value: "42" },
    };
    expect(validateAnswer(q, "42")).toEqual({ correct: true });
    expect(validateAnswer(q, " 42 ")).toEqual({ correct: true });
    expect(validateAnswer(q, "41")).toEqual({ correct: false });
  });

  it("validates range", () => {
    const q: TrainingQuestion = {
      id: "q1",
      type: "numeric",
      prompt: "p",
      validation: { type: "range", value: [1, 3] },
    };
    expect(validateAnswer(q, "2")).toEqual({ correct: true });
    expect(validateAnswer(q, "0")).toEqual({ correct: false });
    expect(validateAnswer(q, "not a number")).toEqual({ correct: null });
  });

  it("validates regex", () => {
    const q: TrainingQuestion = {
      id: "q1",
      type: "text",
      prompt: "p",
      validation: { type: "regex", value: "^a+$" },
    };
    expect(validateAnswer(q, "aaa")).toEqual({ correct: true });
    expect(validateAnswer(q, "aba")).toEqual({ correct: false });
  });
});

