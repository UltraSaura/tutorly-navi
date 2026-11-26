import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.env.QA_BASE_URL || 'http://127.0.0.1:8080';
const dir = process.env.QA_SCREENSHOT_DIR || 'qa/screenshots';
await fs.mkdir(dir, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}) });
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
  const checkTouchTargets = async selector => {
    const small = await page.locator(selector + ' button:visible').evaluateAll(buttons => buttons.flatMap(button => {
      const rect = button.getBoundingClientRect();
      return rect.width < 44 || rect.height < 44 ? [{ label: button.getAttribute('aria-label') || button.innerText, width: Math.round(rect.width), height: Math.round(rect.height) }] : [];
    }));
    assert.deepEqual(small, []);
  };
  try {
    await page.goto(base + '/qa/explanation-v2.html', { waitUntil: 'networkidle', timeout: 60000 });
    await page.getByTestId('fraction-bar-activity').waitFor();
    await run('fraction-addition touch targets meet 44px minimum', async () => checkTouchTargets('[data-testid="fraction-bar-activity"]'));
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
    await run('fraction demonstration explains equivalent parts without changing answer state', async () => {
      await page.getByRole('button', { name: 'Voir la démonstration pas à pas' }).click();
      await page.getByTestId('math-demonstration').waitFor();
      assert.match(await page.getByTestId('demo-progress').innerText(), /1 sur 4/);
      await page.getByRole('button', { name: 'Voir l’étape suivante' }).click();
      assert.match(await page.getByTestId('demo-equation').innerText(), /1\/2 = 2\/4/);
      await page.getByRole('button', { name: 'Voir l’étape suivante' }).click();
      assert.match(await page.getByTestId('demo-equation').innerText(), /5\/4/);
      await page.getByRole('button', { name: 'Voir l’étape suivante' }).click();
      assert.match(await page.getByTestId('demo-equation').innerText(), /1 \+ 1\/4/);
      await page.getByRole('button', { name: 'Revenir à l’exercice' }).first().click();
      assert.equal(await page.locator('#fraction-answer-qa-fraction').inputValue(), '3');
      assert.equal(await page.getByTestId('completion').count(), 0);
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
      await checkTouchTargets('[data-testid="coordinate-plane-activity"]');
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
      // Touchscreen.tap uses viewport coordinates and does not auto-scroll offscreen SVGs.
      await svg.scrollIntoViewIfNeeded();
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
      await checkTouchTargets('[data-testid="fraction-select-activity"]');
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
    await page.getByTestId('tab-algebra').click();
    await run('algebra tiles explain unknown and units, show wrong-answer feedback', async () => {
      await page.getByTestId('algebra-tiles-activity').waitFor();
      await checkTouchTargets('[data-testid="algebra-tiles-activity"]');
      await page.getByRole('button', { name: 'Ajouter une tuile x' }).click();
      await page.getByRole('button', { name: 'Valider', exact: true }).click();
      assert.match(await page.locator('[role=status]').last().innerText(), /nombre devant x/i);
      await page.getByRole('button', { name: /Indice/ }).click();
      assert.match(await page.locator('[role=status]').last().innerText(), /grande tuile/i);
    });
    await run('algebra tiles allow tapping, removing and exact completion', async () => {
      await page.getByRole('button', { name: 'Ajouter une tuile x' }).click();
      for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Ajouter une unité' }).click();
      await page.getByRole('button', { name: 'Retirer une unité' }).first().click();
      assert.match(await page.getByTestId('algebra-workspace').innerText(), /2x \+ 3/);
      await page.getByRole('button', { name: 'Valider', exact: true }).click();
      assert.match(await page.getByTestId('completion').innerText(), /Avec aide/);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    });
    await page.screenshot({ path: dir + '/algebra-' + width + '.png', fullPage: true });
    await page.getByTestId('tab-linear').click();
    await run('function demonstration teaches starting point, slope and exploration before assessment', async () => {
      await page.getByTestId('math-demonstration').waitFor();
      await checkTouchTargets('[data-testid="linear-function-activity"]');
      assert.match(await page.getByTestId('demo-step-title').innerText(), /constante/i);
      await page.getByRole('button', { name: 'Voir l’étape suivante' }).click();
      assert.match(await page.getByTestId('demo-equation').innerText(), /f\(x\) = 1/);
      await page.getByRole('button', { name: 'Voir l’étape suivante' }).click();
      assert.match(await page.getByTestId('demo-equation').innerText(), /f\(x\) = 2x \+ 1/);
      await page.getByRole('button', { name: 'Précédent' }).click();
      assert.match(await page.getByTestId('demo-equation').innerText(), /f\(x\) = 1/);
      await page.getByRole('button', { name: 'Voir l’étape suivante' }).click();
      await page.getByRole('button', { name: 'Voir l’étape suivante' }).click();
      await page.getByRole('button', { name: 'Manipuler la droite' }).click();
      assert.match(await page.getByText('Exploration libre — sans note').innerText(), /sans note/);
      await page.getByRole('button', { name: 'Passer au défi' }).click();
      assert.equal(await page.getByRole('button', { name: 'Valider la droite' }).isVisible(), true);
    });
    await run('function graph updates equation and diagnoses incorrect intercept', async () => {
      await page.getByTestId('linear-function-activity').waitFor();
      await page.getByRole('button', { name: 'M’entraîner' }).click();
      await page.getByRole('button', { name: 'Valider la droite' }).click();
      assert.match(await page.locator('[role=status]').last().innerText(), /axe vertical/i);
      await page.getByRole('button', { name: 'Augmenter Ordonnée à l’origine b' }).click();
      await page.getByRole('button', { name: 'Valider la droite' }).click();
      assert.match(await page.locator('[role=status]').last().innerText(), /pente/i);
    });
    await run('function graph changes slope and completes', async () => {
      await page.getByTestId('reset').click();
      await page.getByRole('button', { name: 'M’entraîner' }).click();
      await page.getByRole('button', { name: 'Augmenter Ordonnée à l’origine b' }).click();
      await page.getByRole('button', { name: 'Augmenter Coefficient directeur a' }).click();
      await page.getByRole('button', { name: 'Augmenter Coefficient directeur a' }).click();
      assert.match(await page.getByTestId('live-equation').innerText(), /f\(x\) = 2x \+ 1/);
      await page.getByRole('button', { name: 'Valider la droite' }).click();
      assert.match(await page.getByTestId('completion').innerText(), /Indépendant/);
    });
    await run('affine-function handles respond to pointer dragging', async () => {
      await page.getByTestId('reset').click();
      await page.getByRole('button', { name: 'Explorer' }).click();
      const graph = page.getByTestId('line-graph');
      const rect = await graph.boundingBox();
      assert.ok(rect);
      const dragHandle = async (handle, x, y) => {
        const box = await page.getByTestId('drag-' + handle).boundingBox();
        assert.ok(box);
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(rect.x + (x / 360) * rect.width, rect.y + (y / 360) * rect.height, { steps: 5 });
        await page.mouse.up();
      };
      await dragHandle('intercept', 180, 155);
      assert.match(await page.getByTestId('live-equation').innerText(), /f\(x\) = 0x \+ 1/);
      await dragHandle('slope', 205, 105);
      assert.match(await page.getByTestId('live-equation').innerText(), /f\(x\) = 2x \+ 1/);
    });
    await page.screenshot({ path: dir + '/linear-' + width + '.png', fullPage: true });
    await page.getByTestId('tab-equation').click();
    await run('equation visual decomposition animates identical operations on both sides', async () => {
      await page.getByTestId('equation-decomposition-activity').waitFor();
      await checkTouchTargets('[data-testid="equation-decomposition-activity"]');
      assert.match(await page.getByTestId('equation-demo-progress').innerText(), /1 sur 3/);
      assert.match(await page.getByTestId('equation-transform').innerText(), /3x \+ 5/);
      assert.equal(await page.getByTestId('equation-after').count(), 0);
      assert.match(await page.getByTestId('equation-step-instruction').innerText(), /Ce qu’on va faire.*soustraire 5 aux deux membres/s);
      assert.equal(await page.locator('details').filter({ hasText: 'Pourquoi cette étape ?' }).getAttribute('open'), null);
      assert.equal(await page.getByTestId('equation-transform').getByText('Membre gauche').count(), 0);
      assert.equal(await page.getByTestId('equation-transform').getByText('Membre droit').count(), 0);
      assert.equal(await page.getByRole('button', { name: 'Comprendre' }).getAttribute('aria-pressed'), 'true');
      await page.getByRole('button', { name: 'Animer l’opération' }).click();
      assert.match(await page.getByTestId('equation-step-instruction').innerText(), /Ce qu’on fait.*On soustrait 5 à gauche ET à droite/s);
      const operations = await page.getByTestId('equation-operation').locator('div').allInnerTexts();
      assert.equal(operations[0], operations[1]);
      assert.equal(await page.getByTestId('equation-after').count(), 0);
      assert.deepEqual(await page.getByTestId('equation-cancel-token').allInnerTexts(), ['+ 5', '− 5']);
      assert.deepEqual(await page.getByTestId('equation-combine-token').allInnerTexts(), ['20', '− 5']);
      assert.match(await page.getByTestId('equation-cancellation-explanation').innerText(), /font 0 à gauche/);
      await page.getByRole('button', { name: 'Voir le résultat' }).click();
      assert.match(await page.getByTestId('equation-after').innerText(), /3x = 15/);
      assert.match(await page.getByTestId('equation-step-instruction').innerText(), /Ce qu’on obtient.*20 − 5 = 15/s);
      assert.equal(await page.getByTestId('equation-operation').count(), 0);
      assert.equal(await page.getByTestId('equation-term-animation').count(), 0);
      await page.getByRole('button', { name: 'Précédent' }).click();
      assert.equal(await page.getByTestId('equation-after').count(), 0);
      await page.getByRole('button', { name: 'Voir le résultat' }).click();
      await page.getByRole('button', { name: 'Étape suivante' }).click();
      assert.match(await page.getByTestId('equation-demo-progress').innerText(), /2 sur 3/);
      await page.getByRole('button', { name: 'Animer l’opération' }).click();
      await page.getByRole('button', { name: 'Voir le résultat' }).click();
      assert.match(await page.getByTestId('equation-after').innerText(), /x = 5/);
      assert.match(await page.getByTestId('equation-step-instruction').innerText(), /Ce qu’on obtient.*x = 5/s);
      await page.screenshot({ path: dir + '/equation-focused-' + width + '.png', fullPage: true });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
      await page.getByText('Pourquoi cette étape ?').click();
      assert.equal(await page.locator('details').filter({ hasText: 'Pourquoi cette étape ?' }).getAttribute('open'), '');
      await page.getByText('Pourquoi cette étape ?').click();
    });
    await run('equation guided mode diagnoses wrong operation and preserves help status', async () => {
      await page.getByRole('button', { name: 'Résoudre ensemble' }).click();
      await page.getByTestId('equation-choice-1').click();
      assert.match(await page.locator('[role=status]').last().innerText(), /deux membres|deux côtés/i);
      await page.getByTestId('equation-choice-0').click();
      assert.match(await page.getByTestId('equation-guided-instruction').innerText(), /Ce qu’on fait.*soustrait 5 à gauche ET à droite/s);
      assert.equal(await page.getByTestId('equation-after').count(), 0);
      assert.deepEqual(await page.getByTestId('equation-cancel-token').allInnerTexts(), ['+ 5', '− 5']);
      await page.getByRole('button', { name: 'Comprendre' }).click();
      await page.getByRole('button', { name: 'Résoudre ensemble' }).click();
      assert.deepEqual(await page.getByTestId('equation-cancel-token').allInnerTexts(), ['+ 5', '− 5']);
      assert.equal(await page.locator('section[aria-label="Résolution accompagnée"] details').getAttribute('open'), null);
      await page.getByRole('button', { name: 'Voir le résultat' }).click();
      assert.match(await page.getByTestId('equation-guided-instruction').innerText(), /Ce qu’on obtient.*20 − 5 = 15/s);
      assert.match(await page.getByTestId('equation-after').innerText(), /3x = 15/);
      assert.equal(await page.getByTestId('equation-term-animation').count(), 0);
      await page.getByRole('button', { name: 'Étape suivante' }).click();
      assert.match(await page.locator('section[aria-label="Résolution accompagnée"]').innerText(), /Étape 2 sur 3/);
    });
    await run('equation solo rejects malformed and incorrect answers, then accepts exact result', async () => {
      await page.getByRole('button', { name: 'M’entraîner seul' }).click();
      const input = page.locator('#equation-answer-qa-equation');
      await input.fill('5/0');
      await page.getByRole('button', { name: 'Valider', exact: true }).click();
      assert.match(await page.locator('[role=status]').last().innerText(), /dénominateur/i);
      await input.fill('');
      await page.getByRole('button', { name: 'Valider', exact: true }).click();
      assert.match(await page.locator('[role=status]').last().innerText(), /entier ou une fraction/i);
      await input.fill('abc');
      await page.getByRole('button', { name: 'Valider', exact: true }).click();
      assert.match(await page.locator('[role=status]').last().innerText(), /format/i);
      await input.fill('4/1');
      await page.getByRole('button', { name: 'Valider', exact: true }).click();
      assert.match(await page.locator('[role=status]').last().innerText(), /ne sont pas égaux/i);
      await input.fill('-5');
      await page.getByRole('button', { name: 'Valider', exact: true }).click();
      assert.match(await page.locator('[role=status]').last().innerText(), /signe/i);
      await input.fill('5');
      await page.getByRole('button', { name: 'Valider', exact: true }).click();
      assert.match(await page.getByTestId('completion').innerText(), /Avec aide/);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    });
    await run('mode switch keeps solo completion local and guided progression available', async () => {
      await page.getByTestId('reset').click();
      await page.getByRole('button', { name: 'M’entraîner seul' }).click();
      await page.locator('#equation-answer-qa-equation').fill('5');
      await page.getByRole('button', { name: 'Valider', exact: true }).click();
      await page.getByRole('button', { name: 'Résoudre ensemble' }).click();
      assert.match(await page.locator('section[aria-label="Résolution accompagnée"]').innerText(), /Étape 1 sur 3/);
      assert.equal(await page.getByTestId('equation-choice-0').count(), 1);
      assert.equal(await page.getByText('Activité terminée. Tu peux continuer la leçon.', { exact: true }).count(), 0);
      assert.equal(await page.locator('section[aria-label="Résolution accompagnée"] [role=status]').count(), 0);
      assert.equal(await page.getByTestId('completion-count').innerText(), '1');
      for (const [index, choice] of [0, 2, 1].entries()) {
        await page.getByTestId('equation-choice-' + choice).click();
        await page.getByRole('button', { name: 'Voir le résultat' }).click();
        await page.getByRole('button', { name: index === 2 ? 'Terminer la résolution' : 'Étape suivante' }).click();
      }
      assert.equal(await page.getByTestId('completion-count').innerText(), '1');
      const saved = JSON.parse(await page.getByTestId('activity-progress').innerText());
      assert.equal(saved.equationModes.independentEvidence, true);
      assert.equal(saved.equationModes.guidedCompleted, true);
      await page.getByRole('button', { name: 'M’entraîner seul' }).click();
      assert.match(await page.locator('section[aria-label="Résolution autonome"] [role=status]').innerText(), /x = 5/);
      assert.doesNotMatch(await page.locator('section[aria-label="Résolution autonome"] [role=status]').innerText(), /justifié chaque transformation/);
      await page.getByRole('button', { name: 'Comprendre' }).click();
      await page.getByTestId('equation-demo-progress').waitFor();
      assert.equal(await page.locator('section[aria-label="Démonstration de l’équation"] [role=status]').count(), 0);
      await page.getByRole('button', { name: 'Résoudre ensemble' }).click();
      assert.match(await page.locator('section[aria-label="Résolution accompagnée"] [role=status]').innerText(), /justifié chaque transformation/);
    });
    await run('guided equations require all operations and verification before completion', async () => {
      await page.getByTestId('tab-equation-both').click();
      await page.getByTestId('tab-equation').click();
      await page.getByTestId('reset').click();
      await page.getByRole('button', { name: 'Résoudre ensemble' }).click();
      for (const [index, choice] of [[0, 0], [1, 2], [2, 1]]) {
        assert.match(await page.getByTestId('equation-guided-instruction').innerText(), /Quelle opération/);
        assert.equal(await page.getByTestId('equation-after').count(), 0);
        await page.getByTestId('equation-choice-' + choice).click();
        assert.match(await page.getByTestId('equation-guided-instruction').innerText(), /Ce qu’on fait/);
        assert.equal(await page.getByTestId('equation-after').count(), 0);
        await page.getByRole('button', { name: 'Voir le résultat' }).click();
        assert.match(await page.getByTestId('equation-guided-instruction').innerText(), /Ce qu’on obtient/);
        assert.equal(await page.getByTestId('equation-after').count(), 1);
        await page.getByRole('button', { name: index === 2 ? 'Terminer la résolution' : 'Étape suivante' }).click();
      }
      assert.match(await page.getByTestId('completion').innerText(), /Avec aide/);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
      await page.screenshot({ path: dir + '/equation-guided-' + width + '.png', fullPage: true });
    });
    await run('assisted completion remains distinct from later independent practice', async () => {
      await page.getByTestId('reset').click();
      await page.getByRole('button', { name: 'Résoudre ensemble' }).click();
      for (const [index, choice] of [0, 2, 1].entries()) {
        await page.getByTestId('equation-choice-' + choice).click();
        await page.getByRole('button', { name: 'Voir le résultat' }).click();
        await page.getByRole('button', { name: index === 2 ? 'Terminer la résolution' : 'Étape suivante' }).click();
      }
      assert.equal(await page.getByTestId('completion-count').innerText(), '1');
      await page.getByRole('button', { name: 'M’entraîner seul' }).click();
      await page.locator('#equation-answer-qa-equation').fill('5');
      await page.getByRole('button', { name: 'Valider', exact: true }).click();
      const saved = JSON.parse(await page.getByTestId('activity-progress').innerText());
      assert.equal(saved.equationModes.guidedCompleted, true);
      assert.equal(saved.equationModes.independentEvidence, false);
      assert.equal(saved.equationModes.assistedEvidence, true);
      assert.equal(await page.getByTestId('completion-count').innerText(), '1');
      assert.match(await page.getByTestId('completion').innerText(), /Avec aide/);
    });
    await page.screenshot({ path: dir + '/equation-' + width + '.png', fullPage: true });
    await page.getByTestId('tab-equation-both').click();
    await run('equation with variables on both sides displays exact cancellation and guided result', async () => {
      await page.getByRole('button', { name: 'Animer l’opération' }).click();
      assert.deepEqual(await page.getByTestId('equation-cancel-token').allInnerTexts(), ['2x', '− 2x']);
      assert.deepEqual(await page.getByTestId('equation-combine-token').allInnerTexts(), ['5x', '− 2x']);
      await page.getByRole('button', { name: 'Voir le résultat' }).click();
      assert.match(await page.getByTestId('equation-after').innerText(), /3x − 4 = 8/);
      await page.getByRole('button', { name: 'M’entraîner seul' }).click();
      await page.locator('#equation-answer-qa-equation-both').fill('0');
      await page.getByRole('button', { name: 'Valider', exact: true }).click();
      assert.match(await page.locator('[role=status]').last().innerText(), /ne sont pas égaux/i);
      await page.getByRole('button', { name: /Indice/ }).click();
      assert.match(await page.locator('[role=status]').last().innerText(), /opération sur les deux membres/i);
      await page.locator('#equation-answer-qa-equation-both').fill('4');
      await page.getByRole('button', { name: 'Valider', exact: true }).click();
      assert.match(await page.getByTestId('completion').innerText(), /Avec aide/);
    });
    await page.getByTestId('tab-equation-rational').click();
    await run('negative-coefficient equation accepts equivalent fraction and targeted hints', async () => {
      await checkTouchTargets('[data-testid="equation-decomposition-activity"]');
      await page.getByRole('button', { name: 'M’entraîner seul' }).click();
      await page.getByRole('button', { name: /Indice/ }).click();
      assert.match(await page.locator('[role=status]').last().innerText(), /deux membres/i);
      await page.locator('#equation-answer-qa-equation-rational').fill('-10/4');
      await page.getByRole('button', { name: 'Valider', exact: true }).click();
      assert.match(await page.getByTestId('completion').innerText(), /Avec aide/);
      assert.match(await page.getByText(/Solution vérifiée/).innerText(), /-5\/2/);
    });
    await page.screenshot({ path: dir + '/equation-rational-' + width + '.png', fullPage: true });
    await run('fractional equation shows term cancellation, coefficient division and exact substitution', async () => {
      await page.getByRole('button', { name: 'Comprendre' }).click();
      await page.getByRole('button', { name: 'Animer l’opération' }).click();
      assert.deepEqual(await page.getByTestId('equation-cancel-token').allInnerTexts(), ['+ 3', '− 3']);
      await page.getByRole('button', { name: 'Voir le résultat' }).click();
      await page.getByRole('button', { name: 'Étape suivante' }).click();
      await page.getByRole('button', { name: 'Animer l’opération' }).click();
      assert.deepEqual(await page.getByTestId('equation-cancel-token').allInnerTexts(), ['-2', '÷ (-2)']);
      await page.getByRole('button', { name: 'Voir le résultat' }).click();
      assert.match(await page.getByTestId('equation-after').innerText(), /x = -5\/2/);
      await page.getByRole('button', { name: 'Étape suivante' }).click();
      await page.getByRole('button', { name: 'Animer l’opération' }).click();
      assert.equal(await page.getByTestId('equation-cancel-token').count(), 0);
      assert.ok((await page.getByTestId('equation-terms-left').locator('span').allInnerTexts()).includes('-2 × (-5/2)'));
      await page.getByRole('button', { name: 'Voir le résultat' }).click();
      assert.match(await page.getByTestId('equation-after').innerText(), /8 = 8/);
      assert.match(await page.getByTestId('equation-step-instruction').innerText(), /Ce qu’on obtient.*8 = 8/s);
      assert.equal(await page.getByTestId('equation-term-animation').count(), 0);
      await page.screenshot({ path: dir + '/equation-verification-focused-' + width + '.png', fullPage: true });
    });
    await run('equation term animation respects reduced motion', async () => {
      // The simplified result intentionally hides the animation layer; return to the term stage.
      await page.getByRole('button', { name: 'Précédent' }).click();
      assert.equal(await page.getByTestId('equation-term-animation').count(), 1);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const animation = await page.getByTestId('equation-term-animation').evaluate(el => getComputedStyle(el).animationName);
      assert.equal(animation, 'none');
      await page.emulateMedia({ reducedMotion: 'no-preference' });
    });

    await run('equation independent grading requires no worked solution or hints', async () => {
      await page.getByTestId('tab-equation').click();
      await page.getByTestId('reset').click();
      await page.getByRole('button', { name: 'M’entraîner seul' }).click();
      await page.locator('#equation-answer-qa-equation').fill('5');
      await page.getByRole('button', { name: 'Valider', exact: true }).click();
      assert.match(await page.getByTestId('completion').innerText(), /Indépendant/);
    });
    await page.getByTestId('tab-fit').click();
    await run('line-fit touch targets meet 44px minimum', async () => checkTouchTargets('[data-testid="line-fit-activity"]'));
    await run('fitting data exposes five plotted points and changing error', async () => {
      await page.getByTestId('line-fit-activity').waitFor();
      assert.equal(await page.locator('[data-testid^="data-point-"]').count(), 5);
      const before = await page.getByTestId('fit-error').innerText();
      await page.getByRole('button', { name: 'Valider l’ajustement' }).click();
      assert.match(await page.locator('[role=status]').last().innerText(), /pente|haut ou le bas/i);
      const slope = page.getByRole('slider', { name: 'Pente m' });
      await slope.focus();
      await page.keyboard.press('End');
      for (let i = 0; i < 13; i++) await page.keyboard.press('ArrowLeft');
      const intercept = page.getByRole('slider', { name: 'Départ b' });
      await intercept.focus();
      await page.keyboard.press('End');
      for (let i = 0; i < 16; i++) await page.keyboard.press('ArrowLeft');
      assert.match(await page.getByTestId('fit-equation').innerText(), /1\.7x \+ 1\.4/);
      assert.notEqual(await page.getByTestId('fit-error').innerText(), before);
      await page.getByRole('button', { name: 'Valider l’ajustement' }).click();
      assert.match(await page.getByTestId('completion').innerText(), /Avec aide/);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    });
    await page.screenshot({ path: dir + '/line-fit-' + width + '.png', fullPage: true });
    await run('new animation state retained across tabs', async () => {
      await page.getByTestId('tab-algebra').click();
      assert.match(await page.getByTestId('completion').innerText(), /Avec aide/);
      await page.getByTestId('tab-fit').click();
      assert.match(await page.getByTestId('completion').innerText(), /Avec aide/);
    });
    await run('no runtime errors', async () => assert.deepEqual(jsErrors, []));
  } catch (e) {
    failures++; log('page startup or unhandled failure', 'FAIL', String(e));
    await page.screenshot({ path: dir + '/error-' + width + '.png', fullPage: true }).catch(() => {});
  } finally {
    await context.close();
  }
}
for (const width of [320, 375, 390, 447, 1280]) await runAtWidth(width);
await browser.close();
await fs.writeFile(dir + '/report.json', JSON.stringify({ failures, checks: report }, null, 2));
for (const item of report) console.log(item.result + ' ' + item.viewport + 'px ' + item.test + (item.detail ? ': ' + item.detail : ''));
console.log('TOTAL: ' + report.length + ' checks, ' + failures + ' failures');
if (failures) process.exitCode = 1;
