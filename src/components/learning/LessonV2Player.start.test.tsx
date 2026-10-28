import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { LessonV2Player } from './LessonV2Player';
import type { LessonV2 } from '@/types/lesson-generator';

vi.mock('@/context/FamilyProfileContext', () => ({ useLearner: () => ({ user: null }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: vi.fn() } }));
vi.mock('@/services/learningAnalytics', () => ({ trackLearningInteraction: vi.fn() }));

const lesson = (prerequisites: unknown[]): LessonV2 => ({
  version: '2.0', lesson_goal: 'Reconnaître un rectangle', success_criteria: ['Identifier les angles droits'],
  prerequisites, sequence: [{ id: 'c1', type: 'concept', title: 'Le rectangle', content: 'Un rectangle possède quatre angles droits.' }],
  misconceptions: [], mastery: { skills: [], threshold: 0.8 },
} as LessonV2);
const render = (value: LessonV2) => renderToStaticMarkup(<LessonV2Player topicId="geometry" topicName="La géométrie plane" lesson={value} readOnly />);

describe('starting a published lesson', () => {
  it.each([1, 2, 3, 4])('starts level %s when its prerequisites array is empty', (level) => {
    const value = lesson([]);
    value.lesson_goal = `Géométrie niveau ${level}`;
    value.sequence[0].id = `level-${level}-concept`;
    const markup = render(value);
    expect(markup).toContain('Un rectangle possède quatre angles droits.');
    expect(markup).not.toContain('Avant de commencer');
  });
  it('keeps a real prerequisite instead of silently bypassing it', () => {
    const markup = render(lesson([{ id: 'p1', description: 'Reconnaître une forme', check_question: 'Nomme cette forme', answer_type: 'short_text', expected_answer: 'rectangle', remediation_hint: 'Observe les côtés' }]));
    expect(markup).toContain('Avant de commencer');
    expect(markup).toContain('Nomme cette forme');
  });
  it('reports malformed non-empty prerequisites instead of crashing or bypassing them', () => {
    expect(render(lesson([null]))).toContain('Les données du prérequis sont indisponibles');
  });
});
