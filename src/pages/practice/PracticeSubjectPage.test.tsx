import { describe, expect, it } from 'vitest';
import { practiceTopicPath } from './PracticeSubjectPage';
import { learningThemePath } from '@/pages/learning/SubjectDashboardPage';

describe('V1 practice and lesson navigation', () => {
  it('keeps S’entraîner on the existing exercise route', () => {
    expect(practiceTopicPath('mathematiques', 'fractions-bank')).toBe(
      '/practice/mathematiques/topics?quiz=fractions-bank',
    );
    expect(practiceTopicPath('mathématiques', 'bank with spaces')).toBe(
      '/practice/math%C3%A9matiques/topics?quiz=bank%20with%20spaces',
    );
  });

  it('keeps Leçon on the separate published-theme route', () => {
    expect(learningThemePath('mathematiques', 'fractions')).toBe(
      '/learning/mathematiques/theme/fractions',
    );
    expect(practiceTopicPath('mathematiques', 'fractions-bank')).not.toContain('/learning/');
  });
});
