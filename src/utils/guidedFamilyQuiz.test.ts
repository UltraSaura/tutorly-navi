import { describe, expect, it } from 'vitest';
import { evaluateQuestion, isQuizAnswerComplete, scoreQuestionWithPenalty } from './quizEvaluation';
import type { GuidedFamilyQ } from '@/types/quiz-bank';

const story: GuidedFamilyQ = { id: 'story', kind: 'guided-word-problem', prompt: 'Story', initial: 17, change: 9, operation: 'subtraction', object: 'apple' };
const groups: GuidedFamilyQ = { id: 'groups', kind: 'equal-groups', prompt: 'Groups', groups: 4, perGroup: 3, object: 'book' };
const grid: GuidedFamilyQ = { id: 'grid', kind: 'colour-grid', prompt: 'Grid', rows: 2, columns: 2, cells: ['red','blue','red','green'], targetColor: 'red' };

describe('guided families in existing quiz grading', () => {
  it('requires correct operation, completed model and answer, not a claimed success flag', () => {
    expect(evaluateQuestion(story, { correct: true, selectedAnswer: 8 })).toBe(false);
    const answer = { selectedAnswer: 8, selectedOperation: 'subtraction', modelActions: 9, modelComplete: true, complete: true };
    expect(evaluateQuestion(story, answer)).toBe(true);
    expect(evaluateQuestion(story, { ...answer, selectedOperation: 'addition' })).toBe(false);
    expect(evaluateQuestion(story, { ...answer, modelActions: 0 })).toBe(false);
    expect(isQuizAnswerComplete(story, { ...answer, complete: false })).toBe(false);
    expect(isQuizAnswerComplete(story, answer)).toBe(true);
  });
  it('requires all equal groups, and validates colour counts deterministically', () => {
    expect(evaluateQuestion(groups, { builtGroups: 3, selectedAnswer: 12 })).toBe(false);
    expect(evaluateQuestion(groups, { builtGroups: 4, selectedAnswer: 12 })).toBe(true);
    expect(evaluateQuestion(grid, { selectedAnswer: 2 })).toBe(true);
    expect(evaluateQuestion(grid, { selectedAnswer: 4 })).toBe(false);
  });
  it('uses the existing penalty policy for internal errors followed by a correct solve', () => {
    expect(scoreQuestionWithPenalty(2, 1, true).awardedPoints).toBe(2);
    expect(scoreQuestionWithPenalty(2, 2, true).awardedPoints).toBe(1);
    expect(scoreQuestionWithPenalty(0, 2, true).awardedPoints).toBe(0);
  });
});
