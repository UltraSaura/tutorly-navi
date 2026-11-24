import { describe, expect, it } from 'vitest';
import { parseLessonContent } from '@/types/lesson-generator';
import { cm2FractionLesson } from './cm2FractionLesson';

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
  it('accepts all three additional interactive animation kinds in the lesson contract', () => {
    const activities = [
      { schemaVersion: 1, id: 'tiles', kind: 'algebra-tiles', title: 'Tuiles', prompt: 'Construis 2x + 3', schoolLevel: '5e', target: { x: 2, units: 3 } },
      { schemaVersion: 1, id: 'function', kind: 'linear-function', title: 'Fonction', prompt: 'Construis y = 2x + 1', schoolLevel: '4e', target: { m: 2, b: 1 } },
      { schemaVersion: 1, id: 'fitting', kind: 'line-fit', title: 'Ajustement', prompt: 'Ajuste la droite', schoolLevel: '2nde', points: [{ x: -2, y: -2 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 3 }, { x: 2, y: 5 }] },
    ];
    for (const activity of activities) {
      const lesson = { ...sample, sequence: [{ id: activity.id, type: 'interactive_activity', activity }] };
      expect(parseLessonContent(lesson)?.sequence[0].type).toBe('interactive_activity');
    }
  });
  it('keeps the full CM2 lesson coherent and includes two gated activities', () => {
    const parsed = parseLessonContent(cm2FractionLesson);
    expect(parsed).not.toBeNull();
    expect(parsed?.sequence.map(block => block.type)).toEqual([
      'concept', 'interactive_activity', 'guided_example', 'interactive_activity', 'concept',
    ]);
    expect(parsed?.sequence.filter(block => block.type === 'interactive_activity').map(block => block.activity.kind)).toEqual(['fraction-select', 'fraction-bar']);
    expect(parsed?.sequence.filter(block => block.type === 'interactive_activity').every(block => block.activity.schoolLevel === 'CM2')).toBe(true);
    expect(new Set(parsed?.sequence.map(block => block.id)).size).toBe(parsed?.sequence.length);
  });
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
