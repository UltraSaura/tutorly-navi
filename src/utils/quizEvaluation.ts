import type { Question } from '@/types/quiz-bank';
import { evaluateVisual } from '@/lib/quiz/visual-evaluate';

export type QuizQuestionGradeDetail = {
  questionId: string;
  attemptCount: number;
  correct: boolean;
  awardedPoints: number;
  maxPoints: number;
  penaltyFactor: number;
  answeredCorrectlyOnAttempt: number | null;
  finalAnswer: any;
};

export function evaluateQuestion(q: Question, answer: any): boolean {
  if (q.kind === "single") {
    const correctId = q.choices.find(c => c.correct)?.id;
    return answer === correctId;
  }
  if (q.kind === "multi") {
    const correct = q.choices.filter(c => c.correct).map(c => c.id).sort().join(",");
    const yours = Array.isArray(answer) ? [...answer].sort().join(",") : "";
    return correct === yours;
  }
  if (q.kind === "numeric") {
    const numQ = q as any;
    if (numQ.answerFormat === "fraction" && numQ.fractionAnswer) {
      const studentNum = Number(answer?.numerator);
      const studentDen = Number(answer?.denominator);
      if (!studentDen || isNaN(studentNum) || isNaN(studentDen)) return false;
      const { numerator: correctNum, denominator: correctDen } = numQ.fractionAnswer;
      return studentNum * correctDen === studentDen * correctNum;
    }
    return Number(answer) === numQ.answer;
  }
  if (q.kind === "ordering") {
    return JSON.stringify(answer) === JSON.stringify((q as any).correctOrder);
  }
  if (q.kind === "visual") {
    return evaluateVisual(q.visual, answer);
  }
  if (q.kind === "operation-posee") {
    return Boolean(answer?.correct);
  }
  if (q.kind === "slider") {
    return Math.abs(Number(answer) - q.answer) <= q.tolerance;
  }
  if (q.kind === "match") {
    if (!Array.isArray(answer) || answer.length !== q.pairs.length) return false;
    return q.pairs.every(p => answer.includes(`${p.leftId}:${p.rightId}`));
  }
  if (q.kind === "fill-expr") {
    if (!answer || typeof answer !== "object") return false;
    return Object.keys(q.answers).every(
      key => String(answer[key] ?? "").trim() === q.answers[key].trim()
    );
  }
  return false;
}

export function gradeQuiz(questions: Question[], answers: Record<string, any>) {
  let score = 0;
  let maxScore = 0;
  const details = questions.map(q => {
    const pts = q.points ?? 1;
    maxScore += pts;
    const correct = evaluateQuestion(q, answers[q.id]);
    if (correct) score += pts;
    return {
      questionId: q.id,
      correct,
      points: pts,
      userAnswer: answers[q.id]
    };
  });
  return { score, maxScore, details };
}

export function getPenaltyFactorForAttempt(attemptNumber: number): number {
  if (attemptNumber <= 1) return 1;
  if (attemptNumber === 2) return 0.5;
  if (attemptNumber === 3) return 0.25;
  return 0;
}

export function scoreQuestionWithPenalty(points: number, attemptNumber: number, correct: boolean) {
  if (!correct) {
    return { awardedPoints: 0, penaltyFactor: 0 };
  }

  const penaltyFactor = getPenaltyFactorForAttempt(attemptNumber);
  return {
    awardedPoints: points * penaltyFactor,
    penaltyFactor,
  };
}

export function gradeQuizWithDetails(
  questions: Question[],
  gradeDetails: Record<string, QuizQuestionGradeDetail>,
) {
  let score = 0;
  let maxScore = 0;

  const details = questions.map((q) => {
    const pts = q.points ?? 1;
    maxScore += pts;

    const detail = gradeDetails[q.id] ?? {
      questionId: q.id,
      attemptCount: 0,
      correct: false,
      awardedPoints: 0,
      maxPoints: pts,
      penaltyFactor: 0,
      answeredCorrectlyOnAttempt: null,
      finalAnswer: undefined,
    };

    score += detail.awardedPoints;
    return {
      ...detail,
      questionId: q.id,
      maxPoints: pts,
    };
  });

  return { score, maxScore, details };
}

export function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
