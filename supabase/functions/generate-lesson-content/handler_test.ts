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
  assertEquals(body.topicKind, 'geometry');
  assertEquals(calls.provider, 4);
  assertEquals(body.progress.length, 4);
  assertEquals(body.validation.prerequisiteValid, true);
  assertEquals(body.validation.interactionValid, true);
  assertEquals(body.progress[0].validation.prerequisiteValid, true);
  assertEquals(body.progress[0].validation.interactionValid, true);
  assertEquals(body.progress[0].requestId, 'req-1');
  assertEquals(body.progress[0].promptVersion, 'staging-v21-prerequisite-contract-v4-visual-first');
  assert(typeof body.progress[0].build === 'string');
  assertEquals(body.lesson_content.levels.length, 4);
  assertEquals(calls.dbWrites, []);
});

test('geometry vocabulary summaries pass all four fake calls without writes', async () => {
  const { status, body, calls } = await run(withLevel(1, (lesson) => {
    lesson.sequence[0].content = 'Le rectangle est une figure plane à quatre côtés opposés égaux et à quatre angles droits.';
    lesson.sequence[0].key_points = [{ label: 'Angles', text: 'Quatre angles droits.' }, { label: 'Sommets', text: 'Les coins se nomment A, B, C et D.' }];
    lesson.sequence[1].content = 'Un triangle possède trois sommets et trois côtés. Un côté relie deux sommets.';
    lesson.sequence[1].key_points = [{ label: 'Lien', text: 'Côté : relie deux sommets.' }, { label: 'Repérage', text: 'Les lettres A, B et C nomment les coins.' }];
  }), 'geometry-vocabulary');
  assertEquals(status, 200);
  assertEquals(body.providerCalls, 4);
  assertEquals(calls.provider, 4);
  assertEquals(calls.dbWrites, []);
});

test('real duplicate points stop at level one with strict 422 and no write or retry', async () => {
  const { status, body, calls } = await run(withLevel(1, (lesson) => {
    lesson.sequence[0].key_points = [
      { label: 'A', text: 'Le rectangle possède quatre sommets.' },
      { label: 'B', text: 'LE RECTANGLE possède quatre sommets !' },
    ];
  }), 'duplicate-points');
  assertEquals(status, 422);
  assertEquals(body.error.code, 'staging_level_validation_failed');
  assertEquals(body.error.validationCategory, 'pedagogical');
  assertEquals(body.error.level, 1);
  assertEquals(body.error.providerCalls, 1);
  assertEquals(calls.provider, 1);
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

test('level-one triangle omission returns strict 422 after one fake call with no partial write', async () => {
  const { status, body, calls } = await run(withLevel(1, (lesson) => {
    lesson.sequence[1].visual = structuredClone(STAGING_VISUAL_EXAMPLES.rectangle.visual);
  }), 'level-one-missing-triangle');
  assertEquals(status, 422);
  assertEquals(body.error.code, 'staging_level_validation_failed');
  assertEquals(body.error.level, 1);
  assertEquals(body.error.stage, 'level_validation');
  assertEquals(body.error.validationCategory, 'geometry');
  assertEquals(body.error.requestId, 'level-one-missing-triangle');
  assert(String(body.error.technicalDetail).includes('Missing required drawable visual for this level: triangle.'));
  assertEquals(body.error.providerCalls, 1);
  assertEquals(calls.provider, 1);
  assertEquals(calls.dbWrites, []);
});

test('truncated provider output gets one bounded retry and then returns 502', async () => {
  const { status, body, calls } = await run(() => ({ content: stagingFullLevelExample(levels[0]), finishReason: 'length' }));
  assertEquals(status, 502);
  assertEquals(body.error.code, 'provider_output_truncated');
  assertEquals(body.error.level, 1);
  assertEquals(body.error.retryCount, 1);
  assertEquals(body.error.parseStage, 'truncated');
  assertEquals(body.error.providerDiagnostics.parseState, 'truncated');
  assertEquals(calls.provider, 2);
  assertEquals(calls.dbWrites, []);
});

test('malformed provider JSON is retried once and still fails safely', async () => {
  const { status, body, calls } = await run(() => ({ content: '{"lesson_goal":"x","sequence":[' }));
  assertEquals(status, 502);
  assertEquals(body.error.code, 'provider_malformed_json');
  assertEquals(body.error.level, 1);
  assertEquals(body.error.retryCount, 1);
  assertEquals(body.error.parseStage, 'malformed_json');
  assertEquals(body.error.providerDiagnostics.parseState, 'malformed_json');
  assertEquals(calls.provider, 2);
  assertEquals(calls.dbWrites, []);
});

test('one malformed provider response followed by valid JSON succeeds after one bounded retry', async () => {
  let first = true;
  // The fake receives the provider call number; after the retry, call N carries level N - 1.
  const { status, body, calls } = await run((call) => {
    if (first) {
      first = false;
      return { content: '{"lesson_goal":"truncated","sequence":[' };
    }
    return valid(call - 1);
  }, 'bounded-retry-success');
  assertEquals(status, 200);
  assertEquals(body.providerCalls, 5);
  assertEquals(body.retryCount, 1);
  assertEquals(body.progress[0].providerCalls, 2);
  assertEquals(body.progress[0].retryCount, 1);
  assertEquals(body.progress[0].parseStage, 'valid_json_after_bounded_retry');
  assertEquals(body.progress[0].diagnostics[0], 'initial_malformed_json_retry_succeeded');
  assertEquals(calls.provider, 5);
  assertEquals(calls.dbWrites, []);
});

test('valid quoted JSON at level 4 completes exactly four fake calls without writes', async () => {
  const { status, body, calls } = await run((level) => {
    const lesson = stagingFullLevelExample(levels[level - 1]);
    if (level === 4) lesson.lesson_goal = 'Comparer les “aires” d’une figure.';
    return { content: JSON.stringify(lesson) };
  });
  assertEquals(status, 200);
  assertEquals(body.lesson_content.levels[3].lesson.lesson_goal, 'Comparer les “aires” d’une figure.');
  assertEquals(body.providerCalls, 4);
  assertEquals(calls.provider, 4);
  assertEquals(calls.dbWrites, []);
});

test('genuinely malformed JSON at level 4 stops after the one retry without partial writes', async () => {
  // Calls 4 and 5 are the level-4 attempt and its single bounded retry.
  const { status, body, calls } = await run((call) => call >= 4
    ? { content: '{"lesson_goal":"incomplete","sequence":[' }
    : valid(call), 'level-four-malformed');
  assertEquals(status, 502);
  assertEquals(body.error.code, 'provider_malformed_json');
  assertEquals(body.error.level, 4);
  assertEquals(body.error.stage, 'provider_parse');
  assertEquals(body.error.requestId, 'level-four-malformed');
  assertEquals(body.error.technicalDetail, 'staging_level_json_parse_failed: malformed_json');
  assertEquals(body.error.providerDiagnostics.syntaxError.position, 40);
  assertEquals(body.error.providerCalls, 5);
  assertEquals(body.error.retryCount, 1);
  assertEquals(calls.provider, 5);
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

const runInBody = async (reply: ProviderReply) => {
  const calls = installFakes(reply);
  const res = await handleRequest(new Request('http://localhost/generate-lesson-content', {
    method: 'POST',
    headers: { Authorization: 'Bearer fake-user-jwt', 'Content-Type': 'application/json', Origin: 'http://localhost:8080' },
    body: JSON.stringify({ topicId: TOPIC.id, mode: 'staging_draft', language: 'fr', rejectionInBody: true }),
  }));
  return { status: res.status, body: await res.json(), calls };
};

test('admin opt-in: validation rejection is delivered as 200 body with httpStatus 422 and no write', async () => {
  const { status, body, calls } = await runInBody(withLevel(2, (lesson) => {
    const angle = lesson.sequence.find((b: any) => b.visual?.kind === 'angle');
    angle.visual.data = { vertex: angle.visual.data.vertex, ray1: { x: 1, y: 1 }, ray2: { x: 2, y: 2 }, degrees: 45 };
  }));
  assertEquals(status, 200);
  assertEquals(body.success, false);
  assertEquals(body.httpStatus, 422);
  assertEquals(body.error.code, 'staging_level_validation_failed');
  assertEquals(calls.dbWrites, []);
});

test('admin opt-in: truncated provider output is delivered as 200 body with httpStatus 502', async () => {
  const { status, body } = await runInBody(() => ({ content: stagingFullLevelExample(levels[0]), finishReason: 'length' }));
  assertEquals(status, 200);
  assertEquals(body.httpStatus, 502);
  assertEquals(body.error.code, 'provider_output_truncated');
});
