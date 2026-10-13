import { describe, expect, it } from 'vitest';
import { normalizeCanonicalAnswers } from './canonical-normalization.ts';

describe('canonical answer normalization', () => {
  it.each(['answer', 'expected_answer', 'correctAnswer'] as const)('maps %s to correct_answer', (field) => {
    const result = normalizeCanonicalAnswers({ sequence: [{ id: 'q', type: 'student_try', question: 'q', answer_type: 'short_text', [field]: '42' }] });
    expect((result.lesson.sequence as Array<Record<string, unknown>>)[0].correct_answer).toBe('42');
    expect(result.errors).toHaveLength(0);
  });
  it('infers a marked choice', () => {
    const result = normalizeCanonicalAnswers({ sequence: [{ id: 'q', type: 'student_try', question: 'q', answer_type: 'selection', choices: [{ label: 'A' }, { label: 'B', correct: true }] }] });
    expect((result.lesson.sequence as Array<Record<string, unknown>>)[0].correct_answer).toBe('B');
  });
  it('rejects ambiguous choices when more than one option is marked correct', () => {
    const result = normalizeCanonicalAnswers({ sequence: [{ id: 'q', type: 'student_try', question: 'q', answer_type: 'selection', choices: [
      { label: 'A', correct: true },
      { label: 'B', correct: true },
    ] }] });
    expect(result.lesson.sequence).toEqual([{ id: 'q', type: 'student_try', question: 'q', answer_type: 'selection', choices: [
      { label: 'A', correct: true },
      { label: 'B', correct: true },
    ] }]);
    expect(result.errors).toEqual([{ path: 'sequence[0].correct_answer', message: 'Interactive block has no safely inferable correct answer.' }]);
  });
  it('rejects a marked choice with no usable answer value', () => {
    const result = normalizeCanonicalAnswers({ sequence: [{ id: 'q', type: 'student_try', question: 'q', answer_type: 'selection', choices: [{ correct: true }] }] });
    expect(result.errors[0].path).toBe('sequence[0].correct_answer');
  });
  it('normalizes prediction answers using the same safe aliases', () => {
    const result = normalizeCanonicalAnswers({ sequence: [{ id: 'p', type: 'prediction', question: 'q', explanation: 'e', expected_answer: 'B' }] });
    expect((result.lesson.sequence as Array<Record<string, unknown>>)[0].correct_answer).toBe('B');
  });
  it('reports an interactive item with no safe answer', () => {
    const result = normalizeCanonicalAnswers({ sequence: [{ id: 'q', type: 'student_try', question: 'q', answer_type: 'short_text' }] });
    expect(result.errors[0].path).toContain('correct_answer');
  });
  it('leaves explanatory concepts alone', () => {
    const result = normalizeCanonicalAnswers({ sequence: [{ id: 'c', type: 'concept', title: 'Explain', content: 'x', question: 'q' }] });
    expect(result.errors).toHaveLength(0);
  });
  it('normalizes a single success criterion and an alias', () => {
    const direct = normalizeCanonicalAnswers({ success_criteria: 'Je peux comparer les nombres.', sequence: [] });
    expect(direct.lesson.success_criteria).toEqual(['Je peux comparer les nombres.']);
    const alias = normalizeCanonicalAnswers({ successCriteria: ['Je peux expliquer la méthode.'], sequence: [] });
    expect(alias.lesson.success_criteria).toEqual(['Je peux expliquer la méthode.']);
  });
  it('removes empty and case-insensitive duplicate criteria and caps at five', () => {
    const result = normalizeCanonicalAnswers({ success_criteria: ['A', '', 'a', 'B', 'C', 'D', 'E', 'F'], sequence: [] });
    expect(result.lesson.success_criteria).toEqual(['A', 'B', 'C', 'D', 'E']);
  });
  it('uses planned criteria as a bounded fallback without inventing placeholders', () => {
    const result = normalizeCanonicalAnswers({ sequence: [] }, ['Je peux expliquer la valeur.', '']);
    expect(result.lesson.success_criteria).toEqual(['Je peux expliquer la valeur.']);
    const invalid = normalizeCanonicalAnswers({ sequence: [] });
    expect(invalid.lesson.success_criteria).toBeUndefined();
  });
  it('removes provider mastery-question keys before persistence', () => {
    const result = normalizeCanonicalAnswers({
      mastery: {
        0: { id: 'm1', question: 'Q', correct_answer: '1' },
        skills: [],
        threshold: 0.8,
      },
      sequence: [],
    });
    expect(result.lesson.mastery).toEqual({ skills: [], threshold: 0.8 });
    expect(result.events).toContainEqual({ path: 'mastery', from: '0', to: 'skills,threshold' });
  });
});
