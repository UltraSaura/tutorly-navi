import { describe, expect, it } from 'vitest';
import { normalizeGeneratedLesson, ensureRequiredVisuals } from './lesson-normalization.ts';
import { validateLessonV21 } from './lesson-v21-contract.ts';
import { pedagogicalIssues } from './pedagogical-quality.ts';
import { isSupportedVisualKind } from './visual-policy.ts';

const fixture = () => ({
  lesson_goal: 'Comprendre les fractions.', success_criteria: ['Je sais lire une fraction.'], prerequisites: [], misconceptions: [],
  sequence: [
    { id: 'c1', type: 'concept', title: 'Fractions', content: 'On partage un tout en plusieurs parties de même taille.',
      key_points: [{ label: 'Dénominateur', text: 'Il indique le nombre de parts égales.' }, { label: 'Numérateur', text: 'Il indique combien de parts sont prises.' }],
      takeaway: 'Lis le nombre du bas avant celui du haut.', visual: { kind: 'fraction_bar', data: { parts: 4, filled: 1 } } },
    { id: 's1', type: 'student_try', question: 'Quelle fraction représente une part sur quatre ?', answer_type: 'short_text', correct_answer: '1/4', success_feedback: 'Bravo !', error_feedback: 'Compte les parts.' },
    { id: 'm1', type: 'mastery_check', questions: [{ id: 'q1', question: 'Écris un quart.', answer_type: 'short_text', correct_answer: '1/4', skill: 'fractions', difficulty: 1, success_feedback: 'Bien joué !', error_feedback: 'Revois les parts.' }] },
  ], mastery: { skills: ['fractions'], threshold: 0.8 },
});

function validate(input: ReturnType<typeof fixture>) {
  const { lesson, events } = normalizeGeneratedLesson(input, 'Fractions');
  const ensured = ensureRequiredVisuals(lesson, 'Fractions').lesson;
  const full = { version: '2.1', topic_goal: 'Comprendre les fractions.', levels: [{ id: 'level_1', level_number: 1, title: 'Fractions', purpose: 'Lire les fractions.', difficulty: 'foundation', objective_ids: [], lesson: ensured }] };
  expect(validateLessonV21(full)).toEqual({ success: true });
  expect(pedagogicalIssues(ensured, 'CM2', 'Fractions')).toEqual([]);
  const visual = (ensured.sequence as Array<Record<string, unknown>>)[0].visual;
  expect(visual && typeof visual === 'object' && isSupportedVisualKind((visual as Record<string, unknown>).kind)).toBe(true);
  expect((visual as Record<string, unknown>).kind).toBe('fraction_bar');
  return { events, visual };
}

describe('provider-free V2.1 Fractions normalization', () => {
  for (const [name, visual] of [
    ['literal missing', { kind: 'missing' }],
    ['omitted kind', { data: { parts: 4, filled: 1 } }],
    ['unsupported kind', { kind: 'diagram_magic' }],
    ['omitted visual', undefined],
  ] as const) {
    it(`repairs ${name} before canonical and pedagogical validation`, () => {
      const lesson = fixture();
      if (visual === undefined) delete (lesson.sequence[0] as { visual?: unknown }).visual;
      else (lesson.sequence[0] as { visual?: unknown }).visual = visual;
      const result = validate(lesson);
      expect(result.events).toHaveLength(1);
      expect(result.events[0].to).toBe('fraction_bar');
      if (name === 'omitted kind') expect(result.visual.data).toMatchObject({ parts: 4, filled: 1 });
    });
  }

  it('normalizes two standalone visual blocks with missing kinds before validation', () => {
    const lesson = fixture();
    lesson.sequence.splice(1, 0,
      { id: 'v1', type: 'visual', title: 'Voir les parts égales', content: 'Observe le partage.', visual: { kind: 'missing' } } as unknown as typeof lesson.sequence[number],
      { id: 'v2', type: 'visual', title: 'Voir une fraction', content: 'Observe une autre représentation.', visual: {} } as unknown as typeof lesson.sequence[number]);
    const { lesson: normalized, events } = normalizeGeneratedLesson(lesson, 'Fractions');
    expect(events).toHaveLength(2);
    expect(events.map(event => event.to)).toEqual(['fraction_bar', 'fraction_bar']);
    expect(validateLessonV21({ version: '2.1', topic_goal: 'Fractions', levels: [{ id: 'level_1', level_number: 1, title: 'Fractions', purpose: 'Lire les fractions.', difficulty: 'foundation', objective_ids: [], lesson: normalized }] })).toEqual({ success: true });
    expect(pedagogicalIssues(normalized, 'CM2', 'Fractions')).toEqual([]);
  });

  it('removes malformed optional concept fields without a provider call', () => {
    const lesson = fixture();
    lesson.sequence.splice(1, 0, { id: 'c2', type: 'concept', title: 'Observer', content: 'On peut observer les objets.', key_points: [''], takeaway: '' } as unknown as typeof lesson.sequence[number]);
    const { lesson: normalized } = normalizeGeneratedLesson(lesson, 'Fractions');
    const optional = (normalized.sequence as Array<Record<string, unknown>>)[1];
    expect(optional.key_points).toBeUndefined();
    expect(optional.takeaway).toBeUndefined();
    expect(validateLessonV21({ version: '2.1', topic_goal: 'Fractions', levels: [{ id: 'level_1', level_number: 1, title: 'Fractions', purpose: 'Lire les fractions.', difficulty: 'foundation', objective_ids: [], lesson: normalized }] })).toEqual({ success: true });
  });
});

describe('provider-free geometry normalization', () => {
  it('selects a geometry-specific fallback instead of generic diagram', () => {
    const lesson = fixture();
    lesson.sequence[0] = {
      id: 'c-angle', type: 'concept', title: 'Les angles',
      content: 'Un angle est formé par deux demi-droites.',
      visual: { kind: 'diagram' },
    } as unknown as typeof lesson.sequence[number];
    const { lesson: normalized } = normalizeGeneratedLesson(lesson, 'Angles');
    const visual = (normalized.sequence as Array<Record<string, unknown>>)[0].visual as Record<string, unknown>;
    expect(visual.kind).toBe('angle');
    expect(pedagogicalIssues(normalized, 'CM2', 'Angles').filter((issue) => issue.path.endsWith('.visual.kind'))).toEqual([]);
  });
});
