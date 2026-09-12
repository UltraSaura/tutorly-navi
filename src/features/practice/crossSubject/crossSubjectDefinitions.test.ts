import { describe, expect, it } from 'vitest';
import { getCrossSubjectActivities } from './crossSubjectDefinitions';

const SUBJECTS = ['francais', 'anglais', 'sciences', 'histoire', 'geographie'] as const;
const BANDS = ['early_primary', 'upper_primary', 'middle_school', 'high_school'] as const;

describe('cross-subject activity definitions', () => {
  it('publishes trusted activities for every target subject and age band', () => {
    for (const subject of SUBJECTS) {
      for (const band of BANDS) {
        expect(getCrossSubjectActivities(subject, band).length).toBeGreaterThan(0);
      }
    }
  });

  it('uses subject-appropriate engines instead of math fluency engines', () => {
    const activities = getCrossSubjectActivities();
    expect(activities.some((activity) => activity.engine === 'sentence_builder')).toBe(true);
    expect(activities.some((activity) => activity.engine === 'sort_classify')).toBe(true);
    expect(activities.some((activity) => activity.engine === 'timeline')).toBe(true);
    expect(activities.some((activity) => activity.engine === 'map_interaction')).toBe(true);
    expect(activities.some((activity) => activity.engine === 'fact_sprint')).toBe(false);
  });

  it('keeps content deterministic and local', () => {
    expect(getCrossSubjectActivities('francais', 'upper_primary')).toEqual(getCrossSubjectActivities('francais', 'upper_primary'));
    expect(getCrossSubjectActivities().every((activity) => activity.contentVersion === 'phase-12-v1')).toBe(true);
  });
});
