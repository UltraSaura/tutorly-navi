import { describe, expect, it } from 'vitest';
import { getExactPracticeTags, matchesExactPractice } from './exactPracticeMatcher';

describe('exact practice matcher', () => {
  it('matches division questions with the same operand structure and remainder type', () => {
    const question = {
      id: 'division-1',
      kind: 'numeric',
      prompt: '122 ÷ 48',
      answer: 2,
    } as const;

    expect(matchesExactPractice('100 ÷ 45', question)).toBe(true);
    expect(matchesExactPractice('100 ÷ 45', { ...question, prompt: '12 ÷ 4' })).toBe(false);
  });

  it('requires the same trailing-zero structure for multiplication', () => {
    expect(getExactPracticeTags('300 × 43')).toContain('strategy:trailing-zeros');
    expect(matchesExactPractice('300 × 43', {
      id: 'multiplication-1',
      kind: 'numeric',
      prompt: '500 × 67',
      answer: 33500,
    })).toBe(true);
    expect(matchesExactPractice('300 × 43', {
      id: 'multiplication-2',
      kind: 'numeric',
      prompt: '345 × 67',
      answer: 23115,
    })).toBe(false);
  });
});
