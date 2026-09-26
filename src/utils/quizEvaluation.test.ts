import { describe, expect, it } from "vitest";
import type { Question } from "@/types/quiz-bank";
import { buildColumnFillQuestion } from "@/lib/quiz/columnFillBuilder";
import {
  evaluateQuestion,
  getPenaltyFactorForAttempt,
  gradeQuizWithDetails,
  scoreQuestionWithPenalty,
} from "./quizEvaluation";

const singleQuestion = (id: string, points = 1): Question => ({
  id,
  kind: "single",
  prompt: `Question ${id}`,
  points,
  choices: [
    { id: "a", label: "A" },
    { id: "b", label: "B", correct: true },
  ],
});

describe("quiz penalty grading", () => {
  it("uses the 100/50/25/0 penalty curve", () => {
    expect(getPenaltyFactorForAttempt(1)).toBe(1);
    expect(getPenaltyFactorForAttempt(2)).toBe(0.5);
    expect(getPenaltyFactorForAttempt(3)).toBe(0.25);
    expect(getPenaltyFactorForAttempt(4)).toBe(0);
    expect(getPenaltyFactorForAttempt(7)).toBe(0);
  });

  it("awards full points on a first-try correct answer", () => {
    expect(scoreQuestionWithPenalty(1, 1, true)).toEqual({
      awardedPoints: 1,
      penaltyFactor: 1,
    });
  });

  it("awards half points on a second-try correct answer", () => {
    expect(scoreQuestionWithPenalty(1, 2, true)).toEqual({
      awardedPoints: 0.5,
      penaltyFactor: 0.5,
    });
  });

  it("awards quarter points on a third-try correct answer", () => {
    expect(scoreQuestionWithPenalty(1, 3, true)).toEqual({
      awardedPoints: 0.25,
      penaltyFactor: 0.25,
    });
  });

  it("awards zero points from the fourth try onward", () => {
    expect(scoreQuestionWithPenalty(1, 4, true)).toEqual({
      awardedPoints: 0,
      penaltyFactor: 0,
    });
  });

  it("keeps wrong answers at zero points", () => {
    expect(scoreQuestionWithPenalty(3, 2, false)).toEqual({
      awardedPoints: 0,
      penaltyFactor: 0,
    });
  });

  it("grades a quiz from persisted per-question details", () => {
    const questions = [singleQuestion("q1", 1), singleQuestion("q2", 2)];
    const graded = gradeQuizWithDetails(questions, {
      q1: {
        questionId: "q1",
        attemptCount: 2,
        correct: true,
        awardedPoints: 0.5,
        maxPoints: 1,
        penaltyFactor: 0.5,
        answeredCorrectlyOnAttempt: 2,
        finalAnswer: "b",
      },
      q2: {
        questionId: "q2",
        attemptCount: 1,
        correct: false,
        awardedPoints: 0,
        maxPoints: 2,
        penaltyFactor: 0,
        answeredCorrectlyOnAttempt: null,
        finalAnswer: "a",
      },
    });

    expect(graded.score).toBe(0.5);
    expect(graded.maxScore).toBe(3);
    expect(graded.details).toHaveLength(2);
  });
});

describe("column-fill questions", () => {
  it("builds an addition column-fill question with layout and blanks", () => {
    const question = buildColumnFillQuestion({
      id: "cf-add",
      prompt: "Complète l'addition posée.",
      operation: "addition",
      firstOperand: 29,
      secondOperand: 66,
    });

    expect(question.kind).toBe("column-fill");
    expect(question.layout.rows.length).toBeGreaterThan(0);
    expect(question.blanks.length).toBeGreaterThan(0);
    expect(question.blanks.some((blank) => blank.kind === "carry")).toBe(true);
  });

  it("marks a fully correct column-fill answer as correct", () => {
    const question = buildColumnFillQuestion({
      id: "cf-sub",
      prompt: "Complète la soustraction posée.",
      operation: "subtraction",
      firstOperand: 52,
      secondOperand: 18,
    });

    const answer = Object.fromEntries(question.blanks.map((blank) => [blank.id, blank.answer]));
    expect(evaluateQuestion(question, answer)).toBe(true);
  });

  it("marks an incorrect column-fill answer as wrong", () => {
    const question = buildColumnFillQuestion({
      id: "cf-mul",
      prompt: "Complète la multiplication posée.",
      operation: "multiplication",
      firstOperand: 12,
      secondOperand: 8,
    });

    const answer = Object.fromEntries(question.blanks.map((blank) => [blank.id, blank.answer]));
    const firstBlank = question.blanks[0];
    answer[firstBlank.id] = firstBlank.answer === "0" ? "1" : "0";

    expect(evaluateQuestion(question, answer)).toBe(false);
  });
});

describe("clock-time numeric questions", () => {
  const question: Question = {
    id: "time-1",
    kind: "numeric",
    prompt: "À quelle heure arrive le bus ?",
    answer: 955,
    answerFormat: "time",
    timeAnswer: { hours: 9, minutes: 55 },
  };

  it("accepts matching hour and minute fields", () => {
    expect(evaluateQuestion(question, { hours: "9", minutes: "55" })).toBe(true);
  });

  it("rejects an invalid minute value", () => {
    expect(evaluateQuestion(question, { hours: "9", minutes: "95" })).toBe(false);
  });

  it("keeps a 3:00 clock answer separate from quantity conversions", () => {
    const clock: Question = {
      id: "time-3",
      kind: "numeric",
      prompt: "Quelle heure est indiquée ?",
      answer: 180,
      answerFormat: "time",
      timeAnswer: { hours: 3, minutes: 0 },
    };
    expect(evaluateQuestion(clock, { hours: "3", minutes: "0" })).toBe(true);
  });
});

describe("unit-conversion numeric questions", () => {
  it("grades the numeric value while the target unit remains explicit UI metadata", () => {
    const cases: Array<[number, string, string]> = [
      [300, "s", "5 minutes en secondes"],
      [120, "min", "2 heures en minutes"],
      [300, "cm", "3 mètres en centimètres"],
    ];
    for (const [answer, answerUnit, prompt] of cases) {
      const question: Question = { id: answerUnit, kind: "numeric", prompt, answer, answerUnit };
      expect(evaluateQuestion(question, answer)).toBe(true);
      expect(evaluateQuestion(question, `${answer} min`)).toBe(false);
    }
  });
});
