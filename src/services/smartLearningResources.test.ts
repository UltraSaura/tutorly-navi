import { describe, expect, it } from "vitest";
import {
  parseAiSkillExtraction,
  rankLearningRecommendations,
} from "./smartLearningResources";
import {
  getSmartLearningResourcesCopy,
  getVisibleLearningResources,
} from "@/components/learning/smartLearningResourcesCopy";
import type { LearningResourceRecommendation } from "@/types/smart-learning";

const recommendation = (
  id: string,
  type: LearningResourceRecommendation["type"],
  matchScore: number,
): LearningResourceRecommendation => ({
  id,
  type,
  title: id,
  skillTags: ["fractions"],
  keywords: ["fractions"],
  matchScore,
  matchReasons: ["Fractions"],
});

describe("smart learning resources", () => {
  it("parses and validates JSON-only AI extraction output", () => {
    const parsed = parseAiSkillExtraction(JSON.stringify({
      primary: {
        subject: "math",
        domain: "Numbers",
        subdomain: "Fractions",
        topic: "Adding fractions",
        skillTag: "fractions:add",
        keywords: ["fractions", "denominator"],
        confidence: 0.82,
        studentFriendlyLabel: "adding fractions",
        reason: "matched terms",
      },
      secondary: [
        {
          topic: "Equivalent fractions",
          skillTag: "fractions:equivalent",
          keywords: ["equivalent"],
          confidence: 0.4,
          studentFriendlyLabel: "equivalent fractions",
        },
      ],
    }));

    expect(parsed?.primary.skillTag).toBe("fractions:add");
    expect(parsed?.primary.confidence).toBe(0.82);
    expect(parsed?.secondary).toHaveLength(1);
  });

  it("falls back cleanly when AI extraction JSON is invalid", () => {
    expect(parseAiSkillExtraction("This is not JSON")).toBeNull();
    expect(parseAiSkillExtraction('{"primary":{"topic":"Fractions"}}')).toBeNull();
  });

  it("ranks recommendations with caps for videos, quizzes, and practice", () => {
    const ranked = rankLearningRecommendations([
      recommendation("video-low", "video", 0.2),
      recommendation("video-high", "video", 0.9),
      recommendation("video-mid", "video", 0.7),
      recommendation("quiz-high", "quiz", 0.8),
      recommendation("quiz-mid", "quiz", 0.6),
      recommendation("quiz-low", "quiz", 0.3),
      recommendation("practice", "practice", 0.5),
    ]);

    expect(ranked.map((item) => item.id)).toEqual([
      "video-high",
      "video-mid",
      "quiz-high",
      "quiz-mid",
    ]);
  });

  it("keeps the UI empty state small and localized", () => {
    expect(getSmartLearningResourcesCopy("en").empty).toContain("No matching resources");
    expect(getSmartLearningResourcesCopy("fr").empty).toContain("Aucune ressource");
    expect(getSmartLearningResourcesCopy("en", "homework").title).toBe("To help you");
    expect(getSmartLearningResourcesCopy("fr", "homework").detectedTopic).toBe("Sujets trouvés");
    expect(getVisibleLearningResources([])).toEqual([]);
  });

  it("does not expose raw AI JSON in student copy", () => {
    const copy = Object.values(getSmartLearningResourcesCopy("en")).join(" ");
    expect(copy).not.toContain("{");
    expect(copy).not.toContain("skillTag");
    expect(copy).not.toContain("confidence");
  });
});
