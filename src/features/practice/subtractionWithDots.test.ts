import { describe, expect, it } from 'vitest';
import { countSubtractionObjectsByColor, createSubtractionWithDotsExercise, isValidSubtractionWithDotsExercise, makeScatteredObjectPositions, makeSubtractionWithDotsChoices, makeSubtractionWithDotsEquationChoices, SUBTRACTION_COLORS, subtractionColorToCount, subtractionObjectColor, subtractionObjectName, subtractionWithDotsTotal } from './subtractionWithDots';

describe('subtraction with bubbles', () => {
  it('creates a valid within-ten subtraction and four unique answers', () => {
    const exercise = createSubtractionWithDotsExercise(() => 0);
    expect(exercise.targetCount).toBe(6);
    expect(subtractionWithDotsTotal(exercise)).toBe(5);
    expect(exercise.answerChoices).toHaveLength(4);
    expect(new Set(exercise.answerChoices).size).toBe(4);
    expect(isValidSubtractionWithDotsExercise(exercise)).toBe(true);
  });

  it('varies countable objects and uses correct singular and plural names', () => {
    expect(createSubtractionWithDotsExercise(() => 0.99).object).toBe('star');
    expect(subtractionObjectName('pencil', 1)).toBe('pencil');
    expect(subtractionObjectName('pencil', 3)).toBe('pencils');
    expect(subtractionObjectName(undefined, 2)).toBe('bubbles');
  });

  it('makes stable scattered positions across the model area', () => {
    const positions = makeScatteredObjectPositions(10, 'exercise-one');
    expect(makeScatteredObjectPositions(10, 'exercise-one')).toEqual(positions);
    expect(new Set(positions.map(({ left, top }) => `${left},${top}`)).size).toBe(10);
    expect(new Set(positions.map(({ top }) => top)).size).toBeGreaterThan(2);
    expect(positions.every(({ left, top }) => left >= 10 && left <= 90 && top >= 15 && top <= 85)).toBe(true);
    expect(makeScatteredObjectPositions(10, 'exercise-two')).not.toEqual(positions);
  });

  it('assigns a stable, varied color to every object for color-count questions', () => {
    const colors = Array.from({ length: SUBTRACTION_COLORS.length }, (_, index) => subtractionObjectColor(index, 'color-count-test'));
    expect(new Set(colors).size).toBe(SUBTRACTION_COLORS.length);
    expect(subtractionObjectColor(2, 'color-count-test')).toBe(colors[2]);
    expect(countSubtractionObjectsByColor(6, 'color-count-test', colors[0])).toBe(1);
    const requestedColor = subtractionColorToCount('color-count-test', 3);
    expect(countSubtractionObjectsByColor(3, 'color-count-test', requestedColor)).toBeGreaterThan(0);
  });

  it('rejects an impossible take-away amount', () => {
    expect(isValidSubtractionWithDotsExercise({ id: 'bad', targetCount: 6, takeAway: 6, answerChoices: [0, 1, 2, 3] })).toBe(false);
  });

  it('supports authored exercises up to 100 and generates choices inside that range', () => {
    const answerChoices = makeSubtractionWithDotsChoices(75, () => 0.5, 100);
    const exercise = { id: 'subtract-100', targetCount: 100, takeAway: 25, answerChoices };
    expect(isValidSubtractionWithDotsExercise(exercise)).toBe(true);
    expect(answerChoices).toContain(75);
    expect(answerChoices.every((choice) => choice >= 0 && choice <= 100)).toBe(true);
    expect(makeScatteredObjectPositions(100, 'hundred-objects')).toHaveLength(100);
  });

  it('keeps older bubble exercises valid while rejecting unknown object types', () => {
    const legacyExercise = { id: 'legacy-bubble', targetCount: 6, takeAway: 1, answerChoices: [5, 4, 3, 2] };
    expect(isValidSubtractionWithDotsExercise(legacyExercise)).toBe(true);
    expect(isValidSubtractionWithDotsExercise({ ...legacyExercise, object: 'unknown' })).toBe(false);
  });

  it('keeps answer options inside the configured number range', () => {
    for (const answer of [1, 2, 5, 9]) {
      const choices = makeSubtractionWithDotsChoices(answer, () => 0.5, 10);
      expect(choices).toHaveLength(4);
      expect(choices).toContain(answer);
      expect(new Set(choices).size).toBe(4);
      expect(choices.every((choice) => choice >= 0 && choice <= 10)).toBe(true);
    }
  });

  it('offers the matching subtraction expression first', () => {
    expect(makeSubtractionWithDotsEquationChoices(8, 5)[0]).toBe('8 − 5');
  });
});
