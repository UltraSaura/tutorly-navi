export interface RecommendedTopic {
  topic_id: string;
  topic_name: string;
  topic_slug: string;
  topic_description: string | null;
  subject_id: string;
  subject_name: string;
  subject_color: string;
  domain_id: string | null;
  domain_name: string | null;
  subdomain_id: string | null;
  subdomain_name: string | null;
  total_objectives: number;
  mastered_objectives: number;
  in_progress_objectives: number;
  not_started_objectives: number;
  mastery_ratio: number;      // 0 to 1 (masteredObjectives / totalObjectives)
  priority_score: number;      // 1 - mastery_ratio (higher = more recommended)
  estimated_duration_minutes: number;
}

export interface RecommendationOptions {
  subjectId?: string;
  excludeTopicId?: string;
  limit?: number;
  preferSameSubdomain?: string;  // Subdomain ID to boost in scoring
}

export interface RecommendationsResponse {
  recommendations: RecommendedTopic[];
  student_id: string;
  country_code: string;
  level_code: string;
}
