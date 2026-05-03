import { describe, expect, it } from 'vitest';
import { getExerciseChoices } from './responseOptions';

describe('getExerciseChoices', () => {
  it('returns default Vrai/Faux choices for true/false exercises', () => {
    expect(getExerciseChoices({ responseType: 'true_false' })).toEqual(['Vrai', 'Faux']);
  });

  it('returns explicit choices when they are provided', () => {
    expect(getExerciseChoices({ responseType: 'true_false', choices: ['True', 'False'] })).toEqual(['True', 'False']);
  });

  it('does not add choices to regular text exercises', () => {
    expect(getExerciseChoices({ responseType: 'text' })).toEqual([]);
  });
});
