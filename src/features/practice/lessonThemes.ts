import { parseLessonContent, parseLessonV21, type LessonV2, type LessonV21, type LessonLevelV21 } from '@/types/lesson-generator';

export const LESSON_THEMES = [
  { id: 'calcul', label: 'Calcul', terms: ['calcul'] },
  { id: 'nombres-decimaux', label: 'Nombres décimaux', terms: ['decimal', 'decimaux'] },
  { id: 'proportionnalite', label: 'Proportionnalité', terms: ['proportion'] },
  { id: 'resolution-problemes', label: 'Résolution de problèmes', terms: ['probleme'] },
  { id: 'fractions', label: 'Fractions', terms: ['fraction'] },
  { id: 'geometrie', label: 'Géométrie', terms: ['geometr', 'figure plane'] },
  { id: 'aires', label: 'Aires', terms: ['aire'] },
  { id: 'angles', label: 'Angles', terms: ['angle'] },
  { id: 'solides', label: 'Solides', terms: ['solide'] },
  { id: 'reperage-deplacements', label: 'Repérage', terms: ['reperage', 'deplacement', 'espace'] },
] as const;

export const CANONICAL_LEVEL_LABELS = [
  'Niveau 1 — Découverte',
  'Niveau 2 — Comprendre',
  'Niveau 3 — S’entraîner',
  'Niveau 4 — Maîtriser',
] as const;

export type LessonThemeId = (typeof LESSON_THEMES)[number]['id'];

export type PublishedLessonTopic = {
  id: string;
  slug: string;
  topicLabel: string;
  orderIndex: number;
  lessonContent: unknown;
};

export type LessonThemeGroup = {
  id: LessonThemeId;
  label: string;
  topics: PublishedLessonTopic[];
};

export type AggregatedLessonLevel = {
  topicId: string;
  topicLabel: string;
  levelNumber: number;
  level: LessonLevelV21;
  sourceOrder: number;
};

export type ThemeLessonPlan = {
  v21Levels: AggregatedLessonLevel[];
  legacyTopics: Array<{ topicId: string; topicLabel: string; lesson?: LessonV2 }>;
  unsupportedTopicIds: string[];
};

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’]/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function resolveLessonThemeId(topicName: string, domainLabel = ''): LessonThemeId | null {
  const fromName = LESSON_THEMES.find((candidate) => candidate.terms.some((term) => normalize(topicName).includes(term)));
  if (fromName) return fromName.id;
  const fromDomain = LESSON_THEMES.find((candidate) => candidate.terms.some((term) => normalize(domainLabel).includes(term)));
  return fromDomain?.id ?? null;
}

export function groupPublishedLessonTopics(
  topics: Array<PublishedLessonTopic & { domainLabel?: string | null }>,
): LessonThemeGroup[] {
  const groups = new Map<LessonThemeId, PublishedLessonTopic[]>();

  for (const topic of topics) {
    if (topic.lessonContent == null) continue;
    const themeId = resolveLessonThemeId(topic.topicLabel, topic.domainLabel ?? '');
    if (!themeId) continue;
    const list = groups.get(themeId) ?? [];
    list.push(topic);
    groups.set(themeId, list);
  }

  return LESSON_THEMES
    .filter((theme) => groups.has(theme.id))
    .map((theme) => ({
      id: theme.id,
      label: theme.label,
      topics: [...(groups.get(theme.id) ?? [])].sort((a, b) => a.orderIndex - b.orderIndex),
    }));
}

function stableJson(value: unknown): string {
  return JSON.stringify(value);
}

function levelContentKey(level: LessonLevelV21): string {
  const { id: _id, ...content } = level;
  return stableJson(content);
}

function isCanonicalTopic(topic: PublishedLessonTopic, theme: LessonThemeGroup): boolean {
  const topicName = normalize(topic.topicLabel).replace(/^les\s+/, '');
  const themeName = normalize(theme.label).replace(/^les\s+/, '');
  return topicName === themeName;
}

/**
 * Creates the student-facing plan without inventing missing levels.
 *
 * The canonical topic is considered first. Other published topics can fill a
 * missing level, and a distinct conflict at an existing level is retained as
 * a second source entry rather than being silently discarded. Exact duplicate
 * level payloads are the only entries deduplicated.
 */
export function buildThemeLessonPlan(theme: LessonThemeGroup): ThemeLessonPlan {
  const orderedTopics = [...theme.topics].sort((a, b) => {
    const canonicalDelta = Number(isCanonicalTopic(b, theme)) - Number(isCanonicalTopic(a, theme));
    return canonicalDelta || a.orderIndex - b.orderIndex || a.id.localeCompare(b.id);
  });
  const v21Levels: AggregatedLessonLevel[] = [];
  const legacyTopics: ThemeLessonPlan['legacyTopics'] = [];
  const unsupportedTopicIds: string[] = [];
  const seenLevelPayloads = new Set<string>();

  orderedTopics.forEach((topic, sourceOrder) => {
    const v21 = parseLessonV21(topic.lessonContent);
    if (v21) {
      v21.levels.forEach((level) => {
        const payloadKey = levelContentKey(level);
        if (seenLevelPayloads.has(payloadKey)) return;
        seenLevelPayloads.add(payloadKey);
        v21Levels.push({ topicId: topic.id, topicLabel: topic.topicLabel, levelNumber: level.level_number, level, sourceOrder });
      });
      return;
    }

    const v2 = parseLessonContent(topic.lessonContent);
    if (v2) {
      legacyTopics.push({ topicId: topic.id, topicLabel: topic.topicLabel, lesson: v2 });
      return;
    }
    const raw = topic.lessonContent;
    if (raw && typeof raw === 'object' && typeof (raw as { explanation?: unknown }).explanation === 'string' && typeof (raw as { example?: unknown }).example === 'string') {
      legacyTopics.push({ topicId: topic.id, topicLabel: topic.topicLabel });
      return;
    }
    unsupportedTopicIds.push(topic.id);
  });

  v21Levels.sort((a, b) => a.levelNumber - b.levelNumber || a.sourceOrder - b.sourceOrder || a.topicId.localeCompare(b.topicId));
  return { v21Levels, legacyTopics, unsupportedTopicIds };
}
