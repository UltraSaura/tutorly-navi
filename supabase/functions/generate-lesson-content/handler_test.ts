// Handler-level staging tests. Every provider and database call is faked;
// no real network request is ever made (providerCalls counts fake calls only).
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { stagingFullLevelExample, stagingLevelMetadata, STAGING_VISUAL_EXAMPLES } from './staging-level-workflow.ts';

const SB = 'https://fake-staging.supabase.test';
Deno.env.set('SUPABASE_URL', SB);
Deno.env.set('SUPABASE_ANON_KEY', 'fake-anon');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'fake-service');
Deno.env.set('ALLOWED_ORIGINS', 'http://localhost:8080');

const { handleRequest } = await import('./handler.ts');

const TOPIC = { id: 'topic-1', name: 'La géométrie plane', slug: 'geo', description: '', curriculum_level_code: 'cm2', curriculum_country_code: 'fr', curriculum_subject_id: null, lesson_content: null, learning_category_id: null, learning_categories: null };
const levels = stagingLevelMetadata(TOPIC.id, TOPIC.name, []);
const TIME_TOPIC = { id: 'time-topic-1', name: 'Le repérage dans le temps et les durées', slug: 'time', description: '', curriculum_level_code: 'cm2', curriculum_country_code: 'fr', curriculum_subject_id: null, lesson_content: null, learning_category_id: null, learning_categories: null };
const timeLevels = stagingLevelMetadata(TIME_TOPIC.id, TIME_TOPIC.name, []);

type ProviderReply = (level: number) => { content: unknown; finishReason?: string } | Response;
type Calls = { provider: number; dbWrites: string[] };

function installFakes(reply: ProviderReply, topic = TOPIC): Calls {
  const calls: Calls = { provider: 0, dbWrites: [] };
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  globalThis.fetch = async (input: Request | URL | string, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
    if (url.origin !== SB) throw new Error('unexpected external request: ' + url.href);
    const p = url.pathname;
    if (p === '/functions/v1/ai-chat') {
      calls.provider += 1;
      const r = reply(calls.provider);
      if (r instanceof Response) return r;
      return json({ content: typeof r.content === 'string' ? r.content : JSON.stringify(r.content), providerMetadata: { finishReason: r.finishReason ?? 'stop', promptTokens: 10, completionTokens: 20, totalTokens: 30 } });
    }
    if (p.startsWith('/rest/v1/') && !p.startsWith('/rest/v1/rpc/') && method !== 'GET' && method !== 'HEAD') calls.dbWrites.push(method + ' ' + p);
    if (p === '/auth/v1/user') return json({ id: 'admin-1', aud: 'authenticated', role: 'authenticated', email: 'admin@test' });
    if (p.endsWith('/rpc/family_bootstrap')) return json({ approvalStatus: 'approved', isFamily: false, isGuardian: false });
    if (p.endsWith('/rpc/get_model_with_fallback')) return json([{ default_model_id: 'deepseek-chat' }]);
    if (p.endsWith('/rpc/resolve_edition')) return json(null);
    if (p.endsWith('/user_roles')) return json([{ role: 'admin' }]);
    if (p.endsWith('/topics')) return json(topic);
    if (p.startsWith('/rest/v1/')) return json([]);
    return json({}, 404);
  };
  return calls;
}

async function run(reply: ProviderReply, requestId: string | undefined = 'req-1', topic = TOPIC) {
  const calls = installFakes(reply, topic);
  const headers = { Authorization: 'Bearer fake-user-jwt', 'Content-Type': 'application/json', Origin: 'http://localhost:8080' } as Record<string, string>;
  if (requestId) headers['x-request-id'] = requestId;
  const res = await handleRequest(new Request('http://localhost/generate-lesson-content', {
    method: 'POST',
    headers,
    body: JSON.stringify({ topicId: topic.id, mode: 'staging_draft', language: 'fr' }),
  }));
  const body = await res.json();
  return { status: res.status, body, calls };
}

// Supabase clients start auth-refresh timers the handler does not own.
const test = (name: string, fn: () => Promise<void>) => Deno.test({ name, fn, sanitizeOps: false, sanitizeResources: false });

const valid = (level: number) => ({ content: stagingFullLevelExample(levels[level - 1]) });
const withLevel = (target: number, mutate: (lesson: any) => void): ProviderReply => (level) => {
  const lesson = structuredClone(stagingFullLevelExample(levels[level - 1])) as any;
  if (level === target) mutate(lesson);
  return { content: lesson };
};

test('four valid levels return 200 with providerCalls=4 and no database write', async () => {
  const { status, body, calls } = await run(valid);
  assertEquals(status, 200);
  assertEquals(body.requestId, 'req-1');
  assertEquals(body.providerCalls, 4);
  assertEquals(calls.provider, 4);
  assertEquals(body.progress.length, 4);
  assertEquals(body.validation.prerequisiteValid, true);
  assertEquals(body.validation.interactionValid, true);
  assertEquals(body.progress[0].validation.prerequisiteValid, true);
  assertEquals(body.progress[0].validation.interactionValid, true);
  assertEquals(body.progress[0].requestId, 'req-1');
  assertEquals(body.progress[0].promptVersion, 'staging-v21-prerequisite-contract-v2');
  assert(typeof body.progress[0].build === 'string');
  assertEquals(body.lesson_content.levels.length, 4);
  assertEquals(calls.dbWrites, []);
});

test('successful response exposes the same request ID in JSON and headers', async () => {
  const calls = installFakes(valid);
  const res = await handleRequest(new Request('http://localhost/generate-lesson-content', {
    method: 'POST',
    headers: { Authorization: 'Bearer fake-user-jwt', 'Content-Type': 'application/json', Origin: 'http://localhost:8080', 'x-request-id': 'success-request' },
    body: JSON.stringify({ topicId: TOPIC.id, mode: 'staging_draft', language: 'fr' }),
  }));
  const body = await res.json();
  assertEquals(body.requestId, 'success-request');
  assertEquals(res.headers.get('x-request-id'), 'success-request');
  assertEquals(res.headers.get('Access-Control-Expose-Headers'), 'x-request-id');
  assertEquals(calls.provider, 4);
});

test('one generated request ID is reused across all four level calls', async () => {
  const { status, body, calls } = await run(valid, undefined);
  assertEquals(status, 200);
  assert(typeof body.requestId === 'string' && body.requestId.length > 0);
  assertEquals(calls.provider, 4);
});

test('invalid angle geometry (ray1/ray2) returns 422 at level 2 without retry', async () => {
  const { status, body, calls } = await run(withLevel(2, (lesson) => {
    const angle = lesson.sequence.find((b: any) => b.visual?.kind === 'angle');
    angle.visual.data = { vertex: angle.visual.data.vertex, ray1: { x: 1, y: 1 }, ray2: { x: 2, y: 2 }, degrees: 45 };
  }));
  assertEquals(status, 422);
  assertEquals(body.error.code, 'staging_level_validation_failed');
  assertEquals(body.error.level, 2);
  assertEquals(body.error.stage, 'level_validation');
  assertEquals(body.error.requestId, 'req-1');
  assertEquals(body.requestId, 'req-1');
  assert(String(body.error.technicalDetail).includes('rays'));
  assertEquals(calls.provider, 2);
  assertEquals(body.error.providerCalls, 2);
  assertEquals(calls.dbWrites, []);
});

test('validation error exposes the same request ID in JSON and headers', async () => {
  const calls = installFakes(withLevel(2, (lesson) => {
    const angle = lesson.sequence.find((b: any) => b.visual?.kind === 'angle');
    angle.visual.data = { vertex: angle.visual.data.vertex, ray1: { x: 1, y: 1 }, ray2: { x: 2, y: 2 }, degrees: 45 };
  }));
  const res = await handleRequest(new Request('http://localhost/generate-lesson-content', {
    method: 'POST',
    headers: { Authorization: 'Bearer fake-user-jwt', 'Content-Type': 'application/json', Origin: 'http://localhost:8080', 'x-request-id': 'validation-request' },
    body: JSON.stringify({ topicId: TOPIC.id, mode: 'staging_draft', language: 'fr' }),
  }));
  const body = await res.json();
  assertEquals(res.status, 422);
  assertEquals(body.requestId, 'validation-request');
  assertEquals(body.error.requestId, 'validation-request');
  assertEquals(res.headers.get('x-request-id'), 'validation-request');
  assertEquals(calls.provider, 2);
  assertEquals(calls.dbWrites, []);
});

test('invalid symmetry geometry (line axis) returns 422 at level 3', async () => {
  const { status, body, calls } = await run(withLevel(3, (lesson) => {
    for (const block of lesson.sequence) if (block.visual?.kind === 'symmetry') block.visual.data.axis = { x1: 5, y1: 0, x2: 5, y2: 8 };
  }));
  assertEquals(status, 422);
  assertEquals(body.error.level, 3);
  assertEquals(body.error.stage, 'level_validation');
  assert(String(body.error.technicalDetail).includes('axis'));
  assertEquals(calls.provider, 3);
  assertEquals(calls.dbWrites, []);
});

test('missing required level-4 visual returns 422', async () => {
  const { status, body, calls } = await run(withLevel(4, (lesson) => {
    for (const block of lesson.sequence) delete block.visual;
  }));
  assertEquals(status, 422);
  assertEquals(body.error.code, 'staging_level_validation_failed');
  assertEquals(body.error.level, 4);
  assertEquals(calls.provider, 4);
  assertEquals(calls.dbWrites, []);
});

test('truncated provider output returns 502 provider_output_truncated', async () => {
  const { status, body, calls } = await run(() => ({ content: stagingFullLevelExample(levels[0]), finishReason: 'length' }));
  assertEquals(status, 502);
  assertEquals(body.error.code, 'provider_output_truncated');
  assertEquals(body.error.level, 1);
  assertEquals(calls.provider, 1);
  assertEquals(calls.dbWrites, []);
});

test('malformed provider JSON returns 502 provider_malformed_json without repair', async () => {
  const { status, body, calls } = await run(() => ({ content: '{"lesson_goal":"x","sequence":[' }));
  assertEquals(status, 502);
  assertEquals(body.error.code, 'provider_malformed_json');
  assertEquals(body.error.level, 1);
  assertEquals(calls.provider, 1);
  assertEquals(calls.dbWrites, []);
});

test('provider HTTP failure returns 502 provider_error', async () => {
  const { status, body, calls } = await run(() => new Response('upstream down', { status: 503 }));
  assertEquals(status, 502);
  assertEquals(body.error.code, 'provider_error');
  assertEquals(calls.provider, 1);
});

test('time-topic rectangle/polygon output is rejected before any partial draft write', async () => {
  const { status, body, calls } = await run((level) => {
    const lesson = structuredClone(stagingFullLevelExample(timeLevels[level - 1])) as any;
    if (level === 1) {
      lesson.sequence[0].visual = structuredClone(STAGING_VISUAL_EXAMPLES.rectangle.visual);
      lesson.sequence[1].visual = structuredClone(STAGING_VISUAL_EXAMPLES.triangle.visual);
    }
    return { content: lesson };
  }, 'time-validation', TIME_TOPIC);
  assertEquals(status, 422);
  assertEquals(body.error.code, 'staging_level_validation_failed');
  assertEquals(body.error.level, 1);
  assert(String(body.error.technicalDetail).includes('unit_conversion'));
  assert(String(body.error.technicalDetail).includes('timeline'));
  assertEquals(calls.provider, 1);
  assertEquals(calls.dbWrites, []);
});
