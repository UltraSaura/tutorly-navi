export type RecommendedActionSource = 'learn' | 'tutor' | 'practice';

export type RecommendationReason =
  | 'continue'
  | 'prerequisite'
  | 'weak_skill'
  | 'spaced_review'
  | 'homework_followup'
  | 'curriculum'
  | 'enrichment';

export interface RecommendedAction {
  id: string;
  source: RecommendedActionSource;
  subjectId: string;
  subjectName?: string;
  conceptId?: string;
  conceptName?: string;
  objectiveId?: string;
  reason: RecommendationReason;
  priority: number;
  estimatedMinutes?: number;
  title: string;
  description?: string;
  route: string;
  metadata?: Record<string, unknown>;
}

export interface RecommendationCurriculumTopic {
  subjectId: string;
  subjectName: string;
  subjectSlug: string;
  topicId: string;
  topicName: string;
  topicSlug: string;
  orderIndex: number;
  estimatedMinutes?: number;
}

export interface RecommendationProgressEvidence {
  topicId: string;
  subjectId?: string | null;
  progressType: string;
  progressPercentage?: number | null;
  updatedAt?: string | null;
}

export interface RecommendationHomeworkEvidence {
  id: string;
  subjectId?: string | null;
  topicId?: string | null;
  isCorrect: boolean | null;
  attemptsCount: number;
  updatedAt?: string | null;
}

export interface NextBestActionInput {
  studentId: string;
  curriculum: RecommendationCurriculumTopic[];
  progress: RecommendationProgressEvidence[];
  homework: RecommendationHomeworkEvidence[];
  maxActions?: number;
}
