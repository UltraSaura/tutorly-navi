import { test as base, expect, type Locator, type Page } from '@playwright/test';
import { categories, subject } from './catalogue';

export { expect };
export const test = base.extend<{ browserHealth: void }>({
  browserHealth: [async ({ page, baseURL }, use, testInfo) => {
    if (!baseURL) throw new Error('Browser tests require a loopback application origin');
    const expectedVersion = process.env.PW_CHROMIUM_EXECUTABLE ? '154.0.8037.57' : '158.0.8127.18';
    expect(page.context().browser()?.version(), 'Reviewed renderer version; review baselines before upgrading').toBe(expectedVersion);
    const appOrigin = new URL(baseURL).origin;
    const errors: string[] = [];
    const requests: string[] = [];
    const cancelledSyntheticReads: string[] = [];
    const fixtureTables = new Set(['objectives', 'school_levels', 'countries', 'domains', 'subdomains', 'ai_model_providers', 'ai_model_keys', 'prompt_templates', 'subject_prompt_assignments', 'subjects', 'learning_categories', 'exam_papers', 'exam_training_items', 'topics']);
    page.on('pageerror', (error) => errors.push(`page: ${error.message}`));
    page.on('console', (message) => { if (message.type() === 'error' || /Failed to decode downloaded font|OTS parsing error/.test(message.text())) errors.push(`console: ${message.text()}`); });
    page.on('requestfailed', (request) => {
      // The app deliberately aborts superseded read queries on route/profile changes.
      const url = new URL(request.url());
      const knownRead = request.method() === 'GET' && url.hostname === 'sibprjxhbxahouejygeu.supabase.co' && url.pathname.startsWith('/rest/v1/') && fixtureTables.has(url.pathname.slice('/rest/v1/'.length));
      if (request.failure()?.errorText === 'net::ERR_ABORTED' && knownRead) cancelledSyntheticReads.push(request.url());
      else errors.push(`request: ${request.url()} ${request.failure()?.errorText}`);
    });
    page.on('response', (response) => { if (response.status() >= 400) errors.push(`HTTP ${response.status()}: ${response.url()}`); });
    await page.clock.setFixedTime(new Date('2026-01-15T12:00:00Z'));
    await page.addInitScript(() => {
      if (!localStorage.getItem('lang')) localStorage.setItem('lang', 'en');
      localStorage.setItem('languageManuallySet', 'true');
      localStorage.setItem('countryDetected', 'true');
    });
    await page.route('**/*', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.origin === appOrigin) return route.continue();
      if (url.hostname === 'sibprjxhbxahouejygeu.supabase.co' && request.method() === 'GET' && url.pathname.startsWith('/rest/v1/')) {
        const table = url.pathname.slice('/rest/v1/'.length);
        const emptyTables = ['objectives', 'school_levels', 'countries', 'domains', 'subdomains', 'ai_model_providers', 'ai_model_keys', 'prompt_templates', 'subject_prompt_assignments', 'exam_papers', 'exam_training_items', 'topics'];
        let data: unknown;
        if (table === 'subjects') data = request.headers().accept?.includes('vnd.pgrst.object') ? subject : [subject];
        else if (table === 'learning_categories') data = categories;
        else if (emptyTables.includes(table)) data = [];
        else { errors.push(`Unconfigured synthetic table: ${table}`); return route.abort(); }
        requests.push(`${request.method()} ${url.pathname}`);
        return route.fulfill({ json: data, headers: { 'access-control-allow-origin': '*', 'x-tutorly-test-data': 'synthetic' } });
      }
      errors.push(`Unexpected external request (blocked): ${request.method()} ${url.origin}${url.pathname}`);
      return route.abort();
    });
    await use();
    if (!page.isClosed()) {
      const brokenImages = await page.locator('img').evaluateAll((images) => images.flatMap((image) => image instanceof HTMLImageElement && (!image.complete || image.naturalWidth === 0) ? [image.src] : []));
      errors.push(...brokenImages.map((url) => `Broken image: ${url}`));
    }
    if (!page.isClosed()) await testInfo.attach('browser-evidence', { body: await page.screenshot({ fullPage: true, animations: 'disabled' }), contentType: 'image/png' });
    await testInfo.attach('synthetic-network-and-health', { body: JSON.stringify({ mode: 'synthetic REST fixtures; no live backend or authentication', requests, cancelledSyntheticReads, errors }, null, 2), contentType: 'application/json' });
    expect(errors, 'Browser errors, missing resources and unconfigured external traffic').toEqual([]);
  }, { auto: true }],
});

export async function ready(page: Page, path: string) {
  await page.goto(path, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const fontReady = await page.evaluate(async () => {
    const weights = await Promise.all([400, 500, 600, 700, 800].map((weight) => document.fonts.load(`${weight} 16px Poppins`)));
    return weights.every((faces) => faces.length > 0 && faces.every((face) => face.status === 'loaded'));
  });
  expect(fontReady, 'Pinned Poppins font faces loaded without fallback').toBe(true);
}

export async function assertUsable(page: Page, control: Locator) {
  await expect(control).toBeVisible();
  await expect(control).toBeEnabled();
  await control.scrollIntoViewIfNeeded();
  const usable = await control.evaluate((element) => {
    const r = element.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return r.width > 0 && r.height > 0 && r.left >= 0 && r.right <= innerWidth + 1 && r.top >= 0 && r.bottom <= innerHeight + 1 && Boolean(hit && (element.contains(hit) || hit.contains(element)));
  });
  expect(usable, 'Control is clipped or covered').toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Horizontal page overflow').toBe(true);
}
