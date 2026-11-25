import { describe, expect, it } from 'vitest';
import { getLocalArithmeticExample, getStepperExpression } from './stepperExpression';
import { containsOriginalExercise, validateExampleOperationType } from '@/utils/operationTypeDetector';

describe('getStepperExpression never teaches the original exercise', () => {
  it.each(['33 × 4', '33 × 43', '7 + 5', '52 - 27', '300 × 4'])('chooses a different digit-matched local example for %s', source => {
    const example = getLocalArithmeticExample(source);
    expect(example).toBeTruthy();
    expect(containsOriginalExercise(source, example)).toBe(false);
    expect(validateExampleOperationType(source, example).isValid).toBe(true);
  });

  it('does not treat word problems or division as simple local arithmetic', () => {
    expect(getLocalArithmeticExample('33 apples × 4')).toBe('');
    expect(getLocalArithmeticExample('33 ÷ 3')).toBe('');
  });
  it.each(['33*3', '66*6', '22*4', '300 × 4', '33 × 43', '7 + 5', '52 - 27', '12.5 × 2.0'])('uses a different comparable example for %s', source => {
    const example = getStepperExpression(source);
    expect(containsOriginalExercise(source, example)).toBe(false);
    expect(validateExampleOperationType(source, example).isValid).toBe(true);
  });

  it.each(['66 × 6', '6 * 66', '066 × 6.0', '66 \\times 6'])('rejects equivalent supplied examples: %s', example => {
    expect(containsOriginalExercise('66*6', getStepperExpression('66*6', example))).toBe(false);
  });

  it('disables the animator when no different comparable example is available', () => {
    expect(getStepperExpression('75% ÷ 25%')).toBe('');
  });

  it('uses the supplied different worked example', () => {
    expect(getStepperExpression('22*4', '33 × 4')).toBe('33 × 4');
  });

  it('does not animate the original division, including colon notation', () => {
    const example = getStepperExpression('Pose la division 33:3');
    expect(containsOriginalExercise('33 ÷ 3', example)).toBe(false);
    expect(validateExampleOperationType('33 ÷ 3', example).isValid).toBe(true);
  });

  it('extracts the source operation from prose only to exclude it', () => {
    expect(getStepperExpression('Calculate 18 + 7', '24 + 9')).toBe('24 + 9');
  });

  it('uses the supplied worked example for a non-arithmetic prompt', () => {
    expect(getStepperExpression('Find the total', '14 × 3 = 42')).toBe('14 × 3');
  });
});
