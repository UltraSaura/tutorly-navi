import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.env.QA_BASE_URL || 'http://127.0.0.1:8080';
const dir = process.env.QA_SCREENSHOT_DIR || 'qa/screenshots';
await fs.mkdir(dir, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}) });
let failed = 0;
const checks = [];
for (const width of [320, 375, 390, 447, 1280]) {
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
    await check('CM2 lesson has no horizontal overflow and blocks continuation before its prerequisite', async () => {
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
      assert.equal(await page.getByRole('button', { name: 'Continuer', exact: true }).count(), 0);
      const answer = page.getByRole('textbox', { name: 'Réponse au prérequis' });
      await answer.waitFor();
      const rect = await page.getByRole('button', { name: 'Valider', exact: true }).boundingBox();
      assert.ok(rect && rect.height >= 44 && rect.y + rect.height <= 860);
    });
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
      assert.equal(await page.getByRole('button', { name: 'Continuer', exact: true }).count(), 0);
      await page.getByRole('button', { name: 'Le dénominateur partage le tout en parts égales; le numérateur indique combien de parts on prend.' }).click();
      await page.getByRole('button', { name: 'Vérifier mon explication' }).click();
      await page.getByTestId('fraction-part-0').click();
      await page.getByTestId('fraction-part-1').click();
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
      assert.equal(await page.getByRole('button', { name: 'Continuer', exact: true }).count(), 0);
      await page.locator('#fraction-transfer-answer-cm2-lesson-add-quarters').fill('3/4');
      await page.getByRole('button', { name: 'Valider le transfert' }).click();
      assert.equal(await page.getByRole('button', { name: 'Continuer', exact: true }).count(), 1);
      await page.getByRole('button', { name: 'Continuer', exact: true }).click();
      await page.getByRole('heading', { name: 'Exemple guidé terminé' }).waitFor();
      await page.getByText(/Tu as terminé l’exemple guidé et essayé un autre calcul/).waitFor();
      const conclusionMath = page.getByTestId('cm2-conclusion-math');
      assert.equal(await conclusionMath.locator('.katex-display').count(), 1, 'the complete summary is displayed as aligned math');
      assert.equal(await conclusionMath.locator('.katex-mathml mfrac').count(), 6, 'all six fractions use stacked MathML fractions');
      assert.equal((await conclusionMath.locator('.katex-html').innerText()).includes('\\frac'), false, 'raw LaTeX is not visible');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'lesson has no horizontal overflow');
      await page.screenshot({ path: dir + '/cm2-conclusion-' + width + '.png', fullPage: true });
      await page.getByRole('button', { name: 'Terminer', exact: true }).click();
      await page.getByRole('heading', { name: 'Leçon terminée' }).waitFor();
    });
    await page.screenshot({ path: dir + '/player-complete-' + width + '.png', fullPage: true });
    await page.getByRole('button', { name: 'Fixture équation' }).click();
    await page.getByRole('heading', { name: 'Avant de commencer' }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Continuer', exact: true }).count(), 0);
    const equationPrerequisite = page.getByRole('textbox', { name: 'Réponse au prérequis' });
    await equationPrerequisite.fill('4');
    assert.equal(await equationPrerequisite.inputValue(), '4');
    await page.getByRole('button', { name: 'Valider', exact: true }).click();
    await page.getByRole('heading', { name: 'Résoudre 3x + 5 = 20' }).waitFor();
    await page.getByTestId('equation-decomposition-activity').waitFor();
    await check('equation fixture is progression-gated, and solo completion does not block guided solving', async () => {
      assert.equal(await page.getByRole('button', { name: 'Continuer', exact: true }).count(), 0);
      await page.getByRole('button', { name: 'M’entraîner seul' }).click();
      await page.locator('#equation-answer-player-equation-3x5').fill('5');
      await page.getByRole('button', { name: 'Valider', exact: true }).click();
      assert.equal(await page.getByRole('button', { name: 'Continuer', exact: true }).count(), 0);
      await page.getByRole('button', { name: 'Résoudre ensemble' }).click();
      assert.match(await page.locator('section[aria-label="Résolution accompagnée"]').innerText(), /Étape 1 sur 3/);
      assert.equal(await page.getByTestId('equation-choice-0').count(), 1);
      assert.equal(await page.getByText('Activité terminée. Tu peux continuer la leçon.', { exact: true }).count(), 0);
      assert.equal(await page.locator('section[aria-label="Résolution accompagnée"] [role=status]').count(), 0);
      for (const choice of [0, 2, 1]) {
        await page.getByTestId('equation-choice-' + choice).click();
        await page.getByRole('button', { name: 'Voir le résultat' }).click();
        await page.getByRole('button', { name: choice === 1 ? 'Terminer la résolution' : 'Étape suivante' }).click();
      }
      assert.equal(await page.getByRole('button', { name: 'Continuer', exact: true }).count(), 0);
      await page.getByRole('button', { name: 'M’entraîner seul' }).click();
      assert.match(await page.locator('section[aria-label="Résolution autonome"]').innerText(), /Transfert indépendant/);
      await page.locator('#equation-answer-player-equation-3x5').fill('7');
      await page.getByRole('button', { name: 'Valider', exact: true }).click();
      assert.equal(await page.getByRole('button', { name: 'Continuer', exact: true }).count(), 1);
      await page.getByRole('button', { name: 'Résoudre ensemble' }).click();
      assert.match(await page.locator('section[aria-label="Résolution accompagnée"]').innerText(), /justifié chaque transformation/);
      await page.getByRole('button', { name: 'M’entraîner seul' }).click();
      assert.match(await page.locator('section[aria-label="Résolution autonome"]').innerText(), /Solution vérifiée: x = 7|Solution vérifiée : x = 7/);
      assert.equal(await page.getByRole('button', { name: 'Continuer', exact: true }).count(), 1);
      assert.deepEqual(errors, []);
    });
    await page.screenshot({ path: dir + '/player-equation-mode-switch-' + width + '.png', fullPage: true });
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
