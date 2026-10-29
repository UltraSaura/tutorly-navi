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
  { id: 'reperage-deplacements', label: 'Repérage et déplacements', terms: ['reperage', 'deplacement', 'espace'] },
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

export function canonicalTopicLabel(topicLabel: string) {
  const trimmed = topicLabel.trim();
  const withoutArticle = trimmed.replace(/^(?:la|le|les|l['’])\s+/i, '');
  return withoutArticle ? withoutArticle.charAt(0).toUpperCase() + withoutArticle.slice(1) : trimmed;
}

export function getThemeTopicDisplayLabels(topics: PublishedLessonTopic[]) {
  const canonicalLabels = topics.map((topic) => canonicalTopicLabel(topic.topicLabel));
  const counts = new Map<string, number>();
  for (const label of canonicalLabels) counts.set(label, (counts.get(label) ?? 0) + 1);

  return canonicalLabels.map((label, index) => (
    (counts.get(label) ?? 0) > 1 ? `Parcours ${index + 1}` : label
  ));
}

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
