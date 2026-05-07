import type {
  OperationPoseeExercise,
  OperationPoseeStudentState,
  OperationPoseeVerificationResult,
} from './operationPoseeTypes';

function numberText(value: number): string {
  return Math.abs(Math.trunc(value)).toString();
}

function digitsForNumber(value: number, width: number): string[] {
  return numberText(value).padStart(width, '0').split('');
}

function normalizeDigit(value: string | undefined): string {
  const trimmed = (value || '').trim();
  return /^\d$/.test(trimmed) ? trimmed : '';
}

function normalizeDigitArray(values: string[] | undefined, width: number): string[] {
  return Array.from({ length: width }, (_, index) => normalizeDigit(values?.[index]));
}

function operationResult(exercise: OperationPoseeExercise): number {
  return exercise.operation === 'addition'
    ? exercise.topNumber + exercise.bottomNumber
    : exercise.topNumber - exercise.bottomNumber;
}

function operationWidth(exercise: OperationPoseeExercise): number {
  return Math.max(
    numberText(exercise.topNumber).length,
    numberText(exercise.bottomNumber).length,
    numberText(operationResult(exercise)).length
  );
}

function buildAdditionExpectations(exercise: OperationPoseeExercise) {
  const width = operationWidth(exercise);
  const topDigits = digitsForNumber(exercise.topNumber, width).map(Number);
  const bottomDigits = digitsForNumber(exercise.bottomNumber, width).map(Number);
  const expectedResultDigits = digitsForNumber(operationResult(exercise), width);
  const expectedCarryBoxes = Array.from({ length: width }, () => '');

  let carry = 0;
  for (let index = width - 1; index >= 0; index -= 1) {
    const sum = topDigits[index] + bottomDigits[index] + carry;
    carry = sum >= 10 ? 1 : 0;
    if (carry && index > 0) {
      expectedCarryBoxes[index - 1] = '1';
    }
  }

  return { expectedResultDigits, expectedCarryBoxes };
}

function buildSubtractionExpectations(exercise: OperationPoseeExercise) {
  const width = operationWidth(exercise);
  const topDigits = digitsForNumber(exercise.topNumber, width).map(Number);
  const bottomDigits = digitsForNumber(exercise.bottomNumber, width).map(Number);
  const expectedResultDigits = digitsForNumber(operationResult(exercise), width);
  const expectedCarryBoxes = Array.from({ length: width }, () => '');

  let incomingBorrow = 0;
  for (let index = width - 1; index >= 0; index -= 1) {
    const adjustedTopDigit = topDigits[index] - incomingBorrow;
    if (adjustedTopDigit < bottomDigits[index]) {
      expectedCarryBoxes[index] = '1';
      incomingBorrow = 1;
    } else {
      incomingBorrow = 0;
    }
  }

  return { expectedResultDigits, expectedCarryBoxes };
}

function buildExpectations(exercise: OperationPoseeExercise) {
  return exercise.operation === 'addition'
    ? buildAdditionExpectations(exercise)
    : buildSubtractionExpectations(exercise);
}

export function verifyOperationPosee(
  exercise: OperationPoseeExercise,
  studentState: OperationPoseeStudentState
): OperationPoseeVerificationResult {
  const { expectedResultDigits, expectedCarryBoxes } = buildExpectations(exercise);
  const studentResultDigits = normalizeDigitArray(studentState.resultDigits, expectedResultDigits.length);
  const studentCarryBoxes = normalizeDigitArray(studentState.carryBoxes, expectedCarryBoxes.length);

  const resultCorrect = expectedResultDigits.every((digit, index) => studentResultDigits[index] === digit);
  const carryCorrect = expectedCarryBoxes.every((digit, index) => studentCarryBoxes[index] === digit);
  const correct = resultCorrect && carryCorrect;
  const message = correct
    ? "Bravo ! L'opération est correcte."
    : 'Pas encore. Vérifie les chiffres du résultat et les retenues / emprunts.';

  return {
    correct,
    resultCorrect,
    carryCorrect,
    expectedResultDigits,
    expectedCarryBoxes,
    studentState: {
      resultDigits: studentResultDigits,
      carryBoxes: studentCarryBoxes,
    },
    message,
  };
}

export const __operationPoseeTest = {
  buildAdditionExpectations,
  buildSubtractionExpectations,
  operationWidth,
};
