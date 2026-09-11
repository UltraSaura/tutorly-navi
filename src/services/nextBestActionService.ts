import type {
  NextBestActionInput,
  RecommendedAction,
  RecommendationCurriculumTopic,
} from '@/types/recommendation';

const DEFAULT_MAX_ACTIONS = 4;

function learnRoute(topic: RecommendationCurriculumTopic): string {
  return `/learning/${encodeURIComponent(topic.subjectSlug)}/${encodeURIComponent(topic.topicSlug)}`;
}

function topicById(curriculum: RecommendationCurriculumTopic[]) {
  return new Map(curriculum.map((topic) => [topic.topicId, topic]));
}

function sortCurriculum(curriculum: RecommendationCurriculumTopic[]) {
  return [...curriculum].sort((a, b) => a.orderIndex - b.orderIndex || a.topicName.localeCompare(b.topicName));
}

function buildContinueActions(input: NextBestActionInput): RecommendedAction[] {
  const topics = topicById(input.curriculum);
  return input.progress
    .filter((row) => row.progressType === 'lesson_level_completed' && (row.progressPercentage ?? 0) > 0 && (row.progressPercentage ?? 0) < 100)
    .map((row) => {
      const topic = topics.get(row.topicId);
      if (!topic) return null;
      return {
        id: `continue:${topic.topicId}`,
        source: 'learn' as const,
        subjectId: topic.subjectId,
        subjectName: topic.subjectName,
        conceptId: topic.topicId,
        conceptName: topic.topicName,
        reason: 'continue' as const,
        priority: 700 + Math.min(99, row.progressPercentage ?? 0),
        estimatedMinutes: topic.estimatedMinutes,
        title: `Continue ${topic.topicName}`,
        description: 'Pick up where you left off.',
        route: learnRoute(topic),
        metadata: { progressPercentage: row.progressPercentage ?? 0 },
      } satisfies RecommendedAction;
    })
    .filter((action): action is RecommendedAction => Boolean(action));
}

function buildWeakSkillActions(input: NextBestActionInput): RecommendedAction[] {
  const topics = topicById(input.curriculum);
  const failures = new Map<string, { count: number; latest?: string | null }>();
  for (const work of input.homework) {
    if (work.isCorrect !== false || !work.topicId || !topics.has(work.topicId)) continue;
    const current = failures.get(work.topicId) ?? { count: 0 };
    current.count += Math.max(1, work.attemptsCount || 1);
    if (!current.latest || (work.updatedAt && work.updatedAt > current.latest)) current.latest = work.updatedAt;
    failures.set(work.topicId, current);
  }

  return [...failures.entries()]
    .filter(([, evidence]) => evidence.count >= 2)
    .map(([topicId, evidence]) => {
      const topic = topics.get(topicId)!;
      return {
        id: `weak:${topicId}`,
        source: 'learn' as const,
        subjectId: topic.subjectId,
        subjectName: topic.subjectName,
        conceptId: topic.topicId,
        conceptName: topic.topicName,
        reason: 'weak_skill' as const,
        priority: 500 + Math.min(99, evidence.count * 10),
        estimatedMinutes: topic.estimatedMinutes,
        title: `Strengthen ${topic.topicName}`,
        description: 'A little focused review should make this easier.',
        route: learnRoute(topic),
        metadata: { failedAttempts: evidence.count },
      } satisfies RecommendedAction;
    });
}

function buildHomeworkActions(input: NextBestActionInput): RecommendedAction[] {
  const topics = topicById(input.curriculum);
  return input.homework
    .filter((work) => work.isCorrect === false)
    .slice(0, 3)
    .map((work, index) => {
      const topic = work.topicId ? topics.get(work.topicId) : undefined;
      return {
        id: `homework:${work.id}`,
        source: 'tutor' as const,
        subjectId: work.subjectId ?? topic?.subjectId ?? 'unknown',
        subjectName: topic?.subjectName,
        conceptId: topic?.topicId,
        conceptName: topic?.topicName,
        reason: 'homework_followup' as const,
        priority: 400 - index,
        title: topic ? `Review ${topic.topicName} homework` : 'Review your recent homework',
        description: 'Return to Tutor for help with a recent incorrect exercise.',
        route: '/chat',
        metadata: { exerciseHistoryId: work.id },
      } satisfies RecommendedAction;
    });
}

function buildCurriculumActions(input: NextBestActionInput): RecommendedAction[] {
  const completed = new Set(
    input.progress
      .filter((row) => row.progressType === 'lesson_completed' || (row.progressPercentage ?? 0) >= 100)
      .map((row) => row.topicId),
  );

  return sortCurriculum(input.curriculum)
    .filter((topic) => !completed.has(topic.topicId))
    .slice(0, 6)
    .map((topic, index) => ({
      id: `curriculum:${topic.topicId}`,
      source: 'learn' as const,
      subjectId: topic.subjectId,
      subjectName: topic.subjectName,
      conceptId: topic.topicId,
      conceptName: topic.topicName,
      reason: 'curriculum' as const,
      priority: 200 - index,
      estimatedMinutes: topic.estimatedMinutes,
      title: `Learn ${topic.topicName}`,
      description: `Next in ${topic.subjectName}.`,
      route: learnRoute(topic),
    } satisfies RecommendedAction));
}

function diversify(actions: RecommendedAction[], maxActions: number): RecommendedAction[] {
  const sorted = [...actions].sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
  if (sorted.length <= 1) return sorted.slice(0, maxActions);

  const result = [sorted.shift()!];
  while (sorted.length && result.length < maxActions) {
    const usedSubjects = new Set(result.map((action) => action.subjectId));
    const firstPriority = sorted[0].priority;
    const diverseIndex = sorted.findIndex(
      (candidate) => !usedSubjects.has(candidate.subjectId) && firstPriority - candidate.priority <= 15,
    );
    result.push(sorted.splice(diverseIndex >= 0 ? diverseIndex : 0, 1)[0]);
  }
  return result;
}

/**
 * Deterministic Phase 8 ranking. It only ranks evidence supplied by callers.
 * Prerequisite and spaced-review reasons are intentionally reserved for later
 * persisted evidence; this service never fabricates either one.
 */
export function getNextBestActions(input: NextBestActionInput): RecommendedAction[] {
  if (!input.studentId) return [];
  const maxActions = Math.max(1, input.maxActions ?? DEFAULT_MAX_ACTIONS);
  const candidates = [
    ...buildContinueActions(input),
    ...buildWeakSkillActions(input),
    ...buildHomeworkActions(input),
    ...buildCurriculumActions(input),
  ];

  const deduped = new Map<string, RecommendedAction>();
  for (const action of candidates) {
    const key = `${action.source}:${action.conceptId ?? action.id}`;
    const existing = deduped.get(key);
    if (!existing || action.priority > existing.priority) deduped.set(key, action);
  }
  return diversify([...deduped.values()], maxActions);
}
