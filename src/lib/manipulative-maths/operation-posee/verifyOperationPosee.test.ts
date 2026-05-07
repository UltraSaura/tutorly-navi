import { describe, expect, it } from 'vitest';
import type { OperationPoseeExercise } from './operationPoseeTypes';
import { verifyOperationPosee } from './verifyOperationPosee';

const subtractionExercise: OperationPoseeExercise = {
  id: 'operation-posee-325-148',
  type: 'operation-posee',
  operation: 'subtraction',
  topNumber: 325,
  bottomNumber: 148,
  prompt: 'Pose et calcule : 325 − 148',
  locale: 'fr',
};

describe('verifyOperationPosee', () => {
  it('validates 325 - 148 = 177', () => {
    const result = verifyOperationPosee(subtractionExercise, {
      resultDigits: ['1', '7', '7'],
      carryBoxes: ['', '1', '1'],
    });

    expect(result.correct).toBe(true);
    expect(result.resultCorrect).toBe(true);
    expect(result.carryCorrect).toBe(true);
    expect(result.expectedResultDigits).toEqual(['1', '7', '7']);
    expect(result.message).toBe("Bravo ! L'opération est correcte.");
  });

  it('expects borrow marks in the units and tens columns for 325 - 148', () => {
    const result = verifyOperationPosee(subtractionExercise, {
      resultDigits: ['1', '7', '7'],
      carryBoxes: ['', '1', '1'],
    });

    expect(result.expectedCarryBoxes).toEqual(['', '1', '1']);
  });

  it('marks incorrect result digits as resultCorrect false', () => {
    const result = verifyOperationPosee(subtractionExercise, {
      resultDigits: ['1', '8', '7'],
      carryBoxes: ['', '1', '1'],
    });

    expect(result.correct).toBe(false);
    expect(result.resultCorrect).toBe(false);
    expect(result.carryCorrect).toBe(true);
    expect(result.message).toBe('Pas encore. Vérifie les chiffres du résultat et les retenues / emprunts.');
  });

  it('marks incorrect borrow boxes as carryCorrect false', () => {
    const result = verifyOperationPosee(subtractionExercise, {
      resultDigits: ['1', '7', '7'],
      carryBoxes: ['', '', '1'],
    });

    expect(result.correct).toBe(false);
    expect(result.resultCorrect).toBe(true);
    expect(result.carryCorrect).toBe(false);
  });

  it('supports addition with carry boxes', () => {
    const result = verifyOperationPosee({
      id: 'operation-posee-58-76',
      type: 'operation-posee',
      operation: 'addition',
      topNumber: 58,
      bottomNumber: 76,
      locale: 'fr',
    }, {
      resultDigits: ['1', '3', '4'],
      carryBoxes: ['1', '1', ''],
    });

    expect(result.correct).toBe(true);
    expect(result.expectedResultDigits).toEqual(['1', '3', '4']);
    expect(result.expectedCarryBoxes).toEqual(['1', '1', '']);
  });
});
