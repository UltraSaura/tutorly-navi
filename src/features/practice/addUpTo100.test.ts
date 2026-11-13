import { describe, expect, it } from 'vitest';
import { ADD_UP_TO_100_STEPS, isCorrectAddUpAnswer, nextAddUpValue } from './addUpTo100';

describe('Add up to 100 lesson logic', () => {
  it('checks the observed lesson answers without treating nearby values as correct', () => {
    expect(ADD_UP_TO_100_STEPS.map((step) => step.target)).toEqual([30, 30, 60, 67, 33, 52]);
    expect(ADD_UP_TO_100_STEPS.map((step) => step.id)).toEqual(['count-groups', 'name-30', 'add-30', 'name-67', 'make-100', 'symbolic']);
    expect(ADD_UP_TO_100_STEPS[0].mode).toBe('tens');
    expect(ADD_UP_TO_100_STEPS[1].mode).toBe('choice');
    expect(ADD_UP_TO_100_STEPS[1].choices).toEqual([30, 40, 50, 300]);
    expect(ADD_UP_TO_100_STEPS[1].choices).toContain(ADD_UP_TO_100_STEPS[1].target);
    expect(isCorrectAddUpAnswer(ADD_UP_TO_100_STEPS[4], 33)).toBe(true);
    expect(isCorrectAddUpAnswer(ADD_UP_TO_100_STEPS[4], 100)).toBe(false);
    expect(isCorrectAddUpAnswer(ADD_UP_TO_100_STEPS[5], 52)).toBe(true);
  });

  it('adds one or ten dots without overshooting the step target', () => {
    expect(nextAddUpValue(0, 10, 30)).toBe(10);
    expect(nextAddUpValue(10, 10, 30)).toBe(20);
    expect(nextAddUpValue(20, 10, 30)).toBe(30);
    expect(nextAddUpValue(30, 10, 60)).toBe(40);
    expect(nextAddUpValue(97, 10, 100)).toBe(100);
  });
});
