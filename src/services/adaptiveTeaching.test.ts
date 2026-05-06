import { describe, expect, it } from "vitest";
import { summarizeLearningAnalyticsEvents } from "./adaptiveTeaching";

describe("summarizeLearningAnalyticsEvents", () => {
  it("reports not enough data below the event threshold", () => {
    const summary = summarizeLearningAnalyticsEvents([
      {
        event_type: "runtime_mini_practice_answered",
        support_type: "visual",
        question_kind: "multiple_choice",
        was_correct: true,
        hint_used: false,
      },
    ]);

    expect(summary.totalRelevantEvents).toBe(1);
    expect(summary.answeredPracticeOrQuizEvents).toBe(1);
    expect(summary.readinessStatus).toBe("not_enough_data");
    expect(summary.mostHelpfulSupportStyle).toBeNull();
  });

  it("waits for answered practice data after enough events exist", () => {
    const summary = summarizeLearningAnalyticsEvents(
      Array.from({ length: 20 }, () => ({
        event_type: "explanation_opened",
        support_type: "mixed",
      }))
    );

    expect(summary.totalRelevantEvents).toBe(20);
    expect(summary.answeredPracticeOrQuizEvents).toBe(0);
    expect(summary.readinessStatus).toBe("collecting_practice_data");
  });

  it("returns a cautious helpful support signal only with enough evidence", () => {
    const events = [
      ...Array.from({ length: 15 }, () => ({
        event_type: "explanation_opened",
        support_type: "mixed",
      })),
      ...Array.from({ length: 4 }, () => ({
        event_type: "runtime_mini_practice_answered",
        support_type: "visual",
        question_kind: "multiple_choice",
        was_correct: true,
        hint_used: false,
      })),
      {
        event_type: "quiz_answer_after_remediation",
        support_type: "auditory",
        question_kind: "single",
        was_correct: false,
        hint_used: true,
      },
    ];

    const summary = summarizeLearningAnalyticsEvents(events);

    expect(summary.totalRelevantEvents).toBe(20);
    expect(summary.answeredPracticeOrQuizEvents).toBe(5);
    expect(summary.readinessStatus).toBe("ready");
    expect(summary.supportStyleCounts.visual).toBe(4);
    expect(summary.correctnessBySupportStyle.visual.rate).toBe(1);
    expect(summary.hintUsageBySupportStyle.auditory.rate).toBe(1);
    expect(summary.quizCorrectnessByQuestionKind.single.correct).toBe(0);
    expect(summary.miniPracticeCorrectnessByQuestionType.multiple_choice.correct).toBe(4);
    expect(summary.mostHelpfulSupportStyle).toBe("visual");
    expect(summary.evidenceMessage).toBe("early_signal");
  });
});
