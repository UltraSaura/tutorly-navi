export interface Subject {
  id: string;
  name: string;
  slug: string;
  icon_name: string;
  color_scheme: string;
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Computed fields
  total_videos?: number;
  completed_videos?: number;
  earned_xp?: number;
}

export interface Category {
  id: string;
  subject_id: string;
  name: string;
  slug: string;
  icon_name: string;
  description: string | null;
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Related data
  topics?: Topic[];
}

export interface Topic {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string | null;
  video_count: number;
  quiz_count: number;
  estimated_duration_minutes: number;
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // User progress
  completed_videos?: number;
  progress_percentage?: number;
}

export interface Video {
  id: string;
  topic_id: string;
  subject_id?: string | null;
  title: string;
  video_url: string;
  thumbnail_url: string | null;
  duration_minutes: number;
  xp_reward: number;
  description: string | null;
  transcript: string | null;
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Age and level filtering
  min_age?: number | null;
  max_age?: number | null;
  school_levels?: string[] | null;
  // Tags for homework matching
  tags?: string[] | null;
  // User progress
  progress_percentage?: number;
  last_watched_position_seconds?: number;
  progress_type?: string;
  is_completed?: boolean;
}

export interface Quiz {
  id: string;
  video_id: string;
  question: string;
  question_latex: string | null;
  options: string[];
  correct_answer_index: number;
  explanation: string;
  timestamp_seconds: number;
  xp_reward: number;
  order_index: number;
  created_at: string;
  updated_at: string;
  // Age and level filtering
  min_age?: number | null;
  max_age?: number | null;
  school_levels?: string[] | null;
}

export interface UserProgress {
  id: string;
  user_id: string;
  subject_id: string | null;
  category_id: string | null;
  topic_id: string | null;
  video_id: string | null;
  progress_type: 'video_started' | 'video_completed' | 'quiz_attempted' | 'quiz_passed';
  progress_percentage: number;
  quiz_score: number | null;
  time_spent_seconds: number;
  last_watched_position_seconds: number;
  created_at: string;
  updated_at: string;
}

export interface SubjectProgress {
  subject: Subject;
  videos_ready: number;
  videos_completed: number;
  progress_percentage: number;
}
