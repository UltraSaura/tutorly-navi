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
});
