import { describe, expect, it } from 'vitest';
import { compileV21LessonDraft } from './v21-draft-compiler.ts';

describe('V2.1 provider draft compiler', () => {
  it('does not let incomplete optional metadata invalidate a complete lesson draft', () => {
    const result = compileV21LessonDraft({
      lesson_goal: 'Résoudre une équation simple.',
      prerequisites: [{ id: 'p1', description: '', check_question: '', expected_answer: '', remediation_hint: '' }],
      misconceptions: [{ id: 'm1', description: '', detect_if: '', feedback: '', remediation_strategy: '' }],
      sequence: [{ id: 'c1', type: 'concept', title: 'Équation', content: 'Une égalité avec une inconnue.' }],
    });

    expect(result.discardedOptionalMetadata).toEqual(['prerequisites', 'misconceptions']);
    expect(result.lesson).toMatchObject({ prerequisites: [], misconceptions: [] });
  });

  it('keeps the canonical empty arrays when the provider omits optional metadata', () => {
    const result = compileV21LessonDraft({ lesson_goal: 'Comprendre.' });
    expect(result.discardedOptionalMetadata).toEqual([]);
    expect(result.lesson).toMatchObject({ prerequisites: [], misconceptions: [] });
  });
});
