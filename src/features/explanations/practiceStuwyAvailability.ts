import type { PracticeTopic } from '@/hooks/usePracticeTopics';

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function findPracticeSubtractionTopic(subjectSlug: string, level: string | null | undefined, topics: PracticeTopic[], activePracticeTopicIds: Set<string>) {
  const subject = normalize(subjectSlug).replace(/[^a-z0-9]/g, '');
  const normalizedLevel = normalize(level ?? '').replace(/[^a-z0-9]/g, '');
  if (!['mathematiques', 'maths'].includes(subject) || normalizedLevel !== 'cm1') return null;
  return topics.find((topic) => normalize(topic.topicLabel).includes('soustract') && activePracticeTopicIds.has(topic.id)) ?? null;
}
