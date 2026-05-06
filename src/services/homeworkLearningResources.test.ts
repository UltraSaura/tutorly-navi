import { describe, expect, it } from "vitest";
import { __homeworkLearningResourcesTest, buildSafeHomeworkLearningRows } from "./homeworkLearningResources";
import type { CurriculumSkillMatch } from "@/types/smart-learning";
import type { ProblemSubmission } from "@/types/chat";

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

const groupedProblem = (): ProblemSubmission => ({
  id: "problem-1",
  submissionId: "submission-1",
  type: "grouped_problem",
  rawText: "",
  attachments: [],
  status: "evaluated",
  createdAt: "2026-05-06T00:00:00.000Z",
  updatedAt: "2026-05-06T00:00:00.000Z",
  sections: [
    {
      id: "section-1",
      rows: [
        {
          id: "fraction-row",
          label: "A",
          prompt: "Compare 1/2 and 1/3.",
          answerType: "text",
          rowKind: "calculation",
          options: [],
          evaluation: {
            justificationProvided: true,
            status: "incorrect",
            feedback: "Compare the denominators.",
          },
        },
        {
          id: "addition-row",
          label: "B",
          prompt: "Calculate 8 + 7.",
          answerType: "text",
          rowKind: "calculation",
          options: [],
          evaluation: {
            justificationProvided: true,
            status: "incorrect",
            feedback: "Start with 8, then add 7.",
          },
        },
      ],
    },
  ],
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

  it("builds learning rows for only the selected grouped row", () => {
    const rows = buildSafeHomeworkLearningRows(groupedProblem(), "addition-row");

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      label: "B",
      prompt: "Calculate 8 + 7.",
      rowKind: "calculation",
      gradingExplanation: "Start with 8, then add 7.",
      status: "incorrect",
    });
  });

  it("does not include unrelated grouped rows when a selected row is provided", () => {
    const rows = buildSafeHomeworkLearningRows(groupedProblem(), "addition-row");
    const rowText = rows.map((row) => [
      row.label,
      row.prompt,
      row.gradingExplanation,
    ].join(" ")).join(" ");

    expect(rowText).toContain("Calculate 8 + 7.");
    expect(rowText).not.toContain("Compare 1/2 and 1/3.");
    expect(rowText).not.toContain("denominators");
  });
});
