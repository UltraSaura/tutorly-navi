import type { Page } from '@playwright/test';
import { subject, categories } from './catalogue';

/** Disposable signed-in transport fixture. No request reaches a production account. */
export async function coordinateLearner(page: Page, level = '5eme', country = 'fr', admin = false) {
  const userId = '00000000-0000-4000-8000-000000000555';
  const topic = { id: 'coordinate-qa-topic', name: 'Coordonnées', category_id: 'qa-category', curriculum_country_code: country,
    curriculum_level_code: level, is_active: true, order_index: 1, lesson_content: null, curriculum_subject_id: 'mathematiques' };
  await page.addInitScript(({ userId }) => {
    const encode = (value: unknown) => btoa(JSON.stringify(value)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const user = { id: userId, aud: 'authenticated', role: 'authenticated', email: 'synthetic-coordinate@example.invalid', created_at: '2026-01-01T00:00:00Z', app_metadata: {}, user_metadata: {} };
    const access_token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: userId, aud: 'authenticated', role: 'authenticated', exp: 2208988800, session_id: '00000000-0000-4000-8000-000000000556' })}.synthetic-test-signature`;
    localStorage.setItem('sb-sibprjxhbxahouejygeu-auth-token', JSON.stringify({ access_token, refresh_token: 'synthetic-no-refresh', expires_at: 2208988800, expires_in: 3600, token_type: 'bearer', user }));
  }, { userId });
  await page.route('https://sibprjxhbxahouejygeu.supabase.co/rest/v1/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const table = url.pathname.slice('/rest/v1/'.length);
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS' } });
    if (table === 'rpc/family_bootstrap') return route.fulfill({ headers: { 'access-control-allow-origin': '*' }, json: { isFamily: false, isGuardian: false, approvalStatus: 'approved', pinConfigured: false } });
    if (request.method() !== 'GET') return route.fallback();
    let rows: unknown[];
    if (table === 'users') rows = [{ id: userId, first_name: 'QA', user_type: admin ? 'admin' : 'student', country: 'France', level,
      curriculum_country_code: country, curriculum_level_code: level, product_tour_completed_at: '2026-01-01', approval_status: 'approved' }];
    else if (table === 'user_roles') rows = admin ? [{ role: 'admin' }] : [];
    else if (table === 'children') rows = [];
    else if (table === 'topics') rows = [topic];
    else if (table === 'subjects') rows = [subject];
    else if (table === 'learning_categories') rows = categories;
    else if (table === 'quiz_banks') rows = [{ id: 'coordinate-qa-bank', title: 'QA Coordinates', school_levels: [level], primary_topic_id: topic.id, source_topic_ids: [topic.id], subject_id: subject.id, is_active: true }];
    else if (['videos', 'quiz_bank_questions', 'quiz_bank_assignments'].includes(table)) rows = [];
    else return route.fallback();
    return route.fulfill({ json: request.headers().accept?.includes('vnd.pgrst.object') ? rows[0] ?? null : rows, headers: { 'x-tutorly-test-data': 'synthetic', 'access-control-allow-origin': '*' } });
  });
}
