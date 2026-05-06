import { describe, expect, it } from "vitest";
import {
  __smartLearningResourcesTest,
  extractLearningContext,
  parseAiSkillExtraction,
  rankLearningRecommendations,
} from "./smartLearningResources";
import {
  getSmartLearningResourcesCopy,
  getVisibleLearningResources,
} from "@/components/learning/smartLearningResourcesCopy";
import type { CurriculumSkillMatch, LearningResourceRecommendation } from "@/types/smart-learning";

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

const skillMatch = (overrides: Partial<CurriculumSkillMatch>): CurriculumSkillMatch => ({
  subject: "math",
  skillTag: "math:addition",
  keywords: ["addition", "add", "sum"],
  confidence: 0.9,
  studentFriendlyLabel: "Addition",
  source: "homework",
  ...overrides,
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

  it("keeps homework copy localized and child-safe", () => {
    expect(getSmartLearningResourcesCopy("en", "homework").title).toBe("To help you");
    expect(getSmartLearningResourcesCopy("fr", "homework").detectedTopic).toBe("Sujets trouvés");
    expect(getSmartLearningResourcesCopy("en", "homework").empty).toBe(
      "No matching videos or quizzes yet. Try a quick practice question instead."
    );
    expect(getSmartLearningResourcesCopy("fr", "homework").empty).toBe(
      "Aucune vidéo ni aucun quiz correspondant pour le moment. Essaie plutôt un petit exercice."
    );
    expect(getVisibleLearningResources([])).toEqual([]);

    const copy = Object.values(getSmartLearningResourcesCopy("en", "homework")).join(" ");
    expect(copy).not.toContain("{");
    expect(copy).not.toContain("skillTag");
    expect(copy).not.toContain("confidence");
  });

  it("does not treat fraction resources as relevant for addition or subtraction", () => {
    const additionScore = __smartLearningResourcesTest.bestRelevantResourceScore({
      skillMatches: [skillMatch({ skillTag: "math:addition", keywords: ["addition", "add", "sum"] })],
      skillTags: ["fractions", "denominator"],
      keywords: ["Introduction aux Fractions", "fraction", "denominator"],
      language: "fr",
      preferredLanguage: "fr",
      gradeLevel: "ce1",
      preferredGradeLevel: "ce1",
    });

    const subtractionScore = __smartLearningResourcesTest.bestRelevantResourceScore({
      skillMatches: [skillMatch({ skillTag: "math:subtraction", keywords: ["subtraction", "minus", "difference"] })],
      skillTags: ["fractions", "denominator"],
      keywords: ["Fractions quiz", "fraction", "denominator"],
      language: "en",
      preferredLanguage: "en",
      gradeLevel: "grade-2",
      preferredGradeLevel: "grade-2",
    });

    expect(additionScore.hasStrongRelevance).toBe(false);
    expect(additionScore.score).toBe(0);
    expect(subtractionScore.hasStrongRelevance).toBe(false);
    expect(subtractionScore.score).toBe(0);
  });

  it("does not treat addition resources as relevant for fractions", () => {
    const score = __smartLearningResourcesTest.bestRelevantResourceScore({
      skillMatches: [skillMatch({
        skillTag: "math:fractions",
        keywords: ["fraction", "denominator"],
        studentFriendlyLabel: "Fractions",
      })],
      skillTags: ["addition", "sum"],
      keywords: ["Addition within 20", "add", "sum"],
      language: "en",
      preferredLanguage: "en",
      gradeLevel: "grade-2",
      preferredGradeLevel: "grade-2",
    });

    expect(score.hasStrongRelevance).toBe(false);
    expect(score.score).toBe(0);
  });

  it("does not allow language or grade match alone to make resources eligible", () => {
    const score = __smartLearningResourcesTest.bestRelevantResourceScore({
      skillMatches: [skillMatch({ keywords: ["addition"] })],
      skillTags: ["geometry"],
      keywords: ["Shapes and angles"],
      language: "fr",
      preferredLanguage: "fr",
      gradeLevel: "ce1",
      preferredGradeLevel: "ce1",
    });

    expect(score.hasStrongRelevance).toBe(false);
    expect(score.score).toBe(0);
  });

  it("does not count generic keyword overlap as meaningful relevance", () => {
    const score = __smartLearningResourcesTest.bestRelevantResourceScore({
      skillMatches: [skillMatch({ keywords: ["math", "exercise", "numbers", "answer"] })],
      skillTags: ["math", "exercise"],
      keywords: ["Math exercise", "Solve the problem", "Answer the question"],
    });

    expect(score.hasStrongRelevance).toBe(false);
    expect(score.score).toBe(0);
  });

  it("keeps exact topic and objective matches eligible", () => {
    const topicScore = __smartLearningResourcesTest.bestRelevantResourceScore({
      skillMatches: [skillMatch({ topicId: "topic-addition", keywords: ["addition"] })],
      topicId: "topic-addition",
      skillTags: [],
      keywords: ["Practice"],
    });

    const objectiveScore = __smartLearningResourcesTest.bestRelevantResourceScore({
      skillMatches: [skillMatch({ objectiveId: "objective-addition", keywords: ["addition"] })],
      objectiveId: "objective-addition",
      skillTags: [],
      keywords: ["Practice"],
    });

    expect(topicScore.hasStrongRelevance).toBe(true);
    expect(topicScore.score).toBeGreaterThanOrEqual(0.4);
    expect(objectiveScore.hasStrongRelevance).toBe(true);
    expect(objectiveScore.score).toBeGreaterThanOrEqual(0.4);
  });

  it("filters irrelevant videos and quizzes out of final ranking", () => {
    const ranked = rankLearningRecommendations([
      recommendation("fraction-video", "video", 0),
      recommendation("fraction-quiz", "quiz", 0.1),
      recommendation("addition-video", "video", 0.45),
      recommendation("addition-quiz", "quiz", 0.4),
      recommendation("practice", "practice", 0.5),
    ]);

    expect(ranked.map((item) => item.id)).toEqual(["addition-video", "addition-quiz", "practice"]);
  });

  it("extracts plain addition from the homework prompt before AI or curriculum fallback", async () => {
    const matches = await extractLearningContext({
      source: "homework",
      subject: "math",
      title: "Introduction aux Fractions",
      text: [
        "Label: Exercice",
        "Kind: calculation",
        "Prompt: 486 + 338",
        "Feedback: Regarde la vidéo Introduction aux Fractions si besoin.",
      ].join("\n"),
      responseLanguage: "fr",
    });

    expect(matches[0]).toMatchObject({
      skillTag: "math:addition",
      studentFriendlyLabel: "Addition",
    });
  });

  it("does not force fraction prompts into plain addition", () => {
    const matches = __smartLearningResourcesTest.deterministicArithmeticMatch({
      source: "homework",
      subject: "math",
      text: "Prompt: 1/2 + 1/3",
      responseLanguage: "fr",
    });

    expect(matches).toEqual([]);
  });
});
