import { describe, expect, it } from 'vitest';
import type { SkillActivityDefinition } from '@/types/skill-activity';
import { createPracticeActivitySession, hasPracticeActivitiesForSubject } from './practiceActivityService';

const activities: SkillActivityDefinition[] = [
  {
    id: 'math-2',
    subjectId: 'mathematiques',
    conceptId: 'multiplication',
    engine: 'fact_sprint',
    ageBand: 'upper_primary',
    masteryLevels: [2, 3],
    difficulty: 2,
    estimatedMinutes: 4,
    configuration: {},
  },
  {
    id: 'math-1',
    subjectId: 'mathematiques',
    conceptId: 'multiplication',
    engine: 'match_pairs',
    ageBand: 'upper_primary',
    masteryLevels: [1, 2],
    difficulty: 1,
    estimatedMinutes: 3,
    configuration: {},
  },
  {
    id: 'french-1',
    subjectId: 'francais',
    conceptId: 'future-tense',
    engine: 'sentence_builder',
    ageBand: 'upper_primary',
    masteryLevels: [1, 2],
    difficulty: 1,
    estimatedMinutes: 5,
    configuration: {},
  },
  {
    id: 'math-middle',
    subjectId: 'mathematiques',
    conceptId: 'algebra',
    engine: 'missing_number',
    ageBand: 'middle_school',
    masteryLevels: [2, 3],
    difficulty: 1,
    configuration: {},
  },
];

describe('createPracticeActivitySession', () => {
  it('selects only the requested subject and age band', () => {
    const result = createPracticeActivitySession({ activities, subjectId: 'mathematiques', ageBand: 'upper_primary' });
    expect(result.activities.map((activity) => activity.id)).toEqual(['math-1', 'math-2']);
  });

  it('filters by mastery level when provided', () => {
    const result = createPracticeActivitySession({ activities, subjectId: 'mathematiques', ageBand: 'upper_primary', masteryLevel: 3 });
    expect(result.activities.map((activity) => activity.id)).toEqual(['math-2']);
  });

  it('filters by concept when provided', () => {
    const result = createPracticeActivitySession({ activities, subjectId: 'mathematiques', ageBand: 'middle_school', conceptId: 'algebra' });
    expect(result.activities.map((activity) => activity.id)).toEqual(['math-middle']);
  });

  it('is deterministic and orders by difficulty then id', () => {
    const reversed = [...activities].reverse();
    const result = createPracticeActivitySession({ activities: reversed, subjectId: 'mathematiques', ageBand: 'upper_primary' });
    expect(result.activities.map((activity) => activity.id)).toEqual(['math-1', 'math-2']);
  });

  it('does not fabricate content when nothing is eligible', () => {
    const result = createPracticeActivitySession({ activities, subjectId: 'sciences', ageBand: 'early_primary' });
    expect(result.activities).toEqual([]);
    expect(result.estimatedMinutes).toBe(0);
  });

  it('sums trusted activity duration and respects the max size', () => {
    const result = createPracticeActivitySession({ activities, subjectId: 'mathematiques', ageBand: 'upper_primary', maxActivities: 1 });
    expect(result.activities).toHaveLength(1);
    expect(result.estimatedMinutes).toBe(3);
  });
});

describe('hasPracticeActivitiesForSubject', () => {
  it('detects subject availability without inventing an activity', () => {
    expect(hasPracticeActivitiesForSubject(activities, 'francais', 'upper_primary')).toBe(true);
    expect(hasPracticeActivitiesForSubject(activities, 'sciences', 'upper_primary')).toBe(false);
  });
});
