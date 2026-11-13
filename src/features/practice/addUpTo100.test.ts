import { describe, expect, it } from 'vitest';
import { createDifferentPenCountChallenge, createPenCountChallenge, isValidPenCountChallenge, nextPenCountValue, penCountTotal } from './addUpTo100';

describe('Count the pens challenge', () => {
  it('builds a varied count from bundles and single pens', () => {
    const challenge = createPenCountChallenge(() => 0.5);
    expect(challenge).toMatchObject({ startingTens: 3, startingOnes: 5, addedTens: 3 });
    expect(penCountTotal(challenge)).toBe(65);
    expect(challenge.answerChoices).toHaveLength(4);
    expect(new Set(challenge.answerChoices).size).toBe(4);
    expect(challenge.answerChoices).toContain(65);
  });

  it('keeps every generated total at or below 100, including the edge of the range', () => {
    const challenge = createPenCountChallenge(() => 0.999999);
    expect(penCountTotal(challenge)).toBe(99);
    expect(isValidPenCountChallenge(challenge)).toBe(true);
    expect(penCountTotal(createPenCountChallenge(() => 0))).toBe(20);
  });

  it('ensures the next round uses a different total', () => {
    const previous = createPenCountChallenge(() => 0.5);
    const next = createDifferentPenCountChallenge(previous, () => 0.5);
    expect(penCountTotal(next)).not.toBe(penCountTotal(previous));
    expect(isValidPenCountChallenge(next)).toBe(true);
  });

  it('rejects saved challenge data with invalid choices or totals', () => {
    expect(isValidPenCountChallenge({ startingTens: 6, startingOnes: 0, addedTens: 1, answerChoices: [70, 60, 80, 71] })).toBe(false);
    expect(isValidPenCountChallenge({ startingTens: 3, startingOnes: 5, addedTens: 2, answerChoices: [55, 55, 45, 65] })).toBe(false);
  });

  it('adds one bundle at a time and stops at the target', () => {
    expect(nextPenCountValue(35, 55)).toBe(45);
    expect(nextPenCountValue(45, 55)).toBe(55);
    expect(nextPenCountValue(55, 55)).toBe(55);
  });
});
