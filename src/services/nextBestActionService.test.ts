import { describe, expect, it } from 'vitest';
import { getNextBestActions } from './nextBestActionService';
import type { NextBestActionInput } from '@/types/recommendation';

const curriculum = [
  { subjectId: 'math', subjectName: 'Mathematics', subjectSlug: 'math', topicId: 'fractions', topicName: 'Fractions', topicSlug: 'fractions', orderIndex: 1, estimatedMinutes: 8 },
  { subjectId: 'french', subjectName: 'French', subjectSlug: 'french', topicId: 'future', topicName: 'Futur simple', topicSlug: 'futur-simple', orderIndex: 2, estimatedMinutes: 7 },
];

const base: NextBestActionInput = { studentId: 'student-1', curriculum, progress: [], homework: [] };

describe('getNextBestActions', () => {
  it('ranks unfinished learning first', () => {
    const actions = getNextBestActions({
      ...base,
      progress: [{ topicId: 'fractions', subjectId: 'math', progressType: 'lesson_level_completed', progressPercentage: 50 }],
      homework: [{ id: 'h1', topicId: 'future', subjectId: 'french', isCorrect: false, attemptsCount: 3 }],
    });
    expect(actions[0].reason).toBe('continue');
    expect(actions[0].conceptId).toBe('fractions');
  });

  it('uses repeated structured failures as weak-skill evidence', () => {
    const actions = getNextBestActions({
      ...base,
      homework: [{ id: 'h1', topicId: 'fractions', subjectId: 'math', isCorrect: false, attemptsCount: 2 }],
    });
    expect(actions[0].reason).toBe('weak_skill');
  });

  it('offers Tutor follow-up after a single incorrect homework when no stronger evidence exists', () => {
    const actions = getNextBestActions({
      ...base,
      homework: [{ id: 'h1', subjectId: 'math', isCorrect: false, attemptsCount: 1 }],
    });
    expect(actions[0].reason).toBe('homework_followup');
    expect(actions[0].route).toBe('/chat');
  });

  it('falls back to ordered curriculum for a new learner', () => {
    const actions = getNextBestActions(base);
    expect(actions[0]).toMatchObject({ reason: 'curriculum', conceptId: 'fractions' });
  });

  it('does not fabricate prerequisite or spaced-review actions', () => {
    const actions = getNextBestActions(base);
    expect(actions.some((action) => action.reason === 'prerequisite')).toBe(false);
    expect(actions.some((action) => action.reason === 'spaced_review')).toBe(false);
  });

  it('returns an empty list without a student id', () => {
    expect(getNextBestActions({ ...base, studentId: '' })).toEqual([]);
  });
});
