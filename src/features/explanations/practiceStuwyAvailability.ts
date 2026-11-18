import type { PracticeTopic } from '@/hooks/usePracticeTopics';

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function findPracticeSubtractionTopic(subjectSlug: string, level: string | null | undefined, topics: PracticeTopic[], activePracticeTopicIds: Set<string>) {
  const subject = normalize(subjectSlug).replace(/[^a-z0-9]/g, '');
  const normalizedLevel = normalize(level ?? '').replace(/[^a-z0-9]/g, '');
  if (!['mathematiques', 'maths'].includes(subject) || normalizedLevel !== 'cm1') return null;
  return topics.find((topic) => {
    const label = normalize(topic.topicLabel).replace(/[^a-z0-9]+/g, ' ').trim();
    const isSubtractionTopic = label.includes('soustract');
    const isFourOperationsTopic = /\b(quatre|4) operations?\b/.test(label);
    return (isSubtractionTopic || isFourOperationsTopic) && activePracticeTopicIds.has(topic.id);
  }) ?? null;
}
