import { describe, expect, it } from 'vitest';
import { LessonV2Schema, parseLessonContent } from './lesson-generator';

const lesson = {
  version: '2.0', lesson_goal: 'Convertir les durées', success_criteria: ['Je peux convertir des minutes'],
  prerequisites: [{ id: 'p1', description: 'Compter par 10', check_question: '10 + 10 ?', expected_answer: '20', remediation_hint: 'Compte deux dizaines.' }],
  sequence: [{ id: 's1', type: 'concept', title: 'Une minute', content: 'Une minute contient 60 secondes.' }],
  misconceptions: [], mastery: { skills: ['conversion'], threshold: .8 },
};

describe('Lesson Generator V2 validation', () => {
  it('accepts a valid V2 lesson', () => expect(parseLessonContent(lesson)?.version).toBe('2.0'));
  it('rejects malformed AI output safely', () => expect(parseLessonContent({ version: '2.0' })).toBeNull());
  it('keeps legacy content outside the V2 parser', () => expect(LessonV2Schema.safeParse({ explanation: 'old lesson' }).success).toBe(false));
  it('accepts the stored CM2 duration lesson shape', () => {
    const stored = {
      ...lesson,
      lesson_goal: 'Comprendre les durées',
      prerequisites: [{ ...lesson.prerequisites[0], id: 'prereq-1' }],
      sequence: [
        { id: 'bloc-1', type: 'hook', title: 'Le sablier', content: 'Réfléchis.' },
        { id: 'bloc-3', type: 'visual', title: 'La frise', content: 'Les relations.', visual: { kind: 'timeline', data: { items: [] } } },
        { id: 'bloc-9', type: 'worked_example', context: '90 minutes', steps: [{ instruction: 'Former une heure', representation: '90 = 60 + 30', reason: 'Une heure vaut 60 minutes.' }], conclusion: '1 h 30' },
        { id: 'bloc-11', type: 'mastery_check', hints: [], questions: [{ id: 'm1', question: '1 h 20 ?', answer_type: 'text', choices: [], correct_answer: '80 minutes', skill: 'conversion', difficulty: 1, success_feedback: 'Exact', error_feedback: 'Pense à 60.' }] },
      ],
    };
    expect(parseLessonContent(stored)?.sequence).toHaveLength(4);
  });
});
