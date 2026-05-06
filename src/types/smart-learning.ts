export type LearningContextSource =
  | "exercise"
  | "homework"
  | "course"
  | "quiz"
  | "explanation";

export type CurriculumSkillMatch = {
  subject: string;
  gradeLevel?: string;
  country?: string;
  curriculum?: string;
  domain?: string;
  subdomain?: string;
  topic?: string;
  topicId?: string;
  objectiveId?: string;
  skillTag: string;
  keywords: string[];
  confidence: number;
  studentFriendlyLabel: string;
  source: LearningContextSource;
  sourceId?: string;
};

export type LearningResourceRecommendation = {
  id: string;
  type: "video" | "quiz" | "practice";
  title: string;
  description?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  skillTags: string[];
  keywords: string[];
  gradeLevel?: string;
  language?: string;
  difficulty?: "easy" | "medium" | "hard";
  matchScore: number;
  matchReasons: string[];
  sourceId?: string;
};

export type ExtractLearningContextInput = {
  source: LearningContextSource;
  text?: string;
  title?: string;
  description?: string;
  subject?: string;
  gradeLevel?: string;
  country?: string;
  curriculum?: string;
  responseLanguage?: string;
  sourceId?: string;
};

export type RecommendedLearningResourcesInput = {
  studentId?: string;
  skillMatches: CurriculumSkillMatch[];
  gradeLevel?: string;
  country?: string;
  language?: string;
  limit?: number;
};
