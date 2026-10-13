import { describe, expect, it } from 'vitest';
import { deriveLessonReview } from './GeneratedLessonsPage';

const legacy = { explanation: 'old', example: 'x', common_mistakes: [], guided_practice: [], exit_ticket: [], generated_at: '2026-01-01' };
const valid = { version: '2.1', topic_goal: 'Nombres', levels: [{ id: 'l1', level_number: 1, title: 'Base', purpose: 'Lire', difficulty: 'foundation', objective_ids: [], lesson: { lesson_goal: 'Lire', success_criteria: ['Je peux lire'], prerequisites: [], sequence: [{ id: 'c', type: 'concept', title: 'C', content: 'Contenu' }, { id: 'm', type: 'mastery_check', questions: [{ id: 'q', question: 'Q', answer_type: 'numeric', correct_answer: 1, skill: 's', difficulty: 1, success_feedback: 'Oui', error_feedback: 'Non' }] }], misconceptions: [], mastery: { skills: ['s'], threshold: .8 } } }] };

describe('generated lesson review derivation', () => {
  it.each([null, undefined])('handles an empty lesson list/content (%s)', (value) => expect(deriveLessonReview(value).status).toBe('Aucun contenu'));
  it('recognizes legacy content', () => expect(deriveLessonReview(legacy).format).toBe('Legacy'));
  it('recognizes valid V2.1 content', () => expect(deriveLessonReview(valid).status).toBe('Contrat valide'));
  it('rejects invalid canonical content', () => expect(deriveLessonReview({ ...valid, levels: [] }).status).toBe('Contrat invalide'));
  it('reports missing correct answer', () => expect(deriveLessonReview({ ...valid, levels: [{ ...valid.levels[0], lesson: { ...valid.levels[0].lesson, sequence: [{ id: 'q', type: 'student_try', question: 'Q', answer_type: 'numeric', success_feedback: 'x', error_feedback: 'y' }] } }] }).checks[0].path).toContain('correct_answer'));
  it('reports malformed mastery metadata', () => expect(deriveLessonReview({ ...valid, levels: [{ ...valid.levels[0], lesson: { ...valid.levels[0].lesson, mastery: { threshold: 2 } } }] }).status).toBe('Contrat invalide'));
  it('supports mastery questions inside sequence', () => expect(deriveLessonReview(valid).status).toBe('Contrat valide'));
  it('reports unsupported visuals', () => expect(deriveLessonReview({ ...valid, levels: [{ ...valid.levels[0], lesson: { ...valid.levels[0].lesson, sequence: [{ id: 'v', type: 'visual', title: 'V', content: 'x', visual: { kind: 'magic' } }] } }] }).status).toBe('Contrat invalide'));
  it('reports missing visuals through the contract', () => expect(deriveLessonReview({ ...valid, levels: [{ ...valid.levels[0], lesson: { ...valid.levels[0].lesson, sequence: [{ id: 'c', type: 'concept', title: 'C', content: 'x' }] } }] }).status).toBe('Contrat valide'));
  it('does not stringify errors as object placeholders', () => expect(JSON.stringify(deriveLessonReview({ bad: true }))).not.toContain('[object Object]'));
  it('keeps geometry visuals reviewable', () => expect(deriveLessonReview({ ...valid, levels: [{ ...valid.levels[0], lesson: { ...valid.levels[0].lesson, sequence: [{ id: 'v', type: 'visual', title: 'V', content: 'x', visual: { kind: 'triangle' } }] } }] }).status).toBe('Contrat valide'));
  it('handles ambiguous multiple choices as invalid when answer is absent', () => expect(deriveLessonReview({ ...valid, levels: [{ ...valid.levels[0], lesson: { ...valid.levels[0].lesson, sequence: [{ id: 'q', type: 'student_try', question: 'Q', answer_type: 'selection', choices: ['A', 'B'], success_feedback: 'x', error_feedback: 'y' }] } }] }).status).toBe('Contrat invalide'));
});
