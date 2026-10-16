import { supabase } from '@/integrations/supabase/client';
import { getGenerationErrorDetails, getGenerationErrorTechnicalDetail } from '@/components/admin/learning/generationErrorMapping';
import { validateLessonV21, type ContractIssue } from '@/types/lesson-v21-contract';

export const LESSON_VERSION_STATUSES = ['draft', 'validated', 'published', 'rejected'] as const;
export type LessonVersionStatus = typeof LESSON_VERSION_STATUSES[number];

export type LessonVersion = {
  id: string;
  topic_id: string;
  lesson_content: unknown;
  status: LessonVersionStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  validated_at?: string | null;
  validated_by?: string | null;
  published_at?: string | null;
  published_by?: string | null;
};

export type ValidationIssue = { path: string; message: string };
export type LessonValidation = {
  canonicalValid: boolean;
  pedagogicalValid: boolean;
  geometryValid: boolean;
  canonicalIssues: ValidationIssue[];
  pedagogicalIssues: ValidationIssue[];
  geometryIssues: ValidationIssue[];
};

const object = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;

const point = (value: unknown) => {
  const item = object(value);
  return item && typeof item.x === 'number' && Number.isFinite(item.x) && typeof item.y === 'number' && Number.isFinite(item.y);
};

const points = (value: unknown) => Array.isArray(value) && value.length >= 2 && value.every(point);

const allVisuals = (lesson: any) => (lesson?.levels ?? []).flatMap((level: any) =>
  (level?.lesson?.sequence ?? []).flatMap((block: any, index: number) => {
    const visual = object(block?.visual);
    return visual ? [{ visual, path: `levels[${level?.level_number ?? 1}].lesson.sequence[${index}].visual` }] : [];
  }),
);

function geometryIssuesForVisual(kind: string, data: unknown, path: string): ValidationIssue[] {
  const d = object(data);
  if (!d) return [{ path: `${path}.data`, message: 'Drawable geometry data must be an object.' }];
  const issue = (suffix: string, message: string) => ({ path: `${path}.data${suffix}`, message });
  if (kind === 'rectangle' || (kind === 'polygon' && d.shape === 'rectangle')) {
    return Array.isArray(d.vertices) && d.vertices.length >= 4 && d.vertices.every(point)
      ? [] : [issue('.vertices', 'Rectangle requires at least four numeric vertices.')];
  }
  if (kind === 'triangle' || (kind === 'polygon' && d.shape === 'triangle')) {
    return Array.isArray(d.vertices) && d.vertices.length >= 3 && d.vertices.every(point)
      ? [] : [issue('.vertices', 'Triangle requires at least three numeric vertices.')];
  }
  if (kind === 'circle') {
    return point(d.center ?? d.centre) && Number.isFinite(Number(d.radius)) && Number(d.radius) > 0
      ? [] : [issue('', 'Circle requires a numeric center and a positive radius.')];
  }
  if (kind === 'angle') {
    return point(d.vertex) && Array.isArray(d.rays) && d.rays.length >= 2 && d.rays.every(point) && Number.isFinite(Number(d.degrees))
      ? [] : [issue('', 'Angle requires a numeric vertex, two numeric rays, and degrees.')];
  }
  if (kind === 'symmetry') {
    const axis = object(d.axis);
    const grid = object(d.grid);
    const axisKeys = axis ? Object.keys(axis).filter((key) => key === 'x' || key === 'y') : [];
    const axisOk = !!axis && axisKeys.length === 1 && ((axisKeys[0] === 'x' && typeof axis.x === 'number' && Number.isFinite(axis.x)) || (axisKeys[0] === 'y' && typeof axis.y === 'number' && Number.isFinite(axis.y)));
    return axisOk && points(d.original ?? d.figure) && points(d.reflected ?? d.symmetric_figure) && grid && typeof grid.width === 'number' && Number.isFinite(grid.width) && grid.width > 0 && typeof grid.height === 'number' && Number.isFinite(grid.height) && grid.height > 0
      ? [] : [issue('', 'Symmetry requires an axis, grid dimensions, and original/reflected point sets.')];
  }
  return [];
}

export function validateDrawableGeometry(lesson: unknown): ValidationIssue[] {
  const visuals = allVisuals(lesson);
  const required = [
    ['rectangle', 'rectangle'],
    ['triangle', 'triangle'],
    ['circle', 'circle'],
    ['angle', 'angle'],
    ['symmetry', 'symmetry'],
  ] as const;
  const issues: ValidationIssue[] = [];
  for (const [label, expected] of required) {
    const matches = visuals.filter(({ visual }) => visual.kind === expected || (expected === 'triangle' && visual.kind === 'polygon' && object(visual.data)?.shape === 'triangle'));
    if (matches.length === 0) {
      issues.push({ path: 'levels', message: `Missing required drawable visual: ${label}.` });
    } else {
      matches.forEach(({ visual, path }) => issues.push(...geometryIssuesForVisual(String(visual.kind), visual.data, path)));
    }
  }
  return issues;
}

export function validatePedagogicalLesson(lesson: unknown): ValidationIssue[] {
  const value = object(lesson);
  const issues: ValidationIssue[] = [];
  if (!value?.topic_goal || typeof value.topic_goal !== 'string') issues.push({ path: 'topic_goal', message: 'Topic goal is required.' });
  const levels = Array.isArray(value?.levels) ? value.levels : [];
  levels.forEach((level: any, levelIndex) => {
    const prefix = `levels[${levelIndex}].lesson`;
    if (!level?.purpose || typeof level.purpose !== 'string') issues.push({ path: `levels[${levelIndex}].purpose`, message: 'Level purpose is required.' });
    if (!level?.lesson?.lesson_goal || typeof level.lesson.lesson_goal !== 'string') issues.push({ path: `${prefix}.lesson_goal`, message: 'Lesson goal is required.' });
    if (!Array.isArray(level?.lesson?.success_criteria) || level.lesson.success_criteria.length === 0) issues.push({ path: `${prefix}.success_criteria`, message: 'At least one success criterion is required.' });
    const sequence = Array.isArray(level?.lesson?.sequence) ? level.lesson.sequence : [];
    sequence.forEach((block: any, blockIndex: number) => {
      const hasTeachingText = typeof block?.content === 'string' && block.content.trim().length > 0;
      const hasQuestion = typeof block?.question === 'string' && block.question.trim().length > 0;
      const hasContext = typeof block?.context === 'string' && block.context.trim().length > 0;
      if (!hasTeachingText && !hasQuestion && !hasContext) issues.push({ path: `${prefix}.sequence[${blockIndex}]`, message: 'Each block must contain teaching text, a question, or a context.' });
      if (typeof block?.content === 'string' && /voir la figure|figure ci-dessous/i.test(block.content)) issues.push({ path: `${prefix}.sequence[${blockIndex}].content`, message: 'Content must describe the visible figure instead of referring to an unavailable figure.' });
    });
  });
  return issues;
}

export function validateLessonVersion(lesson: unknown): LessonValidation {
  const canonical = validateLessonV21(lesson, { prerequisiteFormat: 'staging' });
  const canonicalIssues = !('issues' in canonical) ? [] : canonical.issues.map((issue: ContractIssue) => ({ path: issue.path, message: issue.message }));
  const pedagogicalIssues = validatePedagogicalLesson(lesson);
  const geometryIssues = validateDrawableGeometry(lesson);
  return {
    canonicalValid: canonical.success,
    pedagogicalValid: pedagogicalIssues.length === 0,
    geometryValid: geometryIssues.length === 0,
    canonicalIssues,
    pedagogicalIssues,
    geometryIssues,
  };
}

/** The only topic the CM2 geometry staging generation may target. */
export const CM2_GEOMETRY_TOPIC_ID = 'e5003f68-f3aa-404b-85a9-847cdb103a81';
/** Fixture/staging copies that must never be silently selected for CM2 generation. */
export const FIXTURE_TOPIC_IDS = ['185f20b5-d698-446d-80e8-c3c462819b94'] as const;

export function assertExplicitStagingTopicId(topicId: string | null | undefined): string {
  const value = (topicId ?? '').trim();
  if (!value) throw new Error('staging_topic_id_required: choose the topic explicitly before generating.');
  if ((FIXTURE_TOPIC_IDS as readonly string[]).includes(value)) throw new Error(`fixture_topic_refused: ${value} is a fixture topic and cannot be selected for staging generation.`);
  return value;
}

export function assertGenerationTopic(topicId: string | null | undefined, expected = CM2_GEOMETRY_TOPIC_ID): string {
  const value = (topicId ?? '').trim();
  if (!value) throw new Error('staging_topic_id_required: choose the topic explicitly before generating.');
  if ((FIXTURE_TOPIC_IDS as readonly string[]).includes(value)) throw new Error(`fixture_topic_refused: ${value} is a fixture topic and cannot be used for CM2 generation (expected ${expected}).`);
  if (value !== expected) throw new Error(`unexpected_topic_id: ${value} is not the intended CM2 topic ${expected}.`);
  return value;
}

export function assertReturnedTopicMatches(requestedTopicId: string, returnedTopicId: unknown): void {
  if (typeof returnedTopicId !== 'string' || returnedTopicId !== requestedTopicId) {
    throw new Error(`topic_id_mismatch: requested ${requestedTopicId}, generator returned ${String(returnedTopicId)}. Draft not saved.`);
  }
}

export function buildDraftInsertPayload(topicId: string, lessonContent: unknown, userId: string) {
  return { topic_id: topicId, lesson_content: lessonContent, status: 'draft' as const, created_by: userId };
}

export async function generateStagingDraft(topicId: string, modelId?: string, expectedTopicId: string | null = CM2_GEOMETRY_TOPIC_ID, language: 'fr' | 'en' = 'fr') {
  const requested = topicId.trim();
  if (!requested) throw new Error('staging_topic_id_required: choose the topic explicitly before generating.');
  if (expectedTopicId === null) {
    assertExplicitStagingTopicId(requested);
  } else {
    assertGenerationTopic(requested, expectedTopicId);
  }
  const { data, error, response } = await supabase.functions.invoke('generate-lesson-content', {
    body: { mode: 'staging_draft', topicId: requested, modelId, language, allowPaidRepair: false },
  });
  if (error && response) {
    const payload = await response.clone().json().catch(() => null);
    const details = getGenerationErrorDetails(payload ?? error, 'The Edge Function returned an error.');
    const requestId = details.requestId ?? response.headers?.get('x-request-id') ?? undefined;
    const errorMessage = details.technicalDetail ? `${details.message}\n${details.technicalDetail}` : details.message;
    throw Object.assign(new Error(errorMessage), {
      ...details,
      message: errorMessage,
      httpStatus: response.status,
      requestId,
      providerCalls: details.providerCalls ?? 0,
      failedLevel: details.level,
      failureStage: details.stage,
    });
  }
  if (error) {
    const details = getGenerationErrorDetails(error, 'The generation request could not start.');
    throw Object.assign(new Error(details.message), {
      ...details,
      stage: details.stage ?? 'pre_generation',
      providerCalls: details.providerCalls ?? 0,
      failedLevel: details.level,
      failureStage: details.stage ?? 'pre_generation',
    });
  }
  // Staging generation makes one provider request per level (the server
  // validates each level and the assembled lesson), so providerCalls is the
  // number of levels, not 1. Accept any positive count reported by a
  // successful response that carries lesson content.
  const providerCalls = Number(data?.providerCalls);
  if (!data?.success || !data.lesson_content || !Number.isInteger(providerCalls) || providerCalls < 1) {
    const technicalDetail = getGenerationErrorTechnicalDetail(data)
      ?? (data?.success && data?.lesson_content ? `Unexpected providerCalls value: ${String(data?.providerCalls)}` : undefined);
    const details = getGenerationErrorDetails({
      ...(data ?? {}),
      code: data?.code ?? 'malformed_response',
      message: data?.message ?? 'The generation response was malformed or incomplete.',
      technicalDetail,
      stage: data?.stage ?? 'response_parsing',
      providerCalls: Number(data?.providerCalls) || 0,
    });
    const errorMessage = technicalDetail ? `${details.message}\n${technicalDetail}` : details.message;
    throw Object.assign(new Error(errorMessage), {
      ...details,
      message: errorMessage,
      providerCalls: details.providerCalls ?? 0,
      failedLevel: details.level,
      failureStage: details.stage,
    });
  }
  assertReturnedTopicMatches(requested, data.topic_id);
  return data as { lesson_content: unknown; topic_id: string; providerCalls: number; requestId?: string; build?: string; promptVersion?: string; canonicalValid: true; pedagogicalValid: true; geometryValid: true; progress?: Array<{ level: number; status: string; providerCalls: number; tokenUsage?: unknown; build?: string; promptVersion?: string }> };
}

export async function saveDraftVersion(topicId: string, lessonContent: unknown, returnedTopicId: unknown = topicId, expectedTopicId: string | null = CM2_GEOMETRY_TOPIC_ID): Promise<LessonVersion> {
  if (expectedTopicId === null) assertExplicitStagingTopicId(topicId);
  else assertGenerationTopic(topicId, expectedTopicId);
  assertReturnedTopicMatches(topicId, returnedTopicId);
  const validation = validateLessonVersion(lessonContent);
  if (!validation.canonicalValid || !validation.pedagogicalValid || !validation.geometryValid) {
    throw Object.assign(new Error('Draft validation failed.'), { code: 'draft_validation_failed', stage: 'validation_failure', technicalDetail: JSON.stringify(validation) });
  }
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw Object.assign(new Error('You must be signed in as an admin to save a lesson draft.'), { code: 'database_save_unauthorized', stage: 'database_save' });
  const { data, error } = await supabase.from('topic_lesson_versions').insert(buildDraftInsertPayload(topicId, lessonContent, user.id) as any).select('*').single();
  if (error) throw Object.assign(new Error(`Draft save failed: ${error.message}`), { code: 'database_save_failed', stage: 'database_save', technicalDetail: error.message });
  return data as unknown as LessonVersion;
}

export async function validateSavedDraft(version: LessonVersion): Promise<LessonVersion> {
  const validation = validateLessonVersion(version.lesson_content);
  if (!validation.canonicalValid || !validation.pedagogicalValid || !validation.geometryValid) throw new Error(JSON.stringify({ code: 'draft_validation_failed', validation }));
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error('You must be signed in as an admin to validate a lesson draft.');
  const { data, error } = await supabase.from('topic_lesson_versions').update({ status: 'validated', validated_at: new Date().toISOString(), validated_by: user.id, updated_at: new Date().toISOString() }).eq('id', version.id).eq('status', 'draft').select('*').single();
  if (error) throw new Error(`Draft validation save failed: ${error.message}`);
  return data as unknown as LessonVersion;
}

export async function publishValidatedDraft(versionId: string, topicId: string, lessonContent: unknown, confirmed: boolean): Promise<LessonVersion> {
  if (!confirmed) throw new Error('Explicit admin confirmation is required before publishing.');
  const validation = validateLessonVersion(lessonContent);
  if (!validation.canonicalValid || !validation.pedagogicalValid || !validation.geometryValid) {
    throw new Error(JSON.stringify({ code: 'publish_validation_failed', validation }));
  }
  const { data, error } = await supabase.rpc('publish_topic_lesson_version', { p_version_id: versionId, p_topic_id: topicId, p_confirm: true });
  if (error) throw new Error(`Draft publish failed: ${error.message}`);
  return data as unknown as LessonVersion;
}
