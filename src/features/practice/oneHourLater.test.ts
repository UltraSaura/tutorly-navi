import { describe, expect, it } from 'vitest';
import { clockHourChoices, createClockExercise, isClockExercise, oneHourLater } from './oneHourLater';

describe('one hour later practice', () => {
  it('moves forward one hour and wraps from 12 to 1', () => {
    expect(oneHourLater(3)).toBe(4);
    expect(oneHourLater(11)).toBe(12);
    expect(oneHourLater(12)).toBe(1);
  });

  it('creates four distinct clock choices including the correct hour', () => {
    for (let hour = 1; hour <= 12; hour += 1) {
      const choices = clockHourChoices(hour, () => 0.4);
      expect(choices).toHaveLength(4);
      expect(new Set(choices).size).toBe(4);
      expect(choices).toContain(oneHourLater(hour));
      expect(choices.every((choice) => choice >= 1 && choice <= 12)).toBe(true);
    }
  });

  it('creates and validates generated exercises while rejecting malformed saved data', () => {
    const exercise = createClockExercise(() => 0.99);
    expect(exercise.startHour).toBe(12);
    expect(isClockExercise(exercise)).toBe(true);
    expect(isClockExercise({ ...exercise, choices: [1, 1, 2, 3] })).toBe(false);
    expect(isClockExercise({ ...exercise, startHour: 13 })).toBe(false);
  });
});
