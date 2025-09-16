export interface ExerciseHistoryRecord {
  id: string;
  user_id: string;
  exercise_content: string;
  user_answer: string | null;
  is_correct: boolean | null;
  subject_id: string | null;
  attempts_count: number;
  created_at: string;
  updated_at: string;
}

export interface ExerciseExplanationCache {
  id: string;
  exercise_hash: string;
  exercise_content: string;
  subject_id: string | null;
  explanation_data: any; // TeachingSections
  quality_score: number;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface ExerciseAttemptRecord {
  id: string;
  exercise_history_id: string;
  user_answer: string;
  is_correct: boolean | null;
  explanation_id: string | null;
  attempt_number: number;
  created_at: string;
}

export interface ExerciseHistoryWithAttempts extends ExerciseHistoryRecord {
  attempts: ExerciseAttemptRecord[];
  explanation?: ExerciseExplanationCache | ExerciseExplanationCache[];
}