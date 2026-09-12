import { SPACED_REVIEW_INTERVAL_DAYS, type SpacedReviewState } from '@/types/spaced-review';

const DAY_MS = 86_400_000;

function isoPlusDays(iso: string, days: number): string {
  const base = new Date(iso).getTime();
  if (!Number.isFinite(base)) throw new Error(`Invalid ISO timestamp: ${iso}`);
  return new Date(base + days * DAY_MS).toISOString();
}

export function initialSpacedReviewState(input: {
  studentId: string;
  subjectId: string;
  conceptId: string;
  objectiveId?: string;
  masteredAt: string;
}): SpacedReviewState {
  return {
    studentId: input.studentId,
    subjectId: input.subjectId,
    conceptId: input.conceptId,
    objectiveId: input.objectiveId,
    stage: 0,
    nextReviewAt: isoPlusDays(input.masteredAt, SPACED_REVIEW_INTERVAL_DAYS[0]),
  };
}

export function advanceSpacedReview(
  previous: SpacedReviewState,
  correct: boolean,
  reviewedAt: string,
): SpacedReviewState {
  const nextStage = correct
    ? Math.min(previous.stage + 1, SPACED_REVIEW_INTERVAL_DAYS.length - 1)
    : 0;
  const interval = SPACED_REVIEW_INTERVAL_DAYS[nextStage];

  return {
    ...previous,
    stage: nextStage,
    lastReviewedAt: reviewedAt,
    lastResultCorrect: correct,
    nextReviewAt: isoPlusDays(reviewedAt, interval),
  };
}

export function isSpacedReviewDue(state: Pick<SpacedReviewState, 'nextReviewAt'>, now = new Date().toISOString()): boolean {
  const dueAt = new Date(state.nextReviewAt).getTime();
  const current = new Date(now).getTime();
  return Number.isFinite(dueAt) && Number.isFinite(current) && dueAt <= current;
}

export function sortDueSpacedReviews<T extends { nextReviewAt: string; conceptId: string }>(states: T[], now = new Date().toISOString()): T[] {
  return states
    .filter((state) => isSpacedReviewDue(state, now))
    .slice()
    .sort((a, b) => a.nextReviewAt.localeCompare(b.nextReviewAt) || a.conceptId.localeCompare(b.conceptId));
}
