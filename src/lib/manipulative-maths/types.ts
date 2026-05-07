import type {
  OperationPoseeExercise,
  OperationPoseeVerificationResult,
} from './operation-posee/operationPoseeTypes';

export type ManipulativeMathMode =
  | 'practice'
  | 'quiz'
  | 'auto-verification'
  | 'math-lab';

export type ManipulativeMathExercise =
  | OperationPoseeExercise;

export type ManipulativeMathResult =
  | OperationPoseeVerificationResult;

export type {
  OperationPoseeExercise,
  OperationPoseeVerificationResult,
};
