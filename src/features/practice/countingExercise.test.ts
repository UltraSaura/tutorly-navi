import { describe, expect, it } from 'vitest';
import { createCountingExercise, createDifferentCountingExercise, countingExerciseTotal, isValidCountingExercise } from './countingExercise';

const authoredExercise = {
  schemaVersion: 1 as const,
  id: 'authored-apples-1',
  object: 'apple' as const,
  startingGroups: 1,
  startingOnes: 3,
  groupsToAdd: 1,
  answerChoices: [23, 13, 33, 24],
};

describe('reusable count-in-groups exercise data', () => {
  it('accepts an authored exercise instance without hard-coded pen content', () => {
    expect(isValidCountingExercise(authoredExercise)).toBe(true);
    expect(countingExerciseTotal(authoredExercise)).toBe(23);
  });

  it('generates small varied examples from the same exercise contract', () => {
    const exercise = createCountingExercise(() => 0.5);
    expect(isValidCountingExercise(exercise)).toBe(true);
    expect(exercise.object).toBe('book');
    expect(countingExerciseTotal(exercise)).toBeLessThanOrEqual(50);
    expect(exercise.answerChoices).toContain(countingExerciseTotal(exercise));
  });

  it('rejects incomplete or mathematically inconsistent generated data', () => {
    expect(isValidCountingExercise({ ...authoredExercise, answerChoices: [13, 14, 15, 16] })).toBe(false);
    expect(isValidCountingExercise({ ...authoredExercise, startingGroups: 11 })).toBe(false);
    expect(isValidCountingExercise({ ...authoredExercise, object: 'unknown' })).toBe(false);
  });

  it('changes the answer total when a learner requests another exercise', () => {
    const next = createDifferentCountingExercise(authoredExercise, () => 0.5);
    expect(countingExerciseTotal(next)).not.toBe(countingExerciseTotal(authoredExercise));
    expect(isValidCountingExercise(next)).toBe(true);
  });
});
