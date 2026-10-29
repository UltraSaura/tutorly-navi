import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { LessonV21Path, getLessonLevelState } from './LessonV21Path';
import type { LessonV21 } from '@/types/lesson-generator';

vi.mock('@/context/FamilyProfileContext', () => ({ useLearner: () => ({ user: null }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: vi.fn() } }));
vi.mock('@/services/learningAnalytics', () => ({ trackLearningInteraction: vi.fn() }));

const lesson: LessonV21 = {
  version: '2.1',
  topic_goal: 'Comprendre les fractions',
  levels: [1, 2, 3, 4].map((level) => ({
    id: `level-${level}`,
    level_number: level,
    title: ['Découverte', 'Comprendre', 'S’entraîner', 'Maîtriser'][level - 1],
    purpose: 'Progresser',
    difficulty: String(level),
    objective_ids: [],
    lesson: {
      lesson_goal: `Objectif ${level}`,
      success_criteria: ['Réussir'],
      prerequisites: [],
      sequence: [{ id: `concept-${level}`, type: 'concept', title: 'Concept', content: 'Contenu' }],
      misconceptions: [],
      mastery: { skills: [], threshold: 0.8 },
    },
  })),
};

describe('student lesson theme level path', () => {
  it('renders exactly four vertical level cards with only level 1 available initially', () => {
    const html = renderToStaticMarkup(<LessonV21Path topicId="topic-1" topicName="Fractions" lesson={lesson} />);
    expect((html.match(/data-testid="lesson-level-card"/g) ?? []).length).toBe(4);
    expect((html.match(/data-level-state="current"/g) ?? []).length).toBe(1);
    expect((html.match(/data-level-state="locked"/g) ?? []).length).toBe(3);
    expect(html).toContain('NIVEAU 1');
    expect(html).toContain('NIVEAU 4');
    expect(html).toContain('NIVEAU 1 — Découverte');
    expect(html).toContain('NIVEAU 4 — Maîtriser');
  });

  it('unlocks only the next level after the previous one is completed', () => {
    expect(getLessonLevelState(0, 0, 4)).toBe('current');
    expect(getLessonLevelState(1, 0, 4)).toBe('locked');
    expect(getLessonLevelState(1, 1, 4)).toBe('current');
    expect(getLessonLevelState(2, 1, 4)).toBe('locked');
    expect(getLessonLevelState(3, 1, 4)).toBe('locked');
  });
});
