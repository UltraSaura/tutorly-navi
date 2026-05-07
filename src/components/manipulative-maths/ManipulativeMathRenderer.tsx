import type {
  ManipulativeMathExercise,
  ManipulativeMathMode,
  ManipulativeMathResult,
} from '@/lib/manipulative-maths/types';
import { OperationPoseeExercise } from './operation-posee/OperationPoseeExercise';

interface ManipulativeMathRendererProps {
  mode: ManipulativeMathMode;
  exercise: ManipulativeMathExercise | null;
  onComplete?: (result: ManipulativeMathResult) => void;
}

export function ManipulativeMathRenderer({
  mode,
  exercise,
  onComplete,
}: ManipulativeMathRendererProps) {
  if (!exercise) return null;

  if (exercise.type === 'operation-posee') {
    return (
      <OperationPoseeExercise
        exercise={exercise}
        mode={mode}
        onComplete={onComplete}
      />
    );
  }

  return null;
}
