import { describe, expect, it } from 'vitest';
import {
  createGuidedFamilyExercise, guidedFamilyAnswer, guidedFamilyPrompt, isGuidedFamilyAnswerCorrect,
  isGuidedFamilyExercise, makeGuidedFamilyChoices, validateGuidedFamilyExercise,
  type GuidedFamilyExercise, type GuidedFamilyKind, type GuidedFamilyState,
} from './guidedFamilies';

const word: GuidedFamilyExercise = { id: 'story', prompt: 'Old text for a different question', kind: 'guided-word-problem', operation: 'subtraction', initial: 8, change: 3, object: 'apple' };
const groups: GuidedFamilyExercise = { id: 'groups', prompt: 'Build groups', kind: 'equal-groups', groups: 3, perGroup: 4, object: 'pencil' };
const grid: GuidedFamilyExercise = { id: 'grid', prompt: 'Count blue', kind: 'colour-grid', rows: 2, columns: 3, cells: ['blue', 'red', 'green', 'blue', 'yellow', 'blue'], targetColor: 'blue' };
const state: GuidedFamilyState = { selectedAnswer: 5, selectedOperation: 'subtraction', modelActions: 3, modelComplete: true, attempts: 1, supported: false, complete: true };

function seeded(seed: number) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}

describe('guided family arithmetic and validation', () => {
  it('calculates from quantities, not supplied prose', () => {
    expect(guidedFamilyAnswer(word)).toBe(5);
    expect(guidedFamilyAnswer(groups)).toBe(12);
    expect(guidedFamilyAnswer(grid)).toBe(3);
  });

  it.each(['guided-word-problem', 'equal-groups', 'colour-grid'] as GuidedFamilyKind[])('generates valid reusable %s examples with four choices', kind => {
    const random = seeded(438);
    for (let index = 0; index < 200; index++) {
      const exercise = createGuidedFamilyExercise(kind, random);
      expect(validateGuidedFamilyExercise(exercise)).toEqual([]);
      const choices = makeGuidedFamilyChoices(exercise);
      expect(choices).toHaveLength(4);
      expect(new Set(choices).size).toBe(4);
      expect(choices).toContain(guidedFamilyAnswer(exercise));
      expect(choices.every(value => Number.isInteger(value) && value >= 0 && value <= 100)).toBe(true);
      expect(makeGuidedFamilyChoices(exercise)).toEqual(choices);
    }
  });

  it.each([0, 1, 99, 100])('has four distinct choices at the boundary %s', answer => {
    const exercise: GuidedFamilyExercise = { ...word, operation: 'addition', initial: answer === 0 ? 1 : answer - 1, change: 1 };
    if (answer === 0 && exercise.kind === 'guided-word-problem') exercise.operation = 'subtraction';
    expect(guidedFamilyAnswer(exercise)).toBe(answer);
    expect(makeGuidedFamilyChoices(exercise)).toHaveLength(4);
    expect(new Set(makeGuidedFamilyChoices(exercise)).size).toBe(4);
  });

  it('rejects negative, fractional, unsafe, unsupported and impossible configurations', () => {
    for (const value of [null, {}, { ...word, initial: -1 }, { ...word, change: 0 }, { ...word, initial: 2.5 }, { ...word, change: 9 }, { ...word, object: 'unknown' }, { ...word, operation: 'division' }, { ...word, initial: 99, change: 3, operation: 'addition' }, { ...groups, groups: 11 }, { ...groups, perGroup: Infinity }, { ...grid, cells: ['red'] }, { ...grid, columns: 9 }, { ...grid, targetColor: 'purple' }, { ...grid, cells: ['red', 'red', 'red', 'red', 'red', 'purple'] }, { ...grid, points: -1 }]) {
      expect(isGuidedFamilyExercise(value), JSON.stringify(value)).toBe(false);
    }
  });

  it('does not trust a completion flag or a correct number without the required model', () => {
    expect(isGuidedFamilyAnswerCorrect(word, state)).toBe(true);
    expect(isGuidedFamilyAnswerCorrect(word, { ...state, selectedOperation: 'addition' })).toBe(false);
    expect(isGuidedFamilyAnswerCorrect(word, { ...state, modelActions: 0 })).toBe(false);
    expect(isGuidedFamilyAnswerCorrect(word, { ...state, modelComplete: false })).toBe(false);
    expect(isGuidedFamilyAnswerCorrect(word, { ...state, selectedAnswer: 4, complete: true })).toBe(false);
    expect(isGuidedFamilyAnswerCorrect(groups, { ...state, selectedAnswer: 12, builtGroups: 2 })).toBe(false);
    expect(isGuidedFamilyAnswerCorrect(groups, { ...state, selectedAnswer: 12, builtGroups: 3 })).toBe(true);
    expect(isGuidedFamilyAnswerCorrect(grid, { ...state, selectedAnswer: 3 })).toBe(true);
  });

  it('builds fresh localized prompts when authored quantities and object change', () => {
    expect(guidedFamilyPrompt(word)).toBe('Il y a 8 pommes. On enlève 3 pommes. Combien en reste-t-il ?');
    expect(guidedFamilyPrompt({ ...word, initial: 1, change: 1, object: 'book' })).toContain('Il y a 1 livre. On enlève 1 livre.');
    expect(guidedFamilyPrompt({ ...word, object: 'star', operation: 'addition' }, 'en')).toContain('There are 8 stars. 3 more are added.');
    expect(guidedFamilyPrompt(groups)).toContain('3 groupes de 4 crayons');
    expect(guidedFamilyPrompt(grid, 'en')).toBe('Count only the blue tiles.');
  });
});
