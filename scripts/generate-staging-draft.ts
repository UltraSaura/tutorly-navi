import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const STAGING_PROJECT_REF = 'sibprjxhbxahouejygeu';
export const PRODUCTION_PROJECT_REF = 'urskkwizwutodikgznas';
export const STAGING_URL = `https://${STAGING_PROJECT_REF}.supabase.co`;
export const FUNCTION_NAME = 'generate-lesson-content';
export const TOPIC_NAME = 'La géométrie plane';
export const CURRICULUM = 'CM2';
export const SEARCH_TERMS = ['géométrie', 'geometrie', 'géométrie plane', 'geometry'];
export const LEVEL_COUNT = 4;
export const MAX_TOKENS_PER_LEVEL = 3600;

type SafeResponse = {
  ok: boolean;
  status: number;
  headers?: Headers;
  body: unknown;
};

export type RunnerDependencies = {
  authenticate: () => Promise<{ userId: string; accessToken: string; isAdmin: boolean }>;
  findTopic: (topicId: string) => Promise<{ id: string; name?: string; lessonContent: unknown }>;
  /** Topic the run must target; defaults to the CM2 geometry topic, null disables the guard (tests only). */
  expectedTopicId?: string | null;
  countExistingDrafts: (topicId: string) => Promise<number>;
  invoke: (accessToken: string, topicId: string) => Promise<SafeResponse>;
  insertDraft: (input: { topicId: string; lessonContent: Record<string, unknown>; createdBy: string }) => Promise<string>;
  readTopicLessonContent: (topicId: string) => Promise<unknown>;
};

export type RunnerResult = Record<string, unknown>;

export type TopicSummary = {
  id: string;
  name: string;
  curriculumLevel: string | null;
  subject: string | null;
  country: string | null;
  language: string | null;
  hasLessonContent: boolean;
  searchableText?: string;
};

const normalizeUrl = (value: string) => value.trim().replace(/\/$/, '');

export function assertSafeProjectUrl(value: string): string {
  const url = normalizeUrl(value);
  if (url.includes(PRODUCTION_PROJECT_REF)) throw new Error('production_project_refused');
  if (url !== STAGING_URL) throw new Error('staging_project_required');
  return url;
}

export function safeErrorCode(error: unknown): string {
  if (error instanceof Error && /^[a-z0-9_]+$/.test(error.message)) return error.message;
  return 'staging_runner_failed';
}

export function safeDiagnostics(value: RunnerResult): string {
  return JSON.stringify(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizedSearchValue(value: unknown): string {
  return typeof value === 'string' ? value.toLocaleLowerCase('fr-FR') : '';
}

export function topicMatchesSearch(topic: TopicSummary): boolean {
  const searchable = [topic.name, topic.searchableText].map(normalizedSearchValue).join(' ');
  return SEARCH_TERMS.some((term) => searchable.includes(term));
}

export function filterMatchingTopics(topics: TopicSummary[]): TopicSummary[] {
  return topics.filter(topicMatchesSearch);
}

export function formatTopicListResult(matches: TopicSummary[]): RunnerResult {
  if (matches.length === 0) return { ok: false, code: 'topic_not_found', matches: [], databaseWrite: false, providerCalls: 0 };
  if (matches.length > 1) return { ok: false, code: 'topic_not_unique', matches, databaseWrite: false, providerCalls: 0 };
  return { ok: true, code: 'topic_unique', matches, databaseWrite: false, providerCalls: 0 };
}

export const CM2_GEOMETRY_TOPIC_ID = 'e5003f68-f3aa-404b-85a9-847cdb103a81';
export const FIXTURE_TOPIC_IDS = ['185f20b5-d698-446d-80e8-c3c462819b94'];

export function requireExplicitTopicId(topicId: string | undefined, expected: string | null = null): string {
  const value = topicId?.trim();
  if (!value) throw new Error('staging_topic_id_required');
  if (expected && FIXTURE_TOPIC_IDS.includes(value) && value !== expected) throw new Error('fixture_topic_refused');
  if (expected && value !== expected) throw new Error('unexpected_topic_id');
  return value;
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
  if (!isRecord(value)) return JSON.stringify(value);
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`).join(',')}}`;
}

export function extractVisualKinds(lessonContent: unknown): string[] {
  const kinds = new Set<string>();
  const levels = isRecord(lessonContent) && Array.isArray(lessonContent.levels) ? lessonContent.levels : [];
  for (const level of levels) {
    const lesson = isRecord(level) && isRecord(level.lesson) ? level.lesson : null;
    const sequence = lesson && Array.isArray(lesson.sequence) ? lesson.sequence : [];
    for (const block of sequence) {
      const visual = isRecord(block) && isRecord(block.visual) ? block.visual : null;
      if (!visual || typeof visual.kind !== 'string') continue;
      kinds.add(visual.kind === 'polygon' && isRecord(visual.data) && visual.data.shape === 'triangle' ? 'triangle' : visual.kind);
    }
  }
  return [...kinds].sort();
}

export function validateGenerationResponse(body: unknown): {
  lessonContent: Record<string, unknown>;
  providerCalls: number;
  progress: Array<Record<string, unknown>>;
  validation: { canonical: boolean; pedagogical: boolean; geometry: boolean };
} {
  if (!isRecord(body) || body.success !== true) throw new Error('generation_response_unsuccessful');
  if (body.providerCalls !== LEVEL_COUNT) throw new Error('provider_call_count_mismatch');
  if (!Array.isArray(body.progress) || body.progress.length !== LEVEL_COUNT) throw new Error('level_progress_incomplete');
  const progress = body.progress as Array<Record<string, unknown>>;
  for (let index = 0; index < LEVEL_COUNT; index += 1) {
    const entry = progress[index];
    if (entry.level !== index + 1 || entry.status !== 'complete' || entry.providerCalls !== 1) {
      throw new Error(`level_${index + 1}_progress_invalid`);
    }
    const usage = isRecord(entry.tokenUsage) ? entry.tokenUsage : null;
    if (!usage || Number(usage.completionTokens) > MAX_TOKENS_PER_LEVEL) throw new Error(`level_${index + 1}_token_limit_exceeded`);
  }
  const validation = {
    canonical: body.canonicalValid === true,
    pedagogical: body.pedagogicalValid === true,
    geometry: body.geometryValid === true,
  };
  if (!validation.canonical || !validation.pedagogical || !validation.geometry) throw new Error('generation_validation_failed');
  if (!isRecord(body.lesson_content)) throw new Error('generation_lesson_content_missing');
  return { lessonContent: body.lesson_content, providerCalls: body.providerCalls, progress, validation };
}

function responseRequestId(response: SafeResponse): string {
  return response.headers?.get('x-request-id') || response.headers?.get('x-supabase-request-id') || 'not-provided';
}

function responseErrorFields(body: unknown): Record<string, unknown> {
  if (!isRecord(body) || !isRecord(body.error)) return {};
  const error = body.error;
  const result: Record<string, unknown> = {};
  for (const key of ['code', 'level', 'stage', 'providerCalls']) {
    if (typeof error[key] === 'string' || typeof error[key] === 'number') result[key] = error[key];
  }
  return result;
}

export async function executeStagingDraft(deps: RunnerDependencies, explicitTopicId = process.env.STAGING_TOPIC_ID): Promise<RunnerResult> {
  const topicId = requireExplicitTopicId(explicitTopicId, deps.expectedTopicId === undefined ? CM2_GEOMETRY_TOPIC_ID : deps.expectedTopicId);
  const auth = await deps.authenticate();
  if (!auth.userId || !auth.accessToken) throw new Error('authenticated_session_required');
  if (!auth.isAdmin) throw new Error('admin_access_required');

  const topic = await deps.findTopic(topicId);
  if (topic.id !== topicId) throw new Error('topic_lookup_mismatch');
  console.error(`[staging] target topic: ${topic.name ?? '(untitled)'} · ${topic.id}`);
  const initialTopicLessonContent = topic.lessonContent;
  if (await deps.countExistingDrafts(topic.id) > 0) throw new Error('duplicate_staging_version_refused');

  const response = await deps.invoke(auth.accessToken, topic.id);
  if (!response.ok) {
    const fields = responseErrorFields(response.body);
    const failure = { ok: false, requestId: responseRequestId(response), httpStatus: response.status, providerCalls: Number(fields.providerCalls ?? 0), databaseWrite: false, ...fields };
    throw Object.assign(new Error('edge_function_failed'), { safeResult: failure });
  }

  let generated: ReturnType<typeof validateGenerationResponse>;
  try {
    generated = validateGenerationResponse(response.body);
  } catch (error) {
    const failure = { ok: false, requestId: responseRequestId(response), providerCalls: isRecord(response.body) && typeof response.body.providerCalls === 'number' ? response.body.providerCalls : 0, databaseWrite: false, validation: safeErrorCode(error) };
    throw Object.assign(new Error('generation_validation_failed'), { safeResult: failure });
  }

  const returnedTopicId = isRecord(response.body) ? response.body.topic_id : undefined;
  if (returnedTopicId !== undefined && returnedTopicId !== topic.id) {
    throw Object.assign(new Error('topic_id_mismatch'), { safeResult: { ok: false, requestedTopicId: topic.id, returnedTopicId: String(returnedTopicId), providerCalls: generated.providerCalls, databaseWrite: false } });
  }
  if (await deps.countExistingDrafts(topic.id) > 0) throw new Error('duplicate_staging_version_refused');
  const draftVersionId = await deps.insertDraft({ topicId: topic.id, lessonContent: generated.lessonContent, createdBy: auth.userId });
  const finalTopicLessonContent = await deps.readTopicLessonContent(topic.id);
  const unchanged = stableSerialize(initialTopicLessonContent) === stableSerialize(finalTopicLessonContent);
  if (!unchanged) throw new Error('topic_lesson_content_changed');

  return {
    ok: true,
    requestId: responseRequestId(response),
    providerCalls: generated.providerCalls,
    progress: generated.progress.map((entry) => ({ level: entry.level, status: entry.status, tokenUsage: entry.tokenUsage })),
    validation: generated.validation,
    draftVersionId,
    visualKinds: extractVisualKinds(generated.lessonContent),
    topicLessonContentUnchanged: true,
    databaseWrite: true,
  };
}

function toTopicSummary(row: Record<string, unknown>, subjectsById: Map<string, Record<string, unknown>>): TopicSummary {
  const subjectId = typeof row.curriculum_subject_id_uuid === 'string' ? row.curriculum_subject_id_uuid : null;
  const subject = subjectId ? subjectsById.get(subjectId) : undefined;
  return {
    id: String(row.id),
    name: String(row.name ?? ''),
    curriculumLevel: typeof row.curriculum_level_code === 'string' ? row.curriculum_level_code : null,
    subject: typeof subject?.name === 'string' ? subject.name : typeof row.curriculum_subject_id === 'string' ? row.curriculum_subject_id : null,
    country: typeof subject?.country_code === 'string' ? subject.country_code : typeof row.curriculum_country_code === 'string' ? row.curriculum_country_code : null,
    language: typeof subject?.language === 'string' ? subject.language : null,
    hasLessonContent: row.lesson_content !== null && row.lesson_content !== undefined,
    searchableText: [row.slug, row.description, Array.isArray(row.keywords) ? row.keywords.join(' ') : ''].filter(Boolean).join(' '),
  };
}

export async function listStagingTopics(url: string, anonKey: string, email: string, password: string): Promise<RunnerResult> {
  const authClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const signedIn = await authClient.auth.signInWithPassword({ email, password });
  if (signedIn.error || !signedIn.data.user || !signedIn.data.session?.access_token) throw new Error('authentication_failed');
  const userId = signedIn.data.user.id;
  const accessToken = signedIn.data.session.access_token;
  const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: `Bearer ${accessToken}` } } });
  const topics = await client.from('topics').select('id,name,slug,description,keywords,curriculum_level_code,curriculum_country_code,curriculum_subject_id,curriculum_subject_id_uuid,lesson_content').limit(1000);
  if (topics.error) throw new Error('topic_lookup_failed');
  const subjectIds = [...new Set((topics.data ?? []).map((row: Record<string, unknown>) => row.curriculum_subject_id_uuid).filter((id): id is string => typeof id === 'string'))];
  const subjects = subjectIds.length ? await client.from('subjects').select('id,name,country_code,language').in('id', subjectIds) : { data: [], error: null };
  if (subjects.error) throw new Error('subject_lookup_failed');
  const subjectsById = new Map((subjects.data ?? []).map((row: Record<string, unknown>) => [String(row.id), row]));
  const matches = filterMatchingTopics((topics.data ?? []).map((row: Record<string, unknown>) => toTopicSummary(row, subjectsById)));
  return formatTopicListResult(matches);
}

async function createDependencies(url: string, anonKey: string, email: string, password: string): Promise<RunnerDependencies> {
  const authClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const signedIn = await authClient.auth.signInWithPassword({ email, password });
  if (signedIn.error || !signedIn.data.user || !signedIn.data.session?.access_token) throw new Error('authentication_failed');
  const userId = signedIn.data.user.id;
  const accessToken = signedIn.data.session.access_token;
  const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: `Bearer ${accessToken}` } } });
  const roles = await client.from('user_roles').select('role').eq('user_id', userId).eq('role', 'admin').limit(1);
  if (roles.error) throw new Error('admin_access_check_failed');
  const isAdmin = Array.isArray(roles.data) && roles.data.some((row: { role?: string }) => row.role === 'admin');
  return {
    authenticate: async () => ({ userId, accessToken, isAdmin }),
    findTopic: async (topicId) => {
      const result = await client.from('topics').select('id,name,lesson_content').eq('id', topicId).limit(2);
      if (result.error) throw new Error('topic_lookup_failed');
      if (!result.data || result.data.length !== 1) throw new Error('staging_topic_not_found');
      return { id: result.data[0].id as string, name: result.data[0].name as string, lessonContent: result.data[0].lesson_content };
    },
    countExistingDrafts: async (topicId) => {
      const result = await client.from('topic_lesson_versions').select('id').eq('topic_id', topicId).in('status', ['draft', 'validated', 'published']).limit(1);
      if (result.error) throw new Error('duplicate_check_failed');
      return result.data?.length ?? 0;
    },
    invoke: async (token, topicId) => {
      const result = await client.functions.invoke(FUNCTION_NAME, { body: { mode: 'staging_draft', topicId, allowPaidRepair: false }, headers: { Authorization: `Bearer ${token}` } });
      // On non-2xx responses supabase-js leaves data null; read the structured
      // error body so code/level/stage/technicalDetail survive to the report.
      let body: unknown = result.data;
      if (result.error && result.response) {
        try { body = await result.response.clone().json(); } catch { body = null; }
      }
      return { ok: !result.error, status: result.response?.status ?? (result.error ? 500 : 200), headers: result.response?.headers, body };
    },
    insertDraft: async ({ topicId, lessonContent, createdBy }) => {
      const result = await client.from('topic_lesson_versions').insert({ topic_id: topicId, lesson_content: lessonContent, status: 'draft', created_by: createdBy }).select('id').single();
      if (result.error || !result.data?.id) throw new Error('draft_insert_failed');
      return result.data.id as string;
    },
    readTopicLessonContent: async (topicId) => {
      const result = await client.from('topics').select('lesson_content').eq('id', topicId).single();
      if (result.error) throw new Error('topic_recheck_failed');
      return result.data?.lesson_content;
    },
  };
}

export async function main(argv = process.argv.slice(2), env = process.env): Promise<void> {
  try {
    const dryRun = argv.includes('--dry-run');
    const configuredUrl = env.STAGING_SUPABASE_URL || STAGING_URL;
    assertSafeProjectUrl(configuredUrl);
    if (dryRun) {
      console.log(safeDiagnostics({ ok: true, dryRun: true, project: STAGING_PROJECT_REF, function: FUNCTION_NAME, topicId: env.STAGING_TOPIC_ID ?? null, plannedProviderCalls: LEVEL_COUNT, maxTokensPerCall: MAX_TOKENS_PER_LEVEL, databaseWrite: false }));
      return;
    }
    if (!env.STAGING_SUPABASE_URL || !env.STAGING_SUPABASE_ANON_KEY || !env.STAGING_ADMIN_EMAIL || !env.STAGING_ADMIN_PASSWORD) throw new Error('staging_credentials_required');
    requireExplicitTopicId(env.STAGING_TOPIC_ID);
    const deps = await createDependencies(configuredUrl, env.STAGING_SUPABASE_ANON_KEY, env.STAGING_ADMIN_EMAIL, env.STAGING_ADMIN_PASSWORD);
    console.log(safeDiagnostics(await executeStagingDraft(deps, env.STAGING_TOPIC_ID)));
  } catch (error) {
    const safeResult = isRecord(error) && isRecord(error.safeResult) ? error.safeResult : { ok: false, code: safeErrorCode(error), providerCalls: 0, databaseWrite: false };
    console.error(safeDiagnostics(safeResult));
    process.exitCode = 1;
  }
}

const invokedPath = process.argv[1] || '';
if (invokedPath.endsWith('/generate-staging-draft.ts')) void main();
