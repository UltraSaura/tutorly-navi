import { analyzeExerciseProfile } from './operationTypeDetector';
import type { Choice, QuizBank, Question } from '@/types/quiz-bank';

function operand(length: number, first: number, fill: number, trailingZeros = 0): bigint {
  const zeroCount = Math.min(trailingZeros, Math.max(0, length - 1));
  const significant = Math.max(1, length - zeroCount);
  return BigInt(`${first}${String(fill).repeat(significant - 1)}${'0'.repeat(zeroCount)}`);
}

/**
 * Creates written calculations for the same animated worked-example module.
 * It preserves operation, operand lengths, multiplication zeros, and division type.
 */
export function buildSimilarArithmeticExercises(exercise: string): string[] | null {
  return buildSimilarOperations(exercise)?.map(operation => operation.expression) ?? null;
}

type GeneratedOperation = { expression: string; answer: string };

function buildSimilarOperations(exercise: string): GeneratedOperation[] | null {
  const profile = analyzeExerciseProfile(exercise);
  if (profile.numberKind !== 'integer' || profile.operationType === 'unknown') return null;

  return Array.from({ length: 3 }, (_, index) => {
    const preserveZeroStrategy = profile.operationType === 'multiplication';
    const left = operand(profile.operand1Digits, 2 + index, 3 + index, preserveZeroStrategy ? profile.operand1TrailingZeros : 0);
    const right = operand(profile.operand2Digits, 4 + index, 2 + index, preserveZeroStrategy ? profile.operand2TrailingZeros : 0);
    if (profile.operationType === 'addition') return { expression: `${left} + ${right}`, answer: (left + right).toString() };
    if (profile.operationType === 'subtraction') return { expression: `${left} − ${right}`, answer: (left - right).toString() };
    if (profile.operationType === 'multiplication') return { expression: `${left} × ${right}`, answer: (left * right).toString() };

    const divisor = right === 0n ? 2n : right;
    let dividend = left;
    if (profile.divisionKind === 'exact') dividend = divisor * ((left / divisor) + 1n);
    if (profile.divisionKind === 'remainder' && dividend % divisor === 0n) dividend += 1n;
    const quotient = dividend / divisor;
    const remainder = dividend % divisor;
    const answer = profile.divisionKind === 'remainder'
      ? `${quotient} ${remainder}`
      : quotient.toString();
    return { expression: `${dividend} ÷ ${divisor}`, answer };
  });
}

function choices(correct: string, alternatives: string[]): Choice[] {
  const labels = [correct, ...alternatives.filter(value => value !== correct).slice(0, 2)];
  for (let index = labels.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [labels[index], labels[swapIndex]] = [labels[swapIndex], labels[index]];
  }
  return labels.map((label, index) => ({ id: String.fromCharCode(65 + index), label, correct: label === correct }));
}

/** Builds a temporary quiz in the same UI used by authored quiz-bank quizzes. */
export function buildSimilarArithmeticQuiz(exercise: string, language: 'fr' | 'en'): QuizBank | null {
  const profile = analyzeExerciseProfile(exercise);
  const operations = buildSimilarOperations(exercise);
  if (!operations) return null;

  const questions: Question[] = operations.map((operation, index) => {
    const [quotient, remainder] = operation.answer.split(' ');
    const isRemainderDivision = profile.operationType === 'division' && profile.divisionKind === 'remainder';
    const correct = isRemainderDivision
      ? (language === 'fr' ? `${quotient} reste ${remainder}` : `${quotient} remainder ${remainder}`)
      : operation.answer;
    const alternatives = isRemainderDivision
      ? [
          language === 'fr' ? `${BigInt(quotient) + 1n} reste ${remainder}` : `${BigInt(quotient) + 1n} remainder ${remainder}`,
          language === 'fr' ? `${quotient} reste ${BigInt(remainder) + 1n}` : `${quotient} remainder ${BigInt(remainder) + 1n}`,
        ]
      : [
          (BigInt(operation.answer) + 1n).toString(),
          (BigInt(operation.answer) + 2n).toString(),
        ];
    return {
      id: `similar-${profile.operationType}-${index + 1}`,
      kind: 'single',
      prompt: `${operation.expression} = ?`,
      choices: choices(correct, alternatives),
    };
  });

  return {
    quizBankId: '__generated_similar_practice__',
    title: language === 'fr' ? '3 exercices du même type' : '3 exercises like this',
    description: language === 'fr' ? 'Même opération et même format de nombres.' : 'Same operation and number structure.',
    shuffle: false,
    questions,
  };
}
