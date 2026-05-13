import { describe, expect, it } from "vitest";
import { migrateOldQuestions } from "./migrateOldQuestions";

describe("migrateOldQuestions", () => {
  it("returns [] for invalid payloads", () => {
    expect(migrateOldQuestions(null)).toEqual([]);
    expect(migrateOldQuestions({})).toEqual([]);
    expect(migrateOldQuestions({ questions: "nope" })).toEqual([]);
  });

  it("maps parsedContent.questions[].text into TrainingQuestion[]", () => {
    const result = migrateOldQuestions({
      questions: [{ text: "Q1" }, { text: "Q2" }],
    });
    expect(result).toEqual([
      { id: "q_0", type: "text", prompt: "Q1", guidance: { hints: [] } },
      { id: "q_1", type: "text", prompt: "Q2", guidance: { hints: [] } },
    ]);
  });
});

