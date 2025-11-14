// Student mastery tracking types

export interface StudentMastery {
  id: string;
  child_id: string;
  success_criterion_id: string;
  status: 'not_started' | 'in_progress' | 'mastered';
  mastery_score: number | null;
  attempts_count: number;
  first_attempt_at: string | null;
  last_attempt_at: string | null;
  mastered_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CurriculumTaskAttempt {
  id: string;
  child_id: string;
  task_id: string;
  success_criterion_id: string | null;
  objective_id: string | null;
  is_correct: boolean | null;
  answer_data: Record<string, any> | null;
  time_spent_seconds: number | null;
  created_at: string;
}

export interface LessonSession {
  id: string;
  child_id: string;
  lesson_id: string | null;
  objective_ids: string[] | null;
  success_criterion_ids: string[] | null;
  duration_minutes: number | null;
  completion_percentage: number | null;
  started_at: string;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface ObjectiveMasteryProgress {
  objective_id: string;
  objective_text: string;
  total_criteria: number;
  mastered_criteria: number;
  in_progress_criteria: number;
  mastery_percentage: number;
  success_criteria: SuccessCriterionMastery[];
}

export interface SuccessCriterionMastery {
  id: string;
  text: string;
  status: 'not_started' | 'in_progress' | 'mastered';
  mastery_score: number | null;
  attempts_count: number;
  last_attempt_at: string | null;
}

export interface MasteryStats {
  total_criteria: number;
  mastered_criteria: number;
  in_progress_criteria: number;
  not_started_criteria: number;
  overall_mastery_percentage: number;
  total_attempts: number;
  recent_sessions: number;
}
