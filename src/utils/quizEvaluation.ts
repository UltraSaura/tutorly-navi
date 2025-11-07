import type { Question } from '@/types/quiz-bank';

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
    return Number(answer) === (q as any).answer;
  }
  if (q.kind === "ordering") {
    return JSON.stringify(answer) === JSON.stringify((q as any).correctOrder);
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

export function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

