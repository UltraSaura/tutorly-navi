export type StagingReviewMetadata = {
  promptVersion?: string;
  pedagogicalWarnings: Array<{ path: string; message: string }>;
  pedagogicalReviewRequired: boolean;
};

const KEY = '_staging_metadata';
const object = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;

function readMetadata(value: unknown): StagingReviewMetadata | undefined {
  const metadata = object(value);
  if (!metadata) return undefined;
  const promptVersion = typeof metadata.promptVersion === 'string' ? metadata.promptVersion : undefined;
  const warnings = Array.isArray(metadata.pedagogicalWarnings) ? metadata.pedagogicalWarnings : [];
  if (!promptVersion && (!Array.isArray(metadata.pedagogicalWarnings) || typeof metadata.pedagogicalReviewRequired !== 'boolean')) return undefined;
  return {
    pedagogicalWarnings: warnings.filter((issue): issue is { path: string; message: string } =>
      Boolean(object(issue)) && typeof issue.path === 'string' && typeof issue.message === 'string'),
    pedagogicalReviewRequired: metadata.pedagogicalReviewRequired === true,
    ...(promptVersion ? { promptVersion } : {}),
  };
}

export function withStagingMetadata<T>(lesson: T, metadata?: unknown): T {
  const review = readMetadata(metadata);
  return object(lesson) && review ? { ...lesson, [KEY]: review } : lesson;
}

export function getStoredStagingMetadata(lesson: unknown): StagingReviewMetadata | undefined {
  return readMetadata(object(lesson)?.[KEY]);
}
