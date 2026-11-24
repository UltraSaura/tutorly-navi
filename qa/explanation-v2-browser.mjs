import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.env.QA_BASE_URL || 'http://127.0.0.1:8080';
const dir = process.env.QA_SCREENSHOT_DIR || 'qa/screenshots';
await fs.mkdir(dir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const report = [];
let failures = 0;

async function runAtWidth(width) {
  const context = await browser.newContext({
    viewport: { width, height: 860 }, deviceScaleFactor: 1,
    isMobile: width !== 1280, hasTouch: width !== 1280,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  const jsErrors = [];
  page.on('pageerror', err => jsErrors.push(err.message));
  const log = (test, result, detail = '') => report.push({ viewport: width, test, result, detail });
  const run = async (test, fn) => {
    try { await fn(); log(test, 'PASS'); }
    catch (e) { failures++; log(test, 'FAIL', String(e)); }
  };
  try {
    await page.goto(base + '/qa/explanation-v2.html', { waitUntil: 'networkidle', timeout: 60000 });
    await page.getByTestId('fraction-bar-activity').waitFor();
    await run('CM2 question states one concrete task and answer format', async () => {
      assert.match(await page.getByTestId('fraction-step-instructions').innerText(), /Étape 1 sur 2/);
      assert.match(await page.locator('label[for=fraction-answer-qa-fraction]').innerText(), /combien de quarts/i);
      assert.match(await page.locator('#fraction-help-qa-fraction').innerText(), /sans écrire de fraction/i);
    });
    await run('no horizontal overflow', async () => {
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    });
    await run('fraction wrong answer and targeted hint', async () => {
      const input = page.locator('#fraction-answer-qa-fraction');
      await input.fill('3');
      await page.getByRole('button', { name: 'Valider', exact: true }).click();
      assert.match(await page.locator('[role=status]').last().innerText(), /même taille/i);
      await page.getByRole('button', { name: /Indice/ }).click();
      assert.match(await page.locator('[role=status]').last().innerText(), /même taille/i);
    });
    await run('fraction exact completion 2 then 5', async () => {
      const input = page.locator('#fraction-answer-qa-fraction');
      await input.fill('2');
      await page.getByRole('button', { name: 'Valider', exact: true }).click();
      assert.match(await page.getByTestId('fraction-step-instructions').innerText(), /Étape 2 sur 2/);
      assert.match(await page.locator('label[for=fraction-answer-qa-fraction]').innerText(), /en tout/i);
      await input.fill('5');
      await page.getByRole('button', { name: 'Valider', exact: true }).click();
      assert.match(await page.getByTestId('completion').innerText(), /Avec aide/);
    });
    await run('fraction hint ladder resets for the second step', async () => {
      await page.getByTestId('reset').click();
      const hintButton = page.getByRole('button', { name: /Indice/ });
      for (let i = 0; i < 3; i++) await hintButton.click();
      assert.equal(await hintButton.isDisabled(), true);
      const input = page.locator('#fraction-answer-qa-fraction');
      await input.fill('2');
      await page.getByRole('button', { name: 'Valider', exact: true }).click();
      assert.match(await hintButton.innerText(), /0\/3/);
      assert.equal(await hintButton.isEnabled(), true);
      await input.fill('4');
      await page.getByRole('button', { name: 'Valider', exact: true }).click();
      assert.match(await page.locator('[role=status]').last().innerText(), /dénominateurs/i);
      await hintButton.click();
      assert.match(await page.locator('[role=status]').last().innerText(), /identiques/i);
      await input.fill('5');
      await page.getByRole('button', { name: 'Valider', exact: true }).click();
      assert.match(await page.getByTestId('completion').innerText(), /Avec aide/);
    });
    await page.screenshot({ path: dir + '/fraction-' + width + '.png', fullPage: true });
    await page.getByTestId('tab-coordinate').click();
    await run('4e question explains axes and what to do', async () => {
      const instructions = await page.getByTestId('coordinate-instructions').innerText();
      assert.match(instructions, /abscisse/i);
      assert.match(instructions, /ordonnée/i);
      assert.match(instructions, /Peux-tu placer le point A/i);
    });
    await run('coordinate incorrect feedback', async () => {
      await page.getByRole('button', { name: 'Valider la position' }).click();
      assert.match(await page.locator('[role=status]').last().innerText(), /abscisse/i);
    });
    await run('coordinate keyboard-accessible buttons', async () => {
      const right = page.getByRole('button', { name: 'Déplacer à droite' });
      const up = page.getByRole('button', { name: 'Déplacer vers le haut' });
      await right.focus(); await page.keyboard.press('Enter');
      await right.focus(); await page.keyboard.press('Enter');
      for (let i = 0; i < 3; i++) { await up.focus(); await page.keyboard.press('Enter'); }
      assert.match(await page.locator('p').filter({ hasText: /^A =/ }).innerText(), /\(2 ; 3\)/);
      await page.getByRole('button', { name: 'Valider la position' }).click();
      assert.match(await page.getByTestId('completion').innerText(), /Avec aide/);
    });
    await run('coordinate pointer or touch placement after reset', async () => {
      await page.getByTestId('reset').click();
      const svg = page.locator('svg[role=img]');
      const rect = await svg.boundingBox();
      assert.ok(rect);
      const x = rect.x + (230 / 360) * rect.width;
      const y = rect.y + (105 / 360) * rect.height;
      if (width === 1280) await page.mouse.click(x, y);
      else await page.touchscreen.tap(x, y);
      assert.match(await page.locator('p').filter({ hasText: /^A =/ }).innerText(), /\(2 ; 3\)/);
      await page.getByRole('button', { name: 'Valider la position' }).click();
      assert.match(await page.getByTestId('completion').innerText(), /Indépendant/);
    });
    await run('activity state retained after tab switch', async () => {
      await page.getByTestId('tab-fraction').click();
      assert.match(await page.getByTestId('completion').innerText(), /Avec aide/);
      await page.getByTestId('tab-coordinate').click();
      assert.match(await page.getByTestId('completion').innerText(), /Indépendant/);
    });
    await page.screenshot({ path: dir + '/coordinate-' + width + '.png', fullPage: true });
    await page.getByTestId('tab-fraction-select').click();
    await run('fraction selection is a clear tappable CM2 question', async () => {
      assert.match(await page.getByTestId('fraction-select-question').innerText(), /Sélectionne 3 quarts sur les 4 parts/i);
      assert.equal(await page.getByTestId('fraction-selected-count').innerText(), 'Parts sélectionnées : 0 sur 4');
      assert.equal(await page.locator('[data-testid^="fraction-part-"]').count(), 4);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    });
    await run('select two quarters, get targeted feedback, then correct by tapping', async () => {
      await page.getByTestId('fraction-part-0').click();
      await page.getByTestId('fraction-part-1').click();
      assert.equal(await page.getByTestId('fraction-part-1').getAttribute('aria-pressed'), 'true');
      await page.getByRole('button', { name: 'Valider', exact: true }).click();
      assert.match(await page.locator('[role=status]').last().innerText(), /sélectionné 2 quarts/i);
      assert.equal(await page.getByTestId('completion').count(), 0);
      await page.getByRole('button', { name: /Indice/ }).click();
      assert.match(await page.locator('[role=status]').last().innerText(), /nombre du bas/i);
      await page.getByTestId('fraction-part-2').click();
      assert.equal(await page.getByTestId('fraction-selected-count').innerText(), 'Parts sélectionnées : 3 sur 4');
      await page.getByRole('button', { name: 'Valider', exact: true }).click();
      assert.match(await page.getByTestId('completion').innerText(), /Avec aide/);
      assert.equal(await page.getByTestId('fraction-part-0').isDisabled(), true);
    });
    await run('fraction selection resets, toggles off and completes independently', async () => {
      await page.getByTestId('reset').click();
      const first = page.getByTestId('fraction-part-0');
      await first.click();
      await first.click();
      assert.equal(await first.getAttribute('aria-pressed'), 'false');
      for (const i of [0, 1, 3]) await page.getByTestId('fraction-part-' + i).click();
      await page.getByRole('button', { name: 'Valider', exact: true }).click();
      assert.match(await page.getByTestId('completion').innerText(), /Indépendant/);
    });
    await page.screenshot({ path: dir + '/fraction-select-' + width + '.png', fullPage: true });
    await run('no runtime errors', async () => assert.deepEqual(jsErrors, []));
  } catch (e) {
    failures++; log('page startup or unhandled failure', 'FAIL', String(e));
    await page.screenshot({ path: dir + '/error-' + width + '.png', fullPage: true }).catch(() => {});
  } finally {
    await context.close();
  }
}
for (const width of [375, 447, 1280]) await runAtWidth(width);
await browser.close();
await fs.writeFile(dir + '/report.json', JSON.stringify({ failures, checks: report }, null, 2));
for (const item of report) console.log(item.result + ' ' + item.viewport + 'px ' + item.test + (item.detail ? ': ' + item.detail : ''));
console.log('TOTAL: ' + report.length + ' checks, ' + failures + ' failures');
if (failures) process.exitCode = 1;
