export type BulkLessonStatus = 'staging' | 'published' | 'none';

export function deriveBulkLessonStatus({
  lessonContent,
  stagingStatuses,
}: {
  lessonContent: unknown;
  stagingStatuses: string[];
}): BulkLessonStatus {
  if (stagingStatuses.some((status) => status === 'draft' || status === 'validated')) return 'staging';
  if (lessonContent !== null && lessonContent !== undefined) return 'published';
  return 'none';
}
