import { describe, expect, it } from 'vitest';
import { analyzeExerciseProfile, generateProfileMatchedExample, validateExampleOperationType } from './operationTypeDetector';

describe('profile-matched arithmetic examples', () => {
  it('preserves operand lengths and trailing zeros for multiplication', () => {
    const exercise = '100 × 2';
    const example = generateProfileMatchedExample(analyzeExerciseProfile(exercise));

    expect(example).toBe('300 × 4 = 1200');
    expect(validateExampleOperationType(exercise, example)).toMatchObject({ isValid: true });
  });

  it('rejects a multiplication example with a different written shape', () => {
    const validation = validateExampleOperationType('100 × 2', '321 × 4 = 1284');

    expect(validation.isValid).toBe(false);
    expect(validation.reason).toBe('Different trailing-zero structure');
  });

  it('preserves both operand lengths and the remainder structure for division', () => {
    const exercise = '100 ÷ 45';
    const example = generateProfileMatchedExample(analyzeExerciseProfile(exercise));

    expect(example).toBe('122 ÷ 48 = 2 reste 26');
    expect(validateExampleOperationType(exercise, example)).toMatchObject({ isValid: true });
  });
});
