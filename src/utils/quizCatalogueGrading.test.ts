import { describe, expect, it } from 'vitest';
import { createArithmeticQuizExercise, arithmeticProblemAnswer, type ArithmeticQuizAnswer } from '@/features/practice/arithmeticQuiz';
import { createVisualQuizDraft } from '@/features/practice/visualQuiz';
import { evaluateQuestion, gradeQuiz, isQuizAnswerComplete, scoreQuizQuestion } from './quizEvaluation';

describe('bank question grading for interactive formats', () => {
  it('persists partial deck points rather than marking an unfinished or partly correct series fully correct', () => {
    const exercise = createArithmeticQuizExercise('calculation-race');
    exercise.problems = exercise.problems.slice(0, 2);
    exercise.points = 4;
    const [first, second] = exercise.problems;
    const answer: ArithmeticQuizAnswer = { responses: { [first.id]: arithmeticProblemAnswer(first), [second.id]: second.choices.find(choice => choice !== arithmeticProblemAnswer(second))! },
      correctCount: 999, total: 999, complete: true, attempts: 1, elapsedSeconds: 10, supported: false };
    expect(isQuizAnswerComplete(exercise, answer)).toBe(true);
    expect(evaluateQuestion(exercise, answer)).toBe(false);
    expect(scoreQuizQuestion(exercise, answer, 1).awardedPoints).toBe(2);
    expect(scoreQuizQuestion(exercise, answer, 2).awardedPoints).toBe(1);
    expect(gradeQuiz([exercise], { [exercise.id]: answer }).score).toBe(2);
    expect(isQuizAnswerComplete(exercise, { ...answer, complete: false })).toBe(false);
    expect(scoreQuizQuestion(exercise, { ...answer, complete: false }, 1).awardedPoints).toBe(0);
    expect(scoreQuizQuestion({ ...exercise, points: 0 }, answer, 1).awardedPoints).toBe(0);
  });
  it('grades clock and number-line bank wrappers from raw evidence', () => {
    const clock = createVisualQuizDraft('analogue-clock', 'clock');
    const line = createVisualQuizDraft('graduated-number-line', 'line');
    const state = { value:'', position:null, selectedHour:4, attempts:1, supported:false, complete:true };
    expect(evaluateQuestion(clock, state)).toBe(true);
    expect(evaluateQuestion(clock, { ...state, selectedHour:3, correct:true })).toBe(false);
    expect(evaluateQuestion(line, { ...state, selectedHour:null, value:'2/4' })).toBe(true);
    expect(evaluateQuestion(line, { ...state, value:'', correct:true })).toBe(false);
    expect(isQuizAnswerComplete(line, { ...state, value:'1/2', complete:false })).toBe(false);
  });
});
