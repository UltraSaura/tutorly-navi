export const SPACED_REVIEW_INTERVAL_DAYS = [1, 3, 7, 14, 30] as const;

export interface SpacedReviewState {
  studentId: string;
  subjectId: string;
  conceptId: string;
  objectiveId?: string;
  stage: number;
  nextReviewAt: string;
  lastReviewedAt?: string;
  lastResultCorrect?: boolean;
}

export interface SpacedReviewEvidence {
  subjectId: string;
  subjectSlug: string;
  subjectName?: string;
  conceptId: string;
  conceptName?: string;
  objectiveId?: string;
  stage: number;
  nextReviewAt: string;
  lastReviewedAt?: string;
}
