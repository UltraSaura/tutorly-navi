import { describe, expect, it } from 'vitest';
import { getPracticeActivityCatalog } from '../practiceActivityCatalog';

describe('shared Practice activity catalog', () => {
  it('preserves all six upper-primary Math Skills Lab activities', () => {
    const activities = getPracticeActivityCatalog().filter(
      (activity) => activity.subjectId === 'mathematiques' && activity.ageBand === 'upper_primary',
    );
    expect(activities).toHaveLength(6);
    expect(new Set(activities.map((activity) => activity.engine))).toEqual(
      new Set(['fact_sprint', 'mental_chain', 'missing_number', 'number_line', 'match_pairs']),
    );
  });

  it('also publishes trusted Phase 12 cross-subject activities', () => {
    const subjects = new Set(getPracticeActivityCatalog().map((activity) => activity.subjectId));
    expect(subjects).toEqual(new Set(['mathematiques', 'francais', 'anglais', 'sciences', 'histoire', 'geographie']));
  });
});
