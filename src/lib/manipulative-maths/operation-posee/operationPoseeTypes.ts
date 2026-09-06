export type OperationPoseeOperation = 'addition' | 'subtraction';

export interface OperationPoseeExercise {
  id: string;
  type: 'operation-posee';
  operation: OperationPoseeOperation;
  topNumber: number;
  bottomNumber: number;
  prompt?: string;
  locale?: 'fr' | 'en';
}

export interface OperationPoseeStudentState {
  resultDigits: string[];
  carryBoxes: string[];
}

export interface OperationPoseeVerificationResult {
  correct: boolean;
  resultCorrect: boolean;
  carryCorrect: boolean;
  expectedResultDigits: string[];
  expectedCarryBoxes: string[];
  studentState: OperationPoseeStudentState;
  message: string;
}
