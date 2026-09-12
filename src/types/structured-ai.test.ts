import { describe, expect, it } from 'vitest';
import {
  structuredCurriculumContextSchema,
  structuredLearningGenerationSchema,
} from './structured-ai';

const context = {
  subjectId: 'mathematiques', subjectName: 'Mathématiques', conceptId: 'math:fractions', conceptName: 'Fractions',
  ageBand: 'upper_primary', language: 'fr', curriculumEvidence: ['Comparer des fractions simples.'],
};

describe('structured AI contracts', () => {
  it('accepts bounded curriculum context', () => {
    expect(structuredCurriculumContextSchema.parse(context).conceptId).toBe('math:fractions');
  });

  it('rejects unsupported age bands and excessive evidence', () => {
    expect(structuredCurriculumContextSchema.safeParse({ ...context, ageBand: 'adult' }).success).toBe(false);
    expect(structuredCurriculumContextSchema.safeParse({ ...context, curriculumEvidence: Array.from({ length: 13 }, () => 'x') }).success).toBe(false);
  });

  it('accepts a strict exercise set', () => {
    const parsed = structuredLearningGenerationSchema.safeParse({
      kind: 'exercise_set', groundingNote: 'Grounded in the supplied objective.',
      exercises: [{ id: 'f1', prompt: 'Quelle fraction est la plus grande ?', answerType: 'multiple_choice', choices: [{ id: 'a', text: '1/2' }, { id: 'b', text: '1/4' }], correctAnswer: 'a', explanation: 'Une moitié est plus grande qu’un quart.', hint: 'Compare des parts du même tout.', masteryLevel: 3, difficulty: 2, tags: ['fractions'] }],
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects incomplete or out-of-range generated content', () => {
    expect(structuredLearningGenerationSchema.safeParse({ kind: 'hint', hint: { text: 'Think.', strategy: 'Compare.', revealLevel: 4, avoidsFinalAnswer: true }, groundingNote: 'x' }).success).toBe(false);
    expect(structuredLearningGenerationSchema.safeParse({ kind: 'exercise_set', exercises: [], groundingNote: 'x' }).success).toBe(false);
  });

  it('supports remediation and contextual problem outputs', () => {
    expect(structuredLearningGenerationSchema.safeParse({ kind: 'remediation', remediation: { misconception: 'Confuses denominator and numerator.', explanation: 'The denominator counts equal parts.', steps: ['Identify the whole.', 'Count equal parts.'], checkQuestion: 'What does 4 mean in 3/4?', checkAnswer: 'The whole is divided into 4 equal parts.' }, groundingNote: 'Concept label only.' }).success).toBe(true);
    expect(structuredLearningGenerationSchema.safeParse({ kind: 'contextual_problem', problem: { prompt: 'Share 3 pizzas equally.', expectedMethod: 'Use fractions.', answer: 'Depends on the number of people.', hints: ['Represent each pizza as one whole.'], transferContext: 'Sharing quantities fairly.' }, groundingNote: 'Concept label only.' }).success).toBe(true);
  });
});
