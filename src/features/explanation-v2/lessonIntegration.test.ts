import { describe, expect, it } from 'vitest';
import { parseLessonContent } from '@/types/lesson-generator';

const sample = {
  version: '2.0',
  lesson_goal: 'Additionner des fractions simples',
  success_criteria: ['Transformer des moitiés en quarts'],
  prerequisites: [{
    id: 'pr-1', description: 'Connaître les quarts', check_question: 'Combien de quarts dans un entier ?',
    answer_type: 'numeric', expected_answer: 4, remediation_hint: 'Partage en quatre.',
  }],
  sequence: [{
    id: 'activity-1', type: 'interactive_activity',
    activity: {
      schemaVersion: 1, id: 'cm2-fractions-001', kind: 'fraction-bar',
      title: 'Les quarts', prompt: 'Transforme 1/2 en quarts',
      left: { n: 3, d: 4 }, right: { n: 1, d: 2 }, targetDenominator: 4,
    },
  }],
  misconceptions: [],
  mastery: { skills: ['fractions'], threshold: 0.8 },
};
describe('Explanation V2 lesson integration', () => {
  it('parses an explicitly typed interactive activity', () => {
    const parsed = parseLessonContent(sample);
    expect(parsed?.sequence[0].type).toBe('interactive_activity');
  });
  it('rejects an inconsistent activity rather than falling back to permissive parsing', () => {
    const broken = structuredClone(sample);
    broken.sequence[0].activity.right.d = 3;
    expect(parseLessonContent(broken)).toBeNull();
  });
  it('parses a fraction-select activity for use inside LessonV2Player', () => {
    const selectable = { ...sample, sequence: [{
      id: 'activity-select', type: 'interactive_activity',
      activity: {
        schemaVersion: 1, id: 'select-3-quarters', kind: 'fraction-select',
        title: 'Construire 3/4', prompt: 'Sélectionne les cases', schoolLevel: 'CM2',
        target: { n: 3, d: 4 },
      },
    }] };
    expect(parseLessonContent(selectable)?.sequence[0].type).toBe('interactive_activity');
  });
  it('rejects an unknown activity kind', () => {
    const broken = structuredClone(sample);
    broken.sequence[0].activity.kind = 'unknown';
    expect(parseLessonContent(broken)).toBeNull();
  });
});
