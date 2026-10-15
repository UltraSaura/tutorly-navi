import { supabase } from '@/integrations/supabase/client';
import { formatGenerationError, getGenerationErrorTechnicalDetail } from '@/components/admin/learning/generationErrorMapping';
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
  return item && Number.isFinite(Number(item.x)) && Number.isFinite(Number(item.y));
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
    return axis && Number.isFinite(Number(axis.x)) && points(d.original ?? d.figure) && points(d.reflected ?? d.symmetric_figure) && grid && Number(grid.width) > 0 && Number(grid.height) > 0
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
  const canonical = validateLessonV21(lesson);
  const canonicalIssues = canonical.success ? [] : canonical.issues.map((issue: ContractIssue) => ({ path: issue.path, message: issue.message }));
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

export function buildDraftInsertPayload(topicId: string, lessonContent: unknown, userId: string) {
  return { topic_id: topicId, lesson_content: lessonContent, status: 'draft' as const, created_by: userId };
}

export async function generateStagingDraft(topicId: string, modelId?: string) {
  const { data, error, response } = await supabase.functions.invoke('generate-lesson-content', {
    body: { mode: 'staging_draft', topicId, modelId, allowPaidRepair: false },
  });
  if (error && response) {
    const payload = await response.clone().json().catch(() => null);
    const message = formatGenerationError(payload ?? error.message);
    const technicalDetail = getGenerationErrorTechnicalDetail(payload);
    throw new Error(technicalDetail ? `${message}\n${technicalDetail}` : message);
  }
  if (error) throw error;
  if (!data?.success || data?.providerCalls !== 1 || !data.lesson_content) {
    const message = formatGenerationError(data ?? { code: 'staging_generation_failed' });
    const technicalDetail = getGenerationErrorTechnicalDetail(data);
    throw new Error(technicalDetail ? `${message}\n${technicalDetail}` : message);
  }
  return data as { lesson_content: unknown; topic_id: string; providerCalls: 1; canonicalValid: true; pedagogicalValid: true };
}

export async function saveDraftVersion(topicId: string, lessonContent: unknown): Promise<LessonVersion> {
  const validation = validateLessonVersion(lessonContent);
  if (!validation.canonicalValid || !validation.pedagogicalValid) {
    throw new Error(JSON.stringify({ code: 'draft_validation_failed', validation }));
  }
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error('You must be signed in as an admin to save a lesson draft.');
  const { data, error } = await supabase.from('topic_lesson_versions').insert(buildDraftInsertPayload(topicId, lessonContent, user.id)).select('*').single();
  if (error) throw new Error(`Draft save failed: ${error.message}`);
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
