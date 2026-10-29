import { describe, expect, it } from 'vitest';
import { CANONICAL_LEVEL_LABELS, groupPublishedLessonTopics, resolveLessonThemeId } from './lessonThemes';

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

  it('renders one tile for the complete proportionnalité and aires families', () => {
    const groups = groupPublishedLessonTopics([
      topic('Proportionnalité', 'proportion'),
      topic('Proportionnalité (nombres)', 'numbers'),
      topic('Proportionnalité (géométrie)', 'geometry'),
      topic('Proportionnalité (mesures)', 'measures'),
      topic('Aires', 'areas'),
      topic('Les aires', 'legacy-areas'),
    ]);
    const visibleTiles = groups.map((group) => group.label);
    expect(visibleTiles).toEqual(['Proportionnalité', 'Aires']);
    expect(new Set(visibleTiles).size).toBe(2);
    expect(visibleTiles).not.toContain('Proportionnalité (géométrie)');
    expect(visibleTiles).not.toContain('Les aires');
    expect(groups.flatMap((group) => group.topics.map((entry) => entry.id))).toEqual([
      'proportion', 'numbers', 'geometry', 'measures', 'areas', 'legacy-areas',
    ]);
  });

  it('defines the four level labels in order without child parcours labels', () => {
    expect(CANONICAL_LEVEL_LABELS).toEqual([
      'Niveau 1 — Découverte',
      'Niveau 2 — Comprendre',
      'Niveau 3 — S’entraîner',
      'Niveau 4 — Maîtriser',
    ]);
    expect(CANONICAL_LEVEL_LABELS.join(' ')).not.toContain('Parcours');
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
