import { describe, expect, it } from 'vitest';
import { advanceSpacedReview, initialSpacedReviewState, isSpacedReviewDue, sortDueSpacedReviews } from './spacedReviewService';

describe('spacedReviewService', () => {
  const masteredAt = '2026-09-01T10:00:00.000Z';

  it('schedules first review one day after mastery', () => {
    const state = initialSpacedReviewState({ studentId: 's1', subjectId: 'mathematiques', conceptId: 'fractions', masteredAt });
    expect(state.stage).toBe(0);
    expect(state.nextReviewAt).toBe('2026-09-02T10:00:00.000Z');
  });

  it('advances through 3, 7, 14 and 30 day intervals on success', () => {
    let state = initialSpacedReviewState({ studentId: 's1', subjectId: 'mathematiques', conceptId: 'fractions', masteredAt });
    const dates = ['2026-09-02T10:00:00.000Z', '2026-09-05T10:00:00.000Z', '2026-09-12T10:00:00.000Z', '2026-09-26T10:00:00.000Z'];
    const expectedNext = ['2026-09-05T10:00:00.000Z', '2026-09-12T10:00:00.000Z', '2026-09-26T10:00:00.000Z', '2026-10-26T10:00:00.000Z'];
    dates.forEach((date, index) => {
      state = advanceSpacedReview(state, true, date);
      expect(state.nextReviewAt).toBe(expectedNext[index]);
    });
  });

  it('resets to one-day interval after an incorrect review', () => {
    const initial = initialSpacedReviewState({ studentId: 's1', subjectId: 'anglais', conceptId: 'verbs', masteredAt });
    const advanced = advanceSpacedReview(initial, true, '2026-09-02T10:00:00.000Z');
    const reset = advanceSpacedReview(advanced, false, '2026-09-05T10:00:00.000Z');
    expect(reset.stage).toBe(0);
    expect(reset.nextReviewAt).toBe('2026-09-06T10:00:00.000Z');
  });

  it('detects and sorts only due reviews', () => {
    const due = { conceptId: 'a', nextReviewAt: '2026-09-10T00:00:00.000Z' };
    const overdue = { conceptId: 'b', nextReviewAt: '2026-09-09T00:00:00.000Z' };
    const future = { conceptId: 'c', nextReviewAt: '2026-09-13T00:00:00.000Z' };
    expect(isSpacedReviewDue(due, '2026-09-10T00:00:00.000Z')).toBe(true);
    expect(sortDueSpacedReviews([due, overdue, future], '2026-09-10T00:00:00.000Z').map((item) => item.conceptId)).toEqual(['b', 'a']);
  });
});
