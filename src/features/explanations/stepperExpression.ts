import { extractExpressionFromText } from '@/utils/mathStepper/parser';
import { containsOriginalExercise, detectOperationType, generateDifferentExample, validateExampleOperationType } from '@/utils/operationTypeDetector';
import { isSupportedDivision, parseSourceDivision } from './quickExplanation';

/** Teach a different example, including when cached/provider text repeats the input. */
export function getStepperExpression(exerciseText: string, exampleText?: string): string {
  const division = isSupportedDivision(exerciseText) ? parseSourceDivision(exerciseText) : null;
  const source = division
    ? `${division.dividend} ÷ ${division.divisor}`
    : extractExpressionFromText(exerciseText) || exerciseText;
  try {
    const example = exampleText ? extractExpressionFromText(exampleText) : null;
    if (example && !containsOriginalExercise(source, example) &&
        (detectOperationType(source).type === 'unknown' || validateExampleOperationType(source, example).isValid)) return example;

    const different = generateDifferentExample(source).replace(/\s*=\s*.+$/, '');
    return containsOriginalExercise(source, different) ? '' : different;
  } catch {
    // An unavailable safe example disables the animator, never substitutes the source.
    return '';
  }
}
