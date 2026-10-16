import {
  assertExplicitStagingTopicId,
  assertReturnedTopicMatches,
  generateStagingDraft,
  saveDraftVersion,
  validateLessonVersion,
  type LessonVersion,
} from './lessonVersionWorkflow';
import { formatGenerationDiagnostic, getGenerationErrorDetails, type GenerationErrorDetails } from '@/components/admin/learning/generationErrorMapping';

export const STAGING_LEVEL_COUNT = 4;

export type BulkStagingTopic = { id?: string | null; name: string };
export type BulkStagingStatus = 'idle' | 'generating' | 'validating' | 'saved' | 'failed';

export type BulkStagingProgress = {
  topicIndex: number;
  totalTopics: number;
  topicId: string;
  topicTitle: string;
  level: number;
  totalLevels: number;
  providerCalls: number;
  status: BulkStagingStatus;
};

export type BulkStagingFailure = {
  topicId: string;
  topicTitle: string;
  failedLevel?: number;
  failureStage: string;
  technicalDiagnostic: string;
  providerCalls: number;
  httpStatus?: number;
  code?: string;
  message?: string;
  technicalDetail?: string;
  requestId?: string;
  build?: string;
  promptVersion?: string;
  level?: number;
  stage?: string;
};

export type BulkStagingResult = {
  topicId: string;
  topicTitle: string;
  status: 'saved' | 'failed';
  version?: LessonVersion;
  requestId?: string;
  build?: string;
  promptVersion?: string;
  providerCalls?: number;
  validation?: ReturnType<typeof validateLessonVersion>;
  failure?: BulkStagingFailure;
};

export type StagingGeneration = Awaited<ReturnType<typeof generateStagingDraft>>;

export type BulkStagingDependencies = {
  generate?: (topicId: string) => Promise<StagingGeneration>;
  save?: (topicId: string, content: unknown, returnedTopicId?: unknown) => Promise<LessonVersion>;
  validate?: (content: unknown) => ReturnType<typeof validateLessonVersion>;
  dryRun?: boolean;
  dryRunContent?: unknown;
  language?: 'fr' | 'en';
};

export function validateBulkTopicIds(topics: BulkStagingTopic[]): void {
  const ids = topics.map((topic) => (topic.id ?? '').trim());
  if (ids.some((id) => !id)) throw new Error('staging_topic_id_required: every selected topic must have an explicit ID.');
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicates.length) throw new Error(`duplicate_topic_id: ${[...new Set(duplicates)].join(', ')}`);
}

function diagnostic(error: unknown): string { return formatGenerationDiagnostic(error, 'Unknown staging workflow error.'); }

function isLegacyPrerequisiteDiagnostic(value: string): boolean {
  return /legacy prerequisite|prerequisites?\[\d+\].*(check_question|answer_type)|check_question.*(missing|required)|answer_type.*(missing|unsupported)/i.test(value);
}

function failureStage(details: GenerationErrorDetails): string {
  if (details.stage) return details.stage;
  const code = details.code ?? '';
  if (/save|draft|database/i.test(code)) return 'database_save';
  if (/provider|upstream|timeout/i.test(code)) return 'provider_failure';
  if (/validat|canonical|pedagogical|geometry/i.test(code)) return 'validation_failure';
  if ((details.providerCalls ?? 0) === 0) return 'pre_generation';
  return 'generation_or_save';
}

function failedLevel(error: unknown): number | undefined {
  const text = diagnostic(error);
  const match = text.match(/levels?\[(\d+)\]|level[ _-]?(\d+)/i);
  if (!match) return undefined;
  return Number(match[1] ?? match[2]) + (match[1] ? 1 : 0);
}

function dryRunGeneration(topicId: string, content: unknown): StagingGeneration {
  return { success: true, lesson_content: content, topic_id: topicId, providerCalls: 0, canonicalValid: true, pedagogicalValid: true, geometryValid: true, progress: [] } as StagingGeneration;
}

export async function runBulkStagingGeneration(
  topics: BulkStagingTopic[],
  onProgress?: (progress: BulkStagingProgress) => void,
  dependencies: BulkStagingDependencies = {},
): Promise<BulkStagingResult[]> {
  validateBulkTopicIds(topics);
  const generate = dependencies.dryRun
    ? async (topicId: string) => dryRunGeneration(topicId, dependencies.dryRunContent)
    : (dependencies.generate ?? ((topicId) => generateStagingDraft(topicId, undefined, null, dependencies.language ?? 'fr')));
  const save = dependencies.dryRun ? async () => ({ id: `dry-run-${Date.now()}` } as LessonVersion) : (dependencies.save ?? ((topicId, content, returnedTopicId) => saveDraftVersion(topicId, content, returnedTopicId, null)));
  const validate = dependencies.validate ?? validateLessonVersion;
  const results: BulkStagingResult[] = [];

  for (const [index, topic] of topics.entries()) {
    const topicId = topic.id!.trim();
    const base = { topicIndex: index + 1, totalTopics: topics.length, topicId, topicTitle: topic.name, totalLevels: STAGING_LEVEL_COUNT };
    let providerCalls = 0;
    try {
      assertExplicitStagingTopicId(topicId);
      onProgress?.({ ...base, level: 1, providerCalls, status: 'generating' });
      for (let level = 2; level <= STAGING_LEVEL_COUNT; level += 1) {
        onProgress?.({ ...base, level, providerCalls: level - 1, status: 'generating' });
      }
      const generated = await generate(topicId);
      providerCalls = Number(generated.providerCalls) || 0;
      if (!dependencies.dryRun && providerCalls !== STAGING_LEVEL_COUNT) throw new Error(`staging_provider_call_count_invalid: expected ${STAGING_LEVEL_COUNT}, received ${providerCalls}`);
      assertReturnedTopicMatches(topicId, generated.topic_id);
      for (let level = 1; level <= STAGING_LEVEL_COUNT; level += 1) {
        onProgress?.({ ...base, level, providerCalls, status: 'validating' });
      }
      const validation = validate(generated.lesson_content);
      if (!validation.canonicalValid || !validation.pedagogicalValid || !validation.geometryValid) {
        throw new Error(JSON.stringify({ code: 'staging_validation_failed', validation }));
      }
      const version = await save(topicId, generated.lesson_content, generated.topic_id);
      onProgress?.({ ...base, level: STAGING_LEVEL_COUNT, providerCalls, status: 'saved' });
      results.push({ topicId, topicTitle: topic.name, status: 'saved', version, requestId: generated.requestId, providerCalls, validation, build: generated.build, promptVersion: generated.promptVersion });
    } catch (error) {
      const details = getGenerationErrorDetails(error);
      providerCalls = Number(details.providerCalls ?? providerCalls) || providerCalls;
      const rawDiagnostic = diagnostic(error);
      const legacyPrerequisite = isLegacyPrerequisiteDiagnostic(rawDiagnostic);
      const stage = legacyPrerequisite ? 'validation_failure' : failureStage({ ...details, providerCalls });
      const failure = {
        topicId,
        topicTitle: topic.name,
        failedLevel: details.level ?? failedLevel(error),
        failureStage: stage,
        technicalDiagnostic: legacyPrerequisite
          ? `Validation failed: prerequisites have the legacy format · ${rawDiagnostic}`
          : rawDiagnostic,
        providerCalls,
        httpStatus: details.httpStatus,
        code: details.code,
        message: details.message,
        technicalDetail: details.technicalDetail,
        requestId: details.requestId,
        level: details.level,
        stage,
        build: details.build,
        promptVersion: details.promptVersion,
      };
      onProgress?.({ ...base, level: failure.failedLevel ?? 1, providerCalls, status: 'failed' });
      results.push({ topicId, topicTitle: topic.name, status: 'failed', failure });
    }
  }
  return results;
}
