import { describe, expect, it } from 'vitest';
import { validateLessonV21 } from './lesson-v21-contract';
import { LessonV21Schema, parseLessonV21 } from './lesson-generator';

const valid = { version: '2.1', topic_goal: 'Durées', levels: [{ id: 'level_1', level_number: 1, title: 'Bases', purpose: 'Comprendre', difficulty: 'foundation', objective_ids: ['objective-1'], lesson: { lesson_goal: 'Comprendre', success_criteria: ['Je comprends'], prerequisites: [{ id: 'p1', description: 'Lire l’heure', check_question: 'Quelle heure ?', expected_answer: '10 h', remediation_hint: 'Observe l’horloge.' }], misconceptions: [{ id: 'm1', description: 'Erreur', detect_if: 'Réponse fausse', feedback: 'Recommence', remediation_strategy: 'Représente.' }], sequence: [{ id: 'c1', type: 'concept', title: 'Concept', content: 'Contenu' }, { id: 'm1', type: 'mastery_check', questions: [{ id: 'q1', question: 'Question', answer_type: 'text', correct_answer: 'oui', skill: 'skill', difficulty: 1, success_feedback: 'Oui', error_feedback: 'Non' }] }], mastery: { skills: ['skill'], threshold: 0.8 } } }] };

describe('Lesson V2.1 canonical contract', () => {
  it('accepts a complete lesson', () => expect(validateLessonV21(valid).success).toBe(true));
  it('rejects string prerequisites', () => expect(validateLessonV21({ ...valid, levels: [{ ...valid.levels[0], lesson: { ...valid.levels[0].lesson, prerequisites: ['bad'] } }] }).success).toBe(false));
  it('rejects mastery prose without questions', () => expect(validateLessonV21({ ...valid, levels: [{ ...valid.levels[0], lesson: { ...valid.levels[0].lesson, sequence: [{ id: 'm', type: 'mastery_check' }] } }] }).success).toBe(false));
  it.each([1, 4])('keeps shared validator, parser, and schema aligned at %i mastery questions', (count) => {
    const questions = Array.from({ length: count }, (_, i) => ({ id: `q${i}`, question: 'Question', answer_type: 'text', correct_answer: 'oui', skill: 'skill', difficulty: 1, success_feedback: 'Oui', error_feedback: 'Non' }));
    const payload = { ...valid, levels: [{ ...valid.levels[0], lesson: { ...valid.levels[0].lesson, sequence: [{ id: 'm', type: 'mastery_check', questions }] } }] };
    expect(validateLessonV21(payload).success).toBe(true);
    expect(parseLessonV21(payload)).not.toBeNull();
    expect(LessonV21Schema.safeParse(payload).success).toBe(true);
  });
  it('rejects five, empty, and malformed mastery questions identically', () => {
    for (const questions of [[], Array.from({ length: 5 }, (_, i) => ({ id: `q${i}`, question: 'Question', answer_type: 'text', correct_answer: 'oui', skill: 'skill', difficulty: 1, success_feedback: 'Oui', error_feedback: 'Non' })), ['bad']]) {
      const payload = { ...valid, levels: [{ ...valid.levels[0], lesson: { ...valid.levels[0].lesson, sequence: [{ id: 'm', type: 'mastery_check', questions }] } }] };
      expect(validateLessonV21(payload).success).toBe(false);
      expect(parseLessonV21(payload)).toBeNull();
      expect(LessonV21Schema.safeParse(payload).success).toBe(false);
    }
  });
  it('rejects malformed prerequisites, misconceptions, and concept content identically', () => {
    for (const lesson of [
      { ...valid.levels[0].lesson, prerequisites: ['bad'] },
      { ...valid.levels[0].lesson, misconceptions: ['bad'] },
      { ...valid.levels[0].lesson, sequence: [{ id: 'c1', type: 'concept', title: 'Concept', content: '' }] },
    ]) {
      const payload = { ...valid, levels: [{ ...valid.levels[0], lesson }] };
      expect(validateLessonV21(payload).success).toBe(false);
      expect(parseLessonV21(payload)).toBeNull();
      expect(LessonV21Schema.safeParse(payload).success).toBe(false);
    }
  });
  it('accepts every supported block type through the same contract', () => {
    const blocks = [
      { id: 'hook', type: 'hook', title: 'T', content: 'C' }, { id: 'concept', type: 'concept', title: 'T', content: 'C' },
      { id: 'visual', type: 'visual', title: 'T', content: 'C', visual: { kind: 'timeline', data: {} } },
      { id: 'prediction', type: 'prediction', question: 'Q', choices: ['a', 'b'], correct_answer: 'a', explanation: 'E' },
      { id: 'guided', type: 'guided_example', context: 'C', steps: [{ instruction: 'I', reason: 'R' }] },
      { id: 'try', type: 'student_try', question: 'Q', answer_type: 'text', correct_answer: 'a', success_feedback: 'Y', error_feedback: 'N' },
      { id: 'checkpoint', type: 'feedback_checkpoint', question: 'Q', answer_type: 'text', correct_answer: 'a', success_feedback: 'Y', error_feedback: 'N' },
      { id: 'contrast', type: 'contrast', title: 'T', left: 'L', right: 'R', explanation: 'E' },
      { id: 'rule', type: 'rule', title: 'T', content: 'C' },
      { id: 'worked', type: 'worked_example', context: 'C', steps: ['S'], conclusion: 'D' },
      { id: 'reflection', type: 'reflection', question: 'Q', expected_idea: 'E' },
      { id: 'mastery', type: 'mastery_check', questions: [{ id: 'q', question: 'Q', answer_type: 'text', correct_answer: 'a', skill: 's', difficulty: 1, success_feedback: 'Y', error_feedback: 'N' }] },
    ];
    const payload = { ...valid, levels: [{ ...valid.levels[0], lesson: { ...valid.levels[0].lesson, sequence: blocks } }] };
    expect(validateLessonV21(payload).success).toBe(true);
    expect(parseLessonV21(payload)).not.toBeNull();
    expect(LessonV21Schema.safeParse(payload).success).toBe(true);
  });
});
