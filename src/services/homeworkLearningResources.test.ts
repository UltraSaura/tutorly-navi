import { describe, expect, it } from "vitest";
import { __homeworkLearningResourcesTest } from "./homeworkLearningResources";
import type { CurriculumSkillMatch } from "@/types/smart-learning";

const skill = (
  skillTag: string,
  confidence: number,
  label: string,
): CurriculumSkillMatch => ({
  subject: "math",
  skillTag,
  keywords: [label],
  confidence,
  studentFriendlyLabel: label,
  source: "homework",
});

describe("homework learning resources", () => {
  it("aggregates skills by confidence, frequency, and struggle", () => {
    const ranked = __homeworkLearningResourcesTest.aggregateSkillMatches([
      {
        row: { prompt: "Add fractions", status: "correct" },
        matches: [skill("fractions:add", 0.8, "Adding fractions")],
      },
      {
        row: { prompt: "Common denominators", status: "incorrect" },
        matches: [skill("fractions:add", 0.7, "Adding fractions")],
      },
      {
        row: { prompt: "Area", status: "incorrect" },
        matches: [skill("geometry:area", 0.86, "Area")],
      },
    ]);

    expect(ranked.map((match) => match.skillTag)).toEqual(["fractions:add", "geometry:area"]);
    expect(ranked[0].confidence).toBeCloseTo(0.8);
  });

  it("builds extraction text from safe row fields only", () => {
    const text = __homeworkLearningResourcesTest.rowToLearningText({
      label: "A",
      prompt: "Calculate the perimeter",
      rowKind: "calculation",
      gradingExplanation: "Use all side lengths.",
      status: "incorrect",
    });

    expect(text).toContain("Prompt: Calculate the perimeter");
    expect(text).toContain("Kind: calculation");
    expect(text).not.toContain("extractedText");
    expect(text).not.toContain("OCR");
  });
});
