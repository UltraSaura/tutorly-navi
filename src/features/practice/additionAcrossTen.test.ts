import { describe, expect, it } from 'vitest';
import { additionAcrossTenTotal, countersToNextTen, createAdditionAcrossTenExercise, isValidAdditionAcrossTenExercise, makeAdditionAcrossTenChoices } from './additionAcrossTen';

describe('addition across ten exercise contract', () => {
  it('creates CE1-sized examples with a valid bridge and choices', () => {
    const exercise = createAdditionAcrossTenExercise(() => 0.5);
    expect(isValidAdditionAcrossTenExercise(exercise)).toBe(true);
    expect(exercise.startNumber).toBe(505);
    expect(exercise.addend).toBe(8);
    expect(countersToNextTen(exercise.startNumber)).toBe(5);
    expect(additionAcrossTenTotal(exercise)).toBe(513);
    expect(exercise.answerChoices).toContain(513);
  });

  it('keeps generated totals within 1000', () => {
    const exercise = createAdditionAcrossTenExercise(() => 0.999);
    expect(isValidAdditionAcrossTenExercise(exercise)).toBe(true);
    expect(additionAcrossTenTotal(exercise)).toBeLessThanOrEqual(1000);
  });

  it('rejects additions that do not cross the next ten or have inconsistent answers', () => {
    const valid = { id: 'valid-1', startNumber: 247, addend: 8, answerChoices: [255, 254, 256, 265] };
    expect(isValidAdditionAcrossTenExercise(valid)).toBe(true);
    expect(isValidAdditionAcrossTenExercise({ ...valid, addend: 2 })).toBe(false);
    expect(isValidAdditionAcrossTenExercise({ ...valid, answerChoices: [1, 2, 3, 4] })).toBe(false);
  });

  it('derives four unique choices including the correct total', () => {
    const choices = makeAdditionAcrossTenChoices(255, () => 0.5);
    expect(choices).toHaveLength(4);
    expect(new Set(choices).size).toBe(4);
    expect(choices).toContain(255);
  });
});
