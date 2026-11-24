/** Smoke test the production-built, standalone demo (not the Vite dev router). */
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const base = process.env.DEMO_BASE_URL || 'http://127.0.0.1:4173';
const browser = await chromium.launch({ headless: true });
let failed = 0;
try {
  const page = await browser.newPage({ viewport: { width: 375, height: 820 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const response = await page.goto(base + '/demo.html', { waitUntil: 'networkidle', timeout: 60000 });
  assert.equal(response?.status(), 200, 'standalone demo must return HTTP 200');
  await page.getByRole('heading', { name: 'Mathématiques interactives' }).waitFor();
  await page.getByTestId('fraction-select-activity').waitFor();
  for (const i of [0, 1, 2]) await page.getByTestId('fraction-part-' + i).click();
  await page.getByRole('button', { name: 'Valider', exact: true }).click();
  await page.getByText('Réussi sans aide').waitFor();
  console.log('PASS production-built /demo.html opens and completes selectable 3/4 fraction');
  await page.getByRole('button', { name: '4e · Coordonnées' }).click();
  await page.getByTestId('coordinate-plane-activity').waitFor();
  console.log('PASS production-built demo switches to coordinate plane');
  await page.getByRole('button', { name: 'CM2 · Additionner' }).click();
  await page.locator('#fraction-answer-cm2-fractions-001').fill('2');
  await page.getByRole('button', { name: 'Valider', exact: true }).click();
  await page.locator('#fraction-answer-cm2-fractions-001').fill('5');
  await page.getByRole('button', { name: 'Valider', exact: true }).click();
  await page.getByText('Réussi sans aide').waitFor();
  await page.getByRole('button', { name: 'Parcours complet CM2 · 5 étapes' }).click();
  await page.getByTestId('cm2-lesson-preview').waitFor();
  await page.getByRole('heading', { name: 'Un quart, c’est une part sur quatre' }).waitFor();
  await page.getByRole('button', { name: 'Continuer', exact: true }).click();
  await page.getByTestId('fraction-select-activity').waitFor();
  assert.equal(await page.getByRole('button', { name: 'Continuer', exact: true }).count(), 0);
  for (const i of [0, 1, 2]) await page.getByTestId('fraction-part-' + i).click();
  await page.getByRole('button', { name: 'Valider', exact: true }).click();
  await page.getByRole('button', { name: 'Continuer', exact: true }).click();
  await page.getByRole('heading', { name: 'Comment transformer une moitié en quarts ?' }).waitFor();
  await page.getByRole('button', { name: 'Continuer', exact: true }).click();
  await page.getByTestId('fraction-bar-activity').waitFor();
  await page.locator('#fraction-answer-cm2-lesson-add-quarters').fill('2');
  await page.getByRole('button', { name: 'Valider', exact: true }).click();
  await page.locator('#fraction-answer-cm2-lesson-add-quarters').fill('5');
  await page.getByRole('button', { name: 'Valider', exact: true }).click();
  await page.getByRole('button', { name: 'Continuer', exact: true }).click();
  await page.getByRole('heading', { name: 'Bravo ! Tu sais additionner des quarts' }).waitFor();
  await page.getByText('Leçon terminée !').waitFor();
  console.log('PASS five-step CM2 lesson preview enforces interactive completion');
  assert.deepEqual(errors, []);
  console.log('PASS standalone demo is interactive and has no page errors');
} catch (e) {
  failed++;
  console.error('FAIL production-built standalone demo', e);
} finally {
  await browser.close();
}
if (failed) process.exitCode = 1;
