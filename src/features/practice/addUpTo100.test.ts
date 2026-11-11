import { describe, expect, it } from 'vitest';
import { ADD_UP_TO_100_STEPS, isCorrectAddUpAnswer, nextAddUpValue } from './addUpTo100';

describe('Add up to 100 lesson logic', () => {
  it('checks the observed lesson answers without treating nearby values as correct', () => {
    expect(ADD_UP_TO_100_STEPS.map((step) => step.target)).toEqual([30, 60, 67, 100, 52]);
    expect(isCorrectAddUpAnswer(ADD_UP_TO_100_STEPS[3], 100)).toBe(true);
    expect(isCorrectAddUpAnswer(ADD_UP_TO_100_STEPS[3], 99)).toBe(false);
  });

  it('adds one or ten dots without overshooting the step target', () => {
    expect(nextAddUpValue(30, 10, 60)).toBe(40);
    expect(nextAddUpValue(97, 10, 100)).toBe(100);
  });
});
