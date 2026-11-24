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
    await check('CM2 prerequisite uses a meaningful fractions question', async () => {
      assert.match(await page.getByText(/Combien de quarts faut-il pour reconstituer la barre entière/).innerText(), /Combien de quarts/i);
      await page.getByRole('textbox', { name: 'Réponse au prérequis' }).fill('4');
      await page.getByRole('button', { name: 'Valider', exact: true }).click();
      await page.getByRole('heading', { name: 'Un quart, c’est une part sur quatre' }).waitFor({ timeout: 10000 });
    });
    await check('explanation comes before interactive selection', async () => {
      assert.match(await page.getByText(/Imagine une tablette de chocolat/).innerText(), /quatre morceaux/);
      await page.getByRole('button', { name: 'Continuer', exact: true }).click();
      await page.getByTestId('fraction-select-activity').waitFor();
      assert.equal(await page.getByRole('button', { name: 'Continuer', exact: true }).count(), 0);
    });
    await check('selecting too few parts gives feedback and blocks progress', async () => {
      await page.getByTestId('fraction-part-0').click();
      await page.getByTestId('fraction-part-1').click();
      await page.getByRole('button', { name: 'Valider', exact: true }).click();
      assert.match(await page.getByTestId('fraction-selected-count').innerText(), /2 sur 4/);
      assert.equal(await page.getByRole('button', { name: 'Continuer', exact: true }).count(), 0);
      await page.getByTestId('fraction-part-2').click();
      await page.getByRole('button', { name: 'Valider', exact: true }).click();
      assert.equal(await page.getByRole('button', { name: 'Continuer', exact: true }).count(), 1);
      assert.equal(await page.getByText('À toi de jouer', { exact: true }).count(), 1);
    });
    await page.screenshot({ path: dir + '/player-select-' + width + '.png', fullPage: true });
    await check('guided example explains 1/2 equals 2/4', async () => {
      await page.getByRole('button', { name: 'Continuer', exact: true }).click();
      await page.getByText(/une moitié représente deux quarts/).waitFor();
      assert.equal(await page.getByRole('button', { name: 'Continuer', exact: true }).count(), 1);
    });
    await check('addition requires both answers and ends with a clear conclusion', async () => {
      await page.getByRole('button', { name: 'Continuer', exact: true }).click();
      await page.getByTestId('fraction-bar-activity').waitFor();
      assert.equal(await page.getByRole('button', { name: 'Continuer', exact: true }).count(), 0);
      await page.locator('#fraction-answer-cm2-lesson-add-quarters').fill('2');
      await page.getByRole('button', { name: 'Valider', exact: true }).click();
      assert.equal(await page.getByRole('button', { name: 'Continuer', exact: true }).count(), 0);
      await page.locator('#fraction-answer-cm2-lesson-add-quarters').fill('5');
      await page.getByRole('button', { name: 'Valider', exact: true }).click();
      assert.equal(await page.getByRole('button', { name: 'Continuer', exact: true }).count(), 1);
      await page.getByRole('button', { name: 'Continuer', exact: true }).click();
      await page.getByRole('heading', { name: 'Bravo ! Tu sais additionner des quarts' }).waitFor();
      await page.getByText(/Trois quarts et deux quarts font cinq quarts/).waitFor();
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
