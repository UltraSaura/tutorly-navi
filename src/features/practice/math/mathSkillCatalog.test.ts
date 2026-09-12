import { describe, expect, it } from 'vitest';
import { getPracticeActivityCatalog } from '../practiceActivityCatalog';

describe('Math Skills Lab catalog', () => {
  it('publishes six upper-primary math activities through the shared catalog', () => {
    const activities = getPracticeActivityCatalog().filter(
      (activity) => activity.subjectId === 'mathematiques' && activity.ageBand === 'upper_primary',
    );
    expect(activities).toHaveLength(6);
    expect(new Set(activities.map((activity) => activity.engine))).toEqual(
      new Set(['fact_sprint', 'mental_chain', 'missing_number', 'number_line', 'match_pairs']),
    );
  });

  it('does not fabricate non-math subject activities in Phase 10', () => {
    expect(getPracticeActivityCatalog().some((activity) => activity.subjectId !== 'mathematiques')).toBe(false);
  });
});
