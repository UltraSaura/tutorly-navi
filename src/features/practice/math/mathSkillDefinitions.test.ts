import { describe, expect, it } from 'vitest';
import { getMathSkillsLabActivities } from './mathSkillDefinitions';

const EXPECTED_SKILLS = [
  'times_tables',
  'division_facts',
  'mental_math',
  'number_bonds',
  'number_line',
  'fraction_match',
];

describe('Math Skills Lab definitions', () => {
  it('publishes all six MVP activities for upper primary', () => {
    const activities = getMathSkillsLabActivities('upper_primary');
    expect(activities).toHaveLength(6);
    expect(activities.map((activity) => activity.configuration.skill).sort()).toEqual([...EXPECTED_SKILLS].sort());
  });

  it('removes timer pressure for early primary', () => {
    const activities = getMathSkillsLabActivities('early_primary');
    expect(activities.every((activity) => activity.configuration.timerSeconds === undefined)).toBe(true);
  });

  it('keeps content deterministic and local rather than AI-generated', () => {
    const first = getMathSkillsLabActivities('upper_primary');
    const second = getMathSkillsLabActivities('upper_primary');
    expect(first).toEqual(second);
    expect(first.every((activity) => activity.contentVersion === 'phase-10-v1')).toBe(true);
  });
});
