import { describe, expect, it } from 'vitest';
import { isArithmeticQuizExercise } from './arithmeticQuiz';
import { materializeArithmeticDeck, type ArithmeticDeckValidation } from './materializeArithmeticDeck';

const config: ArithmeticDeckValidation = {
  kind: 'number-flashcards', count: 2, leftDigits: 2, rightDigits: 2,
  allowedOperations: ['multiplication', 'division'], tableNumbers: [2, 3],
  schoolLevels: ['ce1'], allowNegative: false,
};
const source = {
  id: 'set-1', kind: 'number-flashcards', prompt: 'Choose an answer for each calculation.',
  problems: [
    { id: 'c1', operation: 'multiplication', left: 3, right: 4 },
    { id: 'c2', operation: 'division', left: 18, right: 3 },
  ],
};

describe('materializeArithmeticDeck', () => {
  it('derives four answer choices and curriculum metadata for each calculation', () => {
    const result = materializeArithmeticDeck(source, config);
    expect(result).not.toBeNull();
    expect(result?.curriculumCountry).toBe('fr');
    expect(result?.schoolLevels).toEqual(['ce1']);
    expect(result?.problems).toEqual([
      { id: 'c1', operation: 'multiplication', left: 3, right: 4, choices: expect.arrayContaining([12]) },
      { id: 'c2', operation: 'division', left: 18, right: 3, choices: expect.arrayContaining([6]) },
    ]);
    expect(isArithmeticQuizExercise(result)).toBe(true);
  });

  it('rejects a calculation outside the selected times table', () => {
    const invalid = { ...source, problems: [{ id: 'c1', operation: 'multiplication', left: 4, right: 5 }, source.problems[1]] };
    expect(materializeArithmeticDeck(invalid, config)).toBeNull();
  });

  it('rejects non-exact division and operands that exceed the selected digit limits', () => {
    expect(materializeArithmeticDeck({ ...source, problems: [{ id: 'c1', operation: 'division', left: 19, right: 3 }, source.problems[1]] }, config)).toBeNull();
    expect(materializeArithmeticDeck({ ...source, problems: [{ id: 'c1', operation: 'multiplication', left: 123, right: 2 }, source.problems[1]] }, config)).toBeNull();
  });

  it('rejects a missing calculation and duplicate calculations', () => {
    expect(materializeArithmeticDeck({ ...source, problems: [source.problems[0]] }, config)).toBeNull();
    expect(materializeArithmeticDeck({ ...source, problems: [source.problems[0], source.problems[0]] }, config)).toBeNull();
  });
});
