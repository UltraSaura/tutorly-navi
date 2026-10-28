import { describe, expect, it, vi } from "vitest";
import { buildLearningResourceAnalyticsMetadata, trackLearningInteractionEvent } from "./learningAnalytics";

describe("learning analytics", () => {
  it("does not request the optional analytics table in this release", async () => {
    const network = vi.spyOn(globalThis, 'fetch');
    try {
      await trackLearningInteractionEvent({ eventType: 'lesson_completed', studentId: '00000000-0000-4000-8000-000000000001' });
      expect(network).not.toHaveBeenCalled();
    } finally { network.mockRestore(); }
  });
  it("keeps Smart Learning Resources metadata safe and aggregate-only", () => {
    const metadata = buildLearningResourceAnalyticsMetadata({
      source: "explanation",
      skillMatch: {
        source: "explanation",
        subject: "math",
        skillTag: "fractions:add",
        keywords: ["fractions"],
        confidence: 0.8,
        studentFriendlyLabel: "Adding fractions",
        topicId: "topic-1",
        objectiveId: "objective-1",
      },
      recommendation: {
        id: "video-1",
        type: "video",
        title: "Adding fractions",
        skillTags: ["fractions:add"],
        keywords: ["fractions"],
        matchScore: 0.91,
        matchReasons: ["Adding fractions"],
      },
      recommendationCount: 2,
    });

    expect(metadata).toEqual({
      source: "explanation",
      skillTag: "fractions:add",
      topicId: "topic-1",
      objectiveId: "objective-1",
      recommendationCount: 2,
      resourceType: "video",
      resourceId: "video-1",
      matchScore: 0.91,
    });
    expect(Object.keys(metadata)).not.toContain("text");
    expect(Object.keys(metadata)).not.toContain("prompt");
    expect(Object.keys(metadata)).not.toContain("studentAnswer");
    expect(Object.keys(metadata)).not.toContain("aiOutput");
  });
});
