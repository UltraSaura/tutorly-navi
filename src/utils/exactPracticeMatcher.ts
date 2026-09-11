import type { Question } from '@/types/quiz-bank';
import { analyzeExerciseProfile, type ExerciseProfile } from './operationTypeDetector';

export function getExactPracticeTags(exercise: string): string[] {
  const profile = analyzeExerciseProfile(exercise);
  const tags = [
    'math',
    `operation:${profile.operationType}`,
    `format:${profile.operand1Digits}-by-${profile.operand2Digits}`,
  ];

  if (profile.operationType === 'division') tags.push(`division:${profile.divisionKind}`);
  if (profile.operationType === 'multiplication' && (profile.operand1TrailingZeros || profile.operand2TrailingZeros)) {
    tags.push('strategy:trailing-zeros');
  }
  if (profile.requiresCarry) tags.push('strategy:carry');
  if (profile.requiresBorrow) tags.push('strategy:borrow');

  return tags;
}

function questionExpression(question: Question): string {
  if (question.kind === 'column-fill') return question.operands.join(` ${question.operation} `);
  return question.prompt || '';
}

function samePracticeStructure(target: ExerciseProfile, candidate: ExerciseProfile): boolean {
  if (target.operationType === 'unknown' || target.operationType !== candidate.operationType) return false;
  if (target.numberKind !== candidate.numberKind) return false;
  if (target.operand1Digits !== candidate.operand1Digits || target.operand2Digits !== candidate.operand2Digits) return false;
  if (target.operationType === 'division' && target.divisionKind !== candidate.divisionKind) return false;
  if (target.operationType === 'multiplication' &&
    (target.operand1TrailingZeros !== candidate.operand1TrailingZeros || target.operand2TrailingZeros !== candidate.operand2TrailingZeros)) return false;
  return true;
}

export function matchesExactPractice(exercise: string, question: Question): boolean {
  return samePracticeStructure(analyzeExerciseProfile(exercise), analyzeExerciseProfile(questionExpression(question)));
}
