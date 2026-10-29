import { describe, expect, it } from 'vitest';
import { canonicalTopicLabel, getThemeTopicDisplayLabels, groupPublishedLessonTopics, resolveLessonThemeId } from './lessonThemes';

const topic = (name: string, id = name) => ({
  id,
  slug: id,
  topicLabel: name,
  orderIndex: 1,
  lessonContent: { version: '2.1' },
});

describe('published lesson theme navigation', () => {
  it('uses one canonical tile for near-duplicate problem titles', () => {
    const groups = groupPublishedLessonTopics([topic('Résolution de problèmes', 'a'), topic('La résolution de problèmes', 'b')]);
    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe('Résolution de problèmes');
    expect(groups[0].topics.map((entry) => entry.id)).toEqual(['a', 'b']);
    expect(getThemeTopicDisplayLabels(groups[0].topics)).toEqual(['Parcours 1', 'Parcours 2']);
  });

  it('canonicalizes article variants without changing topic IDs', () => {
    expect(canonicalTopicLabel('Les fractions')).toBe('Fractions');
    expect(canonicalTopicLabel('Les angles')).toBe('Angles');
    expect(canonicalTopicLabel('La résolution de problèmes')).toBe('Résolution de problèmes');
    expect(canonicalTopicLabel('Aires')).toBe('Aires');
  });

  it('keeps proportion subdomains in one theme while retaining their topic IDs', () => {
    const groups = groupPublishedLessonTopics([
      topic('Proportionnalité (nombres)', 'numbers'),
      topic('Proportionnalité (mesures)', 'measures'),
      topic('Proportionnalité (géométrie)', 'geometry'),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].id).toBe('proportionnalite');
    expect(groups[0].topics.map((entry) => entry.id)).toEqual(['numbers', 'measures', 'geometry']);
  });

  it('hides drafts and topics without a supported canonical theme', () => {
    const groups = groupPublishedLessonTopics([
      topic('Fractions', 'published'),
      { ...topic('Solides', 'draft'), lessonContent: null },
      topic('Sujet non classé', 'unknown'),
    ]);
    expect(groups.map((group) => group.id)).toEqual(['fractions']);
  });

  it('resolves the spatial and decimal labels without relying on duplicate titles', () => {
    expect(resolveLessonThemeId("Le repérage et déplacements dans l'espace")).toBe('reperage-deplacements');
    expect(resolveLessonThemeId('Les nombres décimaux')).toBe('nombres-decimaux');
    expect(resolveLessonThemeId('Les nombres décimaux', 'Calcul')).toBe('nombres-decimaux');
  });
});
