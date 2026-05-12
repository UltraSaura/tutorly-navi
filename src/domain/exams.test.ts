import { describe, expect, it } from 'vitest';
import { levelForExam, normalizeStudentLevelForExamFilter } from './exams';

describe('exam domain mapping', () => {
  it('maps DNB to 3eme', () => {
    expect(levelForExam('dnb')).toBe('3eme');
  });

  it('normalizes French third-grade variants for practice filtering', () => {
    expect(normalizeStudentLevelForExamFilter('3EME')).toBe('3eme');
    expect(normalizeStudentLevelForExamFilter('Collège - 3e')).toBe('3eme');
  });

  it('keeps 4eme distinct so DNB is not visible for 4eme', () => {
    expect(normalizeStudentLevelForExamFilter('4EME')).toBe('4eme');
  });
});
