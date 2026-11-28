import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.env.QA_BASE_URL || 'http://127.0.0.1:8080';
const dir = process.env.QA_SCREENSHOT_DIR || 'qa/screenshots';
await fs.mkdir(dir, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}) });
const results = [];
for (const width of [320, 375, 390, 447, 1280]) {
  const context = await browser.newContext({ viewport: { width, height: 860 }, isMobile: width !== 1280, hasTouch: width !== 1280 });
  const page = await context.newPage();
  const errors = [];
  const writes = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (/supabase\.co/.test(request.url()) && !['GET', 'HEAD', 'OPTIONS'].includes(request.method())) writes.push(`${request.method()} ${request.url()}`);
  });
  await page.goto(base + '/qa/staging-preview.html', { waitUntil: 'networkidle', timeout: 60000 });
  await page.getByTestId('admin-v21-interactive-player').waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, `${width}px preview overflow`);
  assert.equal(await page.getByRole('button', { name: /Niveau 1:/ }).count(), 1);
  assert.equal(await page.getByRole('button', { name: /Niveau 4:/ }).count(), 1);
  await page.getByRole('button', { name: /Niveau 1:/ }).click();
  await page.getByRole('button', { name: 'Continuer', exact: true }).click();
  await page.getByTestId('fraction-select-activity').waitFor();
  if (width === 375 || width === 1280) await page.screenshot({ path: `${dir}/teacher-preview-${width}.png`, fullPage: true });
  for (const index of [0, 1, 2]) await page.getByTestId(`fraction-part-${index}`).click();
  await page.getByRole('button', { name: 'Valider', exact: true }).click();
  await page.getByRole('button', { name: /Le dénominateur partage/ }).click();
  await page.getByRole('button', { name: 'Vérifier mon explication' }).click();
  await page.getByTestId('fraction-select-activity').waitFor();
  for (const index of [0, 1]) await page.getByTestId(`fraction-part-${index}`).click();
  await page.getByRole('button', { name: 'Valider', exact: true }).click();
  await page.getByText('Transfert réussi sans aide.').waitFor();
  await page.getByRole('button', { name: /Niveau 4:/ }).click();
  await page.getByTestId('fraction-bar-activity').waitFor();
  assert.deepEqual(errors, [], `${width}px runtime errors`);
  assert.deepEqual(writes, [], `${width}px teacher preview attempted learner persistence`);
  results.push({ width, status: 'PASS' });
  console.log(`PASS ${width}px read-only teacher preview and interactive activity`);
  await context.close();
}
await browser.close();
await fs.writeFile(`${dir}/teacher-preview-report.json`, JSON.stringify({ results }, null, 2));
