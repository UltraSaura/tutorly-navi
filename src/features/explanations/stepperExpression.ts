import { extractExpressionFromText } from '@/utils/mathStepper/parser';
import { analyzeExerciseProfile, detectOperationType, generateProfileMatchedExample } from '@/utils/operationTypeDetector';
import { isSupportedDivision, parseSourceDivision } from './quickExplanation';

/** Keep the worked calculation aligned with the arithmetic shown to the learner. */
export function getStepperExpression(exerciseText: string, exampleText?: string): string {
  if (isSupportedDivision(exerciseText)) {
    const division = parseSourceDivision(exerciseText)!;
    return `${division.dividend} ÷ ${division.divisor}`;
  }

  const exerciseExpression = extractExpressionFromText(exerciseText);
  if (exerciseExpression) return exerciseExpression;

  const operation = detectOperationType(exerciseText).type;
  if (operation !== 'unknown') {
    return generateProfileMatchedExample(analyzeExerciseProfile(exerciseText)).replace(/\s*=\s*.+$/, '');
  }

  return (exampleText ? extractExpressionFromText(exampleText) : null) || '2 + 3';
}
