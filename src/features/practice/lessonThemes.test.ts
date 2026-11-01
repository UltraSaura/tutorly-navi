import { describe, expect, it } from 'vitest';
import { CANONICAL_LEVEL_LABELS, buildThemeLessonPlan, groupPublishedLessonTopics, resolveLessonThemeId, type LessonThemeGroup } from './lessonThemes';

const topic = (name: string, id = name) => ({
  id,
  slug: id,
  topicLabel: name,
  orderIndex: 1,
  lessonContent: { version: '2.1' },
});

const level = (number: number, id = `level-${number}`) => ({
  id,
  level_number: number,
  title: `Niveau ${number}`,
  purpose: 'Comprendre',
  difficulty: String(number),
  objective_ids: [`objective-${number}`],
  lesson: {
    lesson_goal: `Objectif ${number}`,
    success_criteria: ['Réussir'],
    prerequisites: [{ id: `p-${number}`, description: 'Pré-requis', check_question: 'Combien ?', answer_type: 'numeric', expected_answer: 1, remediation_hint: 'Compte.' }],
    sequence: [{ id: `concept-${number}`, type: 'concept', title: 'Concept', content: `Contenu ${number}` }],
    misconceptions: [],
    mastery: { skills: [`skill-${number}`], threshold: 0.8 },
  },
});

const v21Topic = (name: string, id: string, levels: number[], orderIndex = 1, variant = 'shared') => ({
  id, slug: id, topicLabel: name, orderIndex, lessonContent: { version: '2.1', topic_goal: name, levels: levels.map((number) => ({ ...level(number), lesson: { ...level(number).lesson, lesson_goal: `${variant} ${number}` } })) },
});

const asTheme = (topics: ReturnType<typeof v21Topic>[], label = 'Proportionnalité'): LessonThemeGroup => ({ id: 'proportionnalite', label, topics });

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

  it('does not fabricate levels for an old one- or two-level V2.1 lesson', () => {
    expect(buildThemeLessonPlan(asTheme([v21Topic('Proportionnalité', 'one', [1])])).v21Levels.map((entry) => entry.levelNumber)).toEqual([1]);
    expect(buildThemeLessonPlan(asTheme([v21Topic('Proportionnalité', 'two', [1, 2])])).v21Levels.map((entry) => entry.levelNumber)).toEqual([1, 2]);
  });

  it('uses every published topic to fill missing levels and retains conflicts', () => {
    const plan = buildThemeLessonPlan(asTheme([
      v21Topic('Proportionnalité', 'canonical', [1, 2], 1),
      v21Topic('Proportionnalité (nombres)', 'numbers', [3, 4], 2),
      v21Topic('Proportionnalité (mesures)', 'measures', [2], 3, 'measures'),
    ]));
    expect(plan.v21Levels.map((entry) => entry.topicId)).toEqual(['canonical', 'canonical', 'measures', 'numbers', 'numbers']);
    expect(plan.v21Levels.map((entry) => entry.levelNumber)).toEqual([1, 2, 2, 3, 4]);
    expect(new Set(plan.v21Levels.map((entry) => entry.topicId))).toEqual(new Set(['canonical', 'numbers', 'measures']));
  });

  it('assembles all published Aires topics without creating a second theme path', () => {
    const plan = buildThemeLessonPlan({
      ...asTheme([
        v21Topic('Aires', 'areas-canonical', [1, 2], 1),
        v21Topic('Les aires', 'areas-legacy', [3, 4], 2, 'legacy'),
      ], 'Aires'),
      id: 'aires',
      label: 'Aires',
    });
    expect(plan.v21Levels.map((entry) => entry.levelNumber)).toEqual([1, 2, 3, 4]);
    expect(plan.v21Levels.map((entry) => entry.topicId)).toEqual(['areas-canonical', 'areas-canonical', 'areas-legacy', 'areas-legacy']);
  });

  it('keeps a single published four-level V2.1 lesson as four real levels', () => {
    const plan = buildThemeLessonPlan(asTheme([v21Topic('Proportionnalité', 'canonical', [1, 2, 3, 4])]));
    expect(plan.v21Levels).toHaveLength(4);
    expect(plan.v21Levels.map((entry) => entry.levelNumber)).toEqual([1, 2, 3, 4]);
  });

  it('deduplicates only identical level content, not merely the same level number', () => {
    const canonical = v21Topic('Aires', 'areas', [1]);
    const duplicate = v21Topic('Les aires', 'legacy-areas', [1]);
    const conflict = v21Topic('Aires (mesures)', 'areas-measures', [1], 1, 'different');
    const plan = buildThemeLessonPlan({ ...asTheme([canonical, duplicate, conflict], 'Aires'), id: 'aires' });
    expect(plan.v21Levels).toHaveLength(2);
    expect(plan.v21Levels.map((entry) => entry.topicId)).toEqual(['areas', 'areas-measures']);
  });

  it('keeps legacy V2 content accessible without turning it into four fake levels', () => {
    const content = { version: '2.0', lesson_goal: 'Aire', success_criteria: ['Réussir'], prerequisites: [{ id: 'p', description: 'Pré-requis', check_question: 'Combien ?', answer_type: 'numeric', expected_answer: 1, remediation_hint: 'Compte.' }], sequence: [{ id: 'c', type: 'concept', title: 'Concept', content: 'Aire' }], misconceptions: [], mastery: { skills: [], threshold: 0.8 } };
    const plan = buildThemeLessonPlan({ ...asTheme([{ ...topic('Aires', 'old'), lessonContent: content }], 'Aires'), id: 'aires' });
    expect(plan.v21Levels).toHaveLength(0);
    expect(plan.legacyTopics.map((entry) => entry.topicId)).toEqual(['old']);
  });
});
