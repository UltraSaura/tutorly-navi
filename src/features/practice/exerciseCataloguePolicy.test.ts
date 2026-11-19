import { describe, expect, it } from 'vitest';
import { canAuthorExercise, canAuthorExerciseType, canUseExerciseForLearner, arithmeticDifficulty, EXERCISE_TYPE_LEVELS } from './exerciseCurriculum';
import { createGuidedFamilyExercise } from './guidedFamilies';
import { SCHOOL_LEVELS } from '@/domain/schoolLevels';

const context = (levelCode: string) => ({ topics: [{ countryCode: 'fr', levelCode, subject: 'Mathématiques', category: 'Nombres et calcul' }] });
describe('bank-only exercise catalogue policy', () => {
  it('keeps colour counting CP-only in both authoring and learner paths, including legacy untagged payloads', () => {
    const colour = createGuidedFamilyExercise('colour-grid', () => 0.4);
    for (const level of SCHOOL_LEVELS) {
      expect(canAuthorExerciseType('colour-grid', context(level.code))).toBe(level.code === 'cp');
      expect(canUseExerciseForLearner(colour, 'fr', level.code)).toBe(level.code === 'cp');
    }
    expect(canAuthorExercise(colour, context('cp'))).toBe(true);
    expect(canAuthorExercise(colour, { topics: [...context('cp').topics, ...context('5eme').topics] })).toBe(false);
    expect(canUseExerciseForLearner(colour, null, 'cp')).toBe(false);
    expect(canUseExerciseForLearner(colour, 'be', 'cp')).toBe(false);
    expect(canUseExerciseForLearner({ ...colour, schoolLevels: ['5eme'] }, 'fr', 'cp')).toBe(false);
    expect(canAuthorExerciseType('colour-grid')).toBe(false);
  });
  it('provides races and flashcards for every supported school level with bounded difficulty', () => {
    for (const level of SCHOOL_LEVELS) {
      expect(EXERCISE_TYPE_LEVELS['calculation-race']).toContain(level.code);
      expect(canAuthorExerciseType('number-flashcards', context(level.code))).toBe(true);
    }
    expect(arithmeticDifficulty('cp')).toMatchObject({ maxDigits: 2, operations: ['addition', 'subtraction'], allowNegative: false });
    expect(arithmeticDifficulty('5ème').maxDigits).toBe(7);
    const exercise = { id: 'series', prompt: 'Calcule.', kind: 'calculation-race', operations: ['addition'], leftDigits: 1, rightDigits: 1,
      problems: [{ id: 'a', operation: 'addition', left: 3, right: 4, choices: [5, 6, 7, 8] }] };
    expect(canUseExerciseForLearner(exercise, 'fr', 'cp')).toBe(true);
    expect(canUseExerciseForLearner({ ...exercise, leftDigits: 7 }, 'fr', 'cp')).toBe(false);
    expect(canUseExerciseForLearner({ ...exercise, leftDigits: 7 }, 'fr', '5eme')).toBe(true);
    expect(canUseExerciseForLearner({ ...exercise, operations: ['division'] }, 'fr', 'cp')).toBe(false);
    expect(canUseExerciseForLearner({ ...exercise, operations: ['subtraction'], problems: [{ id:'a', operation:'subtraction', left:3, right:4, choices:[-1,0,1,2] }] }, 'fr', 'cp')).toBe(false);
  });
  it('keeps unrelated existing question formats and rejects malformed/new-type context mismatches', () => {
    expect(canUseExerciseForLearner({ kind: 'numeric', answer: 2 }, 'fr', '5eme')).toBe(true);
    expect(canAuthorExercise({kind:'numeric'}, undefined)).toBe(true);
    expect(canUseExerciseForLearner({kind:'colour-grid'}, 'fr', 'cp')).toBe(false);
    expect(canAuthorExerciseType('counting', context('5eme'))).toBe(false);
    expect(canAuthorExerciseType('guided-word-problem', context('cp'))).toBe(true);
    expect(canAuthorExerciseType('equal-groups', context('cp'))).toBe(false);
  });
});
