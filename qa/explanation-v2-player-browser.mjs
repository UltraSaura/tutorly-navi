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
      assert.ok(rect && rect.height >= 44 && rect.y + rect.height <= 860, `prerequisite button must be at least 44px tall and fully visible: ${JSON.stringify(rect)}`);
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
    for (const kind of ['fraction-select', 'fraction-bar', 'coordinate-plane', 'algebra-tiles', 'linear-function', 'line-fit', 'equation-decomposition']) {
      await check(`V2.1 path renders the ${kind} activity fixture`, async () => {
        await page.getByRole('button', { name: `Fixture V2.1 ${kind}`, exact: true }).click();
        await page.getByText('Niveau 1 sur 1', { exact: true }).waitFor();
        await page.getByRole('button', { name: new RegExp(`Fixture ${kind}`) }).click();
        const answer = page.getByRole('textbox', { name: 'Réponse au prérequis' });
        await answer.waitFor();
        await answer.fill('4');
        await page.getByRole('button', { name: 'Valider', exact: true }).click();
        const testId = {
          'fraction-select': 'fraction-select-activity',
          'fraction-bar': 'fraction-bar-activity',
          'coordinate-plane': 'coordinate-plane-activity',
          'algebra-tiles': 'algebra-tiles-activity',
          'linear-function': 'linear-function-activity',
          'line-fit': 'line-fit-activity',
          'equation-decomposition': 'equation-decomposition-activity',
        }[kind];
        await page.getByTestId(testId).waitFor();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
        await page.getByRole('button', { name: 'Retour', exact: true }).click();
      });
    }
    await check('complete four-level V2.1 CM2 path preserves mastery gates and transfer', async () => {
      if (width === 320) await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.getByRole('button', { name: 'Fixture CM2 V2.1', exact: true }).click();
      if (width === 320) assert.equal(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), true);
      await page.getByText('Niveau 1 sur 4', { exact: true }).waitFor();
      const levelTwo = page.getByRole('button', { name: /Partager chaque moitié en deux quarts/ });
      assert.equal(await levelTwo.isDisabled(), true, 'later levels remain locked before mastery');
      const answerMastery = async (question, choiceIndex = 0) => {
        const card = page.getByRole('heading', { name: question }).locator('..');
        await card.getByRole('button').nth(choiceIndex).click();
        await card.getByRole('button', { name: 'Valider', exact: true }).click();
      };
      const finishLevel = async () => {
        await page.getByRole('button', { name: 'Terminer', exact: true }).click();
        await page.getByRole('heading', { name: 'Leçon terminée' }).waitFor();
        await page.getByRole('button', { name: 'Retour' }).click();
      };
      const openLevel = async (title) => page.getByRole('button', { name: title }).click();
      const answerShortPrerequisite = async (answer) => {
        await page.getByRole('textbox', { name: 'Réponse au prérequis' }).fill(answer);
        await page.getByRole('button', { name: 'Valider', exact: true }).click();
      };
      const completeSelection = async (baseParts, transferParts) => {
        await page.getByTestId('fraction-select-activity').waitFor();
        for (const i of baseParts) {
          const part = page.getByTestId(`fraction-part-${i}`);
          if (i === baseParts[0] && width === 375) {
            await part.focus();
            await page.keyboard.press('Enter');
          } else if (i === baseParts[0] && width === 390) {
            const box = await part.boundingBox();
            assert.ok(box, 'touch target is visible');
            await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
          } else await part.click();
        }
        await page.getByRole('button', { name: 'Valider', exact: true }).click();
        await page.getByRole('button', { name: 'Le dénominateur partage le tout en parts égales; le numérateur indique combien de parts on prend.' }).click();
        await page.getByRole('button', { name: 'Vérifier mon explication' }).click();
        for (const i of transferParts) await page.getByTestId(`fraction-part-${i}`).click();
        await page.getByRole('button', { name: 'Valider', exact: true }).click();
      };
      const completeAddition = async (activityId, conversion, total, transfer) => {
        await page.locator(`#fraction-answer-${activityId}`).fill(String(conversion));
        await page.getByRole('button', { name: 'Valider', exact: true }).click();
        await page.locator(`#fraction-answer-${activityId}`).fill(String(total));
        await page.getByRole('button', { name: 'Valider', exact: true }).click();
        await page.locator(`#fraction-transfer-answer-${activityId}`).fill(transfer);
        await page.getByRole('button', { name: 'Valider le transfert', exact: true }).click();
      };
      await page.getByRole('button', { name: /Reconnaître les parts d’une fraction/ }).click();
      const prerequisiteCard = page.getByRole('heading', { name: 'Une barre est-elle partagée en parts égales ?' }).locator('..');
      await prerequisiteCard.getByRole('button').filter({ hasText: 'Oui, chaque part a la même longueur' }).click();
      await prerequisiteCard.getByRole('button', { name: 'Valider', exact: true }).click();
      await page.getByRole('button', { name: 'Continuer', exact: true }).click();
      await completeSelection([0, 1, 2], [0, 1]);
      await page.getByRole('button', { name: 'Continuer', exact: true }).click();
      await answerMastery(/Dans/, 1);
      await finishLevel();
      assert.equal(await levelTwo.isDisabled(), false, 'a successful mastery check unlocks the next level');
      await openLevel(/Partager chaque moitié en deux quarts/);
      const secondPrerequisite = page.getByRole('heading', { name: /Dans une moitié/ }).locator('..');
      await secondPrerequisite.getByText('2', { exact: true }).last().click();
      await secondPrerequisite.getByRole('button', { name: 'Valider', exact: true }).click();
      await page.getByRole('button', { name: 'Continuer', exact: true }).click();
      await page.getByRole('button', { name: 'Continuer', exact: true }).click();
      await page.getByRole('button', { name: 'Continuer', exact: true }).click();
      await completeSelection([0, 1], [0]);
      await page.getByRole('button', { name: 'Continuer', exact: true }).click();
      await answerMastery(/Quelle fraction représente/);
      await finishLevel();

      await openLevel(/Additionner des quarts de même taille/);
      const thirdPrerequisite = page.getByRole('heading', { name: /Combien de quarts représentent une moitié/ }).locator('..');
      await thirdPrerequisite.getByText('2', { exact: true }).last().click();
      await thirdPrerequisite.getByRole('button', { name: 'Valider', exact: true }).click();
      await page.getByRole('button', { name: 'Continuer', exact: true }).click();
      await completeAddition('cm2-fraction-add-3-4-plus-1-2', 2, 5, '3/4');
      await page.getByRole('button', { name: 'Continuer', exact: true }).click();
      await answerMastery(/Pourquoi peut-on additionner/);
      await page.getByRole('button', { name: 'Continuer', exact: true }).click();
      await answerMastery(/Combien vaut/);
      await finishLevel();

      await openLevel(/Résoudre un nouveau calcul et expliquer le résultat/);
      await answerShortPrerequisite('Que les parts ont la même taille');
      await completeAddition('cm2-fraction-transfer-2-4-plus-1-4', 1, 3, '3/4');
      await page.getByRole('button', { name: 'Continuer', exact: true }).click();
      await page.getByRole('button', { name: 'Continuer', exact: true }).click();
      await answerMastery(/Pour résoudre/);
      await finishLevel();
      await page.getByText('✓ Parcours terminé', { exact: true }).waitFor();
      if (width === 375 || width === 1280) await page.screenshot({ path: dir + '/v21-cm2-complete-' + width + '.png', fullPage: true });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
      assert.deepEqual(errors, []);
    });
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
