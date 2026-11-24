import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.env.QA_BASE_URL || 'http://127.0.0.1:8080';
const dir = process.env.QA_SCREENSHOT_DIR || 'qa/screenshots';
await fs.mkdir(dir, { recursive: true });
const browser = await chromium.launch({ headless: true });
let failed = 0;
const checks = [];
for (const width of [375, 447, 1280]) {
  const context = await browser.newContext({ viewport: { width, height: 860 }, isMobile: width !== 1280, hasTouch: width !== 1280 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const check = async (name, fn) => {
    try { await fn(); checks.push({ width, name, status: 'PASS' }); console.log('PASS ' + width + 'px ' + name); }
    catch (e) { failed++; checks.push({ width, name, status: 'FAIL', detail: String(e) }); console.error('FAIL ' + width + 'px ' + name, e); }
  };
  try {
    await page.goto(base + '/qa/explanation-v2-player.html', { waitUntil: 'networkidle', timeout: 60000 });
    await check('prerequisite unlock', async () => {
      await page.getByRole('textbox', { name: 'Réponse au prérequis' }).fill('oui');
      await page.getByRole('button', { name: 'Valider', exact: true }).click();
      await page.getByTestId('fraction-bar-activity').waitFor({ timeout: 10000 });
    });
    await check('continue gated until fraction completion', async () => {
      assert.equal(await page.getByRole('button', { name: 'Continuer', exact: true }).count(), 0);
      await page.locator('#fraction-answer-qa-fraction-player').fill('2');
      await page.getByRole('button', { name: 'Valider', exact: true }).click();
      assert.equal(await page.getByRole('button', { name: 'Continuer', exact: true }).count(), 0);
      await page.locator('#fraction-answer-qa-fraction-player').fill('5');
      await page.getByRole('button', { name: 'Valider', exact: true }).click();
      assert.equal(await page.getByRole('button', { name: 'Continuer', exact: true }).count(), 1);
    });
    await page.screenshot({ path: dir + '/player-fraction-' + width + '.png', fullPage: true });
    await check('coordinate stage gated and lesson completion', async () => {
      await page.getByRole('button', { name: 'Continuer', exact: true }).click();
      await page.getByTestId('coordinate-plane-activity').waitFor();
      assert.equal(await page.getByRole('button', { name: 'Terminer', exact: true }).count(), 0);
      const right = page.getByRole('button', { name: 'Déplacer à droite' });
      const up = page.getByRole('button', { name: 'Déplacer vers le haut' });
      for (let i = 0; i < 2; i++) await right.click();
      for (let i = 0; i < 3; i++) await up.click();
      await page.getByRole('button', { name: 'Valider la position' }).click();
      assert.equal(await page.getByRole('button', { name: 'Terminer', exact: true }).count(), 1);
      await page.getByRole('button', { name: 'Terminer', exact: true }).click();
      await page.getByRole('heading', { name: 'Leçon terminée' }).waitFor();
    });
    await page.screenshot({ path: dir + '/player-complete-' + width + '.png', fullPage: true });
    await check('no runtime errors', async () => assert.deepEqual(errors, []));
  } catch (e) {
    failed++; checks.push({ width, name: 'page startup', status: 'FAIL', detail: String(e) });
    console.error('FAIL player startup', width, e);
    await page.screenshot({ path: dir + '/player-error-' + width + '.png', fullPage: true }).catch(() => {});
  } finally { await context.close(); }
}
await browser.close();
await fs.writeFile(dir + '/player-report.json', JSON.stringify({ failed, checks }, null, 2));
console.log('PLAYER TOTAL: ' + checks.length + ' checks, ' + failed + ' failures');
if (failed) process.exitCode = 1;
