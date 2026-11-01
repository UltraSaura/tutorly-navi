import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { lessonPlayerSessionKey } from './LessonV2Player';
import type { LessonV2 } from '@/types/lesson-generator';

function level(levelNumber: number, prompt: string): LessonV2 {
  return {
    version: '2.0',
    lesson_goal: `Objectif niveau ${levelNumber}`,
    success_criteria: ['Réussir'],
    prerequisites: [{
      id: `level-${levelNumber}-prerequisite`,
      description: 'Pré-requis',
      check_question: prompt,
      answer_type: 'numeric',
      expected_answer: levelNumber,
      remediation_hint: 'Réessaie.',
    }],
    sequence: [{
      id: `level-${levelNumber}-concept`,
      type: 'concept',
      title: `Concept niveau ${levelNumber}`,
      content: `Contenu niveau ${levelNumber}`,
    }],
    misconceptions: [],
    mastery: { skills: [], threshold: 0.8 },
  } as LessonV2;
}

describe('LessonV2Player lesson-change isolation', () => {
  it('creates a new session for a direct level 1 to level 2 switch', () => {
    expect(lessonPlayerSessionKey('topic', level(1, 'Question niveau 1'))).not.toBe(lessonPlayerSessionKey('topic', level(2, 'Question niveau 2')));
  });

  it('creates a new session for a level 2 to level 3 switch', () => {
    expect(lessonPlayerSessionKey('topic', level(2, 'Question niveau 2'))).not.toBe(lessonPlayerSessionKey('topic', level(3, 'Question niveau 3')));
  });

  it('creates a fresh level 1 session when switching back', () => {
    const levelOne = lessonPlayerSessionKey('topic', level(1, 'Question niveau 1'));
    const levelTwo = lessonPlayerSessionKey('topic', level(2, 'Question niveau 2'));
    expect(levelOne).not.toBe(levelTwo);
    expect(lessonPlayerSessionKey('topic', level(1, 'Question niveau 1'))).toBe(levelOne);
  });

  it('includes the prerequisite prompt so stale prompts cannot survive a lesson update', () => {
    expect(lessonPlayerSessionKey('topic', level(1, 'New prerequisite prompt'))).not.toBe(lessonPlayerSessionKey('topic', level(1, 'Old prerequisite prompt')));
  });

  it('keeps the protected preview read-only', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/pages/admin/StagingLessonWorkflowPage.tsx'), 'utf8');
    expect(source).toContain('<LessonV2Player topicId={row.topic_id} subjectId={topic.curriculum_subject_id} topicName={topic.name} lesson={playerLesson(current)} readOnly />');
  });
});
