import { describe, expect, it } from 'vitest';
import {
  factFamilyKey,
  generateMathSkillQuestions,
  selectPracticeMix,
} from './mathSkillEngine';

describe('Math Skills Lab engine', () => {
  it('generates deterministic multiplication questions', () => {
    const config = { skill: 'times_tables' as const, itemCount: 6, tables: [7, 8] };
    expect(generateMathSkillQuestions(config, 'student-a')).toEqual(generateMathSkillQuestions(config, 'student-a'));
  });

  it('shares multiplication/division fact families', () => {
    expect(factFamilyKey(7, 8)).toBe(factFamilyKey(8, 7));
    const multiplication = generateMathSkillQuestions({ skill: 'times_tables', itemCount: 1, tables: [7] }, 'shared')[0];
    const division = generateMathSkillQuestions({ skill: 'division_facts', itemCount: 1, tables: [7] }, 'shared')[0];
    expect(multiplication.familyKey).toBe(division.familyKey);
  });

  it('selects the target 60/25/15 evidence mix when all bands are available', () => {
    const evidence = [
      ...Array.from({ length: 12 }, (_, i) => ({ key: `w${i}`, score: 30 })),
      ...Array.from({ length: 8 }, (_, i) => ({ key: `d${i}`, score: 65 })),
      ...Array.from({ length: 6 }, (_, i) => ({ key: `m${i}`, score: 90 })),
    ];
    const result = selectPracticeMix(evidence, 20, 'mix');
    expect(result.filter((item) => item.band === 'weak')).toHaveLength(12);
    expect(result.filter((item) => item.band === 'developing')).toHaveLength(5);
    expect(result.filter((item) => item.band === 'mastered')).toHaveLength(3);
  });

  it('falls back safely when mastery evidence is missing', () => {
    const result = selectPracticeMix([{ key: 'only', score: 65 }], 4, 'fallback');
    expect(result).toHaveLength(4);
    expect(result.every((item) => item.item.key === 'only')).toBe(true);
  });

  it('generates all six MVP activity question types without AI', () => {
    const skills = ['times_tables', 'division_facts', 'mental_math', 'number_bonds', 'number_line', 'fraction_match'] as const;
    skills.forEach((skill) => {
      expect(generateMathSkillQuestions({ skill, itemCount: 3 }, skill)).toHaveLength(3);
    });
  });
});
