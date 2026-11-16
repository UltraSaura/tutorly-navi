import { expect, test, type Locator, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const route = '/dev/stuwy-explain-v2';
const evidenceDir = path.resolve('docs/qa/artifacts/t11.13c');
const transfer = [
  { answer: '9', question: '16 − 7', prerequisite: '10 + 6', prepare: '16' },
  { answer: '6', question: '12 − 6', prerequisite: '5 + 1', prepare: '6' },
  { answer: '1', question: '3 − 2', prerequisite: '1 + 1', prepare: '2' },
  { answer: '169', question: '326 − 157', prerequisite: '100 + 60', prepare: '160' },
] as const;
const consoleResults: Array<{ scenario: string; status?: string; errors: string[] }> = [];

test.beforeAll(() => fs.mkdirSync(evidenceDir, { recursive: true }));

test.beforeEach(async ({ page }) => {
  const diagnostics: string[] = [];
  page.on('console', message => {
    if (message.type() === 'error') diagnostics.push(`console: ${message.text()}`);
  });
  page.on('pageerror', error => diagnostics.push(`pageerror: ${error.message}`));
  (page as Page & { __diagnostics?: string[] }).__diagnostics = diagnostics;
  await page.addInitScript(() => {
    localStorage.setItem('lang', 'fr');
    localStorage.setItem('countryDetected', 'true');
  });
  const response = await page.goto(route);
  expect(response?.status()).toBe(200);
  await expect(page.getByTestId('interactive-student-session')).toBeVisible();
});

test.afterEach(async ({ page }, testInfo) => {
  const diagnostics = (page as Page & { __diagnostics?: string[] }).__diagnostics ?? [];
  consoleResults.push({ scenario: testInfo.title, status: testInfo.status, errors: diagnostics });
  await testInfo.attach('browser-console-errors', {
    body: JSON.stringify(diagnostics, null, 2),
    contentType: 'application/json',
  });
});

test.afterAll(() => {
  fs.writeFileSync(path.join(evidenceDir, 'browser-console-errors.json'), JSON.stringify(consoleResults, null, 2));
});

const session = (page: Page) => page.getByTestId('interactive-student-session');
const answerField = (page: Page) => session(page).getByRole('textbox', { name: 'Ta réponse' });
const submitButton = (page: Page) => session(page).getByRole('button', { name: 'Valider ma réponse' });

async function submitAnswer(page: Page, answer: string) {
  await answerField(page).fill(answer);
  await submitButton(page).click();
}

async function reachTransferWithoutAnimation(page: Page) {
  const s = session(page);
  await s.getByRole('button', { name: 'J’ajoute 10 unités en haut et 1 dizaine en bas' }).click();
  await submitButton(page).click();
  for (const answer of ['10', '15', '7', '5', '12', '7', '1', '177']) {
    await submitAnswer(page, answer);
  }
  await expect(s.getByTestId('active-question')).toContainText('16 − 7');
}

async function advanceCorrectTransferStage(page: Page, answer: string) {
  await submitAnswer(page, answer);
  await expect(session(page).getByRole('status')).toBeVisible();
  await expect(session(page).getByRole('button', { name: 'Suivant', exact: true })).toBeEnabled();
  await session(page).getByRole('button', { name: 'Suivant', exact: true }).click();
}

async function screenshot(page: Page, name: string, target: Locator = session(page)) {
  await target.screenshot({ path: path.join(evidenceDir, `${name}.png`), animations: 'disabled' });
}

test('Scenario A — correct answers advance directly without opening Animation', async ({ page }) => {
  const s = session(page);
  await expect(s.getByRole('tab', { name: 'Mon professeur' })).toHaveAttribute('data-state', 'active');
  await s.getByRole('button', { name: 'J’ajoute 10 unités en haut et 1 dizaine en bas' }).click();
  await submitButton(page).click();
  await expect(s.getByTestId('active-question')).toContainText('Une dizaine');
  await expect(answerField(page)).toHaveValue('');
  await submitAnswer(page, '10');
  await expect(s.getByTestId('active-question')).toContainText('Si on ajoute 10 unités aux 5 unités du haut');
  await expect(s.getByRole('tab', { name: 'Animation' })).toHaveAttribute('data-state', 'inactive');
  await screenshot(page, 'scenario-a-automatic-progression');
});

test('Scenario B — reversed subtraction correction and retry at every application step', async ({ page }) => {
  const s = session(page);
  await s.getByRole('button', { name: 'Je calcule 8 moins 5' }).click();
  await submitButton(page).click();
  await expect(s.getByTestId('pedagogical-correction')).toContainText('on part donc de 5 et on enlève 8');
  await expect(s.getByTestId('pedagogical-correction')).toContainText('on change le calcul');
  await screenshot(page, 'scenario-b-why-correction');
  await s.getByRole('button', { name: 'Voir la méthode sur l’opération' }).click();
  await s.getByRole('button', { name: 'À moi d’essayer un autre calcul' }).click();
  for (const stage of transfer) {
    await expect(s.getByTestId('active-question')).toContainText(stage.question);
    await submitAnswer(page, '999');
    await expect(s.getByRole('status')).toContainText(/Vérifie|Pas encore|Relis/);
    await screenshot(page, `scenario-b-retry-${stage.question.replace(/\s/g, '')}-feedback`);
    await expect(s.getByRole('button', { name: 'Réessayer' })).toBeVisible();
    await s.getByRole('button', { name: 'Réessayer' }).click();
    await expect(answerField(page)).toBeVisible();
    await submitAnswer(page, stage.answer);
    await expect(s.getByRole('status')).toBeVisible();
    await s.getByRole('button', { name: 'Suivant', exact: true }).click();
  }
  await expect(s.getByText('Séance terminée')).toBeVisible();
});

test('Scenario C — successive hints become more specific without revealing the answer', async ({ page }) => {
  await reachTransferWithoutAnimation(page);
  const s = session(page);
  await s.getByRole('button', { name: 'Un indice' }).click();
  const firstHint = await s.getByRole('status').innerText();
  expect(firstHint).toContain('6 en 16');
  expect(firstHint).not.toContain('9');
  await screenshot(page, 'scenario-c-hint-one');
  await s.getByRole('button', { name: 'Un indice' }).click();
  const secondHint = await s.getByRole('status').innerText();
  expect(secondHint).toContain('16 − 7');
  expect(secondHint).not.toContain('= 9');
  await screenshot(page, 'scenario-c-hint-two');
  await s.getByRole('button', { name: 'Un indice' }).click();
  await expect(s.getByRole('button', { name: 'À moi d’essayer un autre calcul' })).toBeVisible();
  await expect(answerField(page)).toHaveCount(0);
  await screenshot(page, 'scenario-c-supported-demonstration');
});

test('Scenario D — repeated errors trigger each matching prerequisite and resume the same stage', async ({ page }) => {
  await reachTransferWithoutAnimation(page);
  const s = session(page);
  for (const stage of transfer) {
    await submitAnswer(page, '999');
    await expect(s.getByRole('button', { name: 'Réessayer' })).toBeVisible();
    await s.getByRole('button', { name: 'Réessayer' }).click();
    await submitAnswer(page, '999');
    await expect(s.getByRole('button', { name: 'À moi d’essayer un autre calcul' })).toBeVisible();
    await s.getByRole('button', { name: 'À moi d’essayer un autre calcul' }).click();
    await submitAnswer(page, '999');
    await expect(s.getByTestId('active-question')).toContainText(stage.prerequisite);
    await screenshot(page, `scenario-d-prerequisite-${stage.question.replace(/\s/g, '')}`);
    await submitAnswer(page, stage.prepare);
    await expect(s.getByTestId('active-question')).toContainText(stage.question);
    await expect(answerField(page)).toHaveValue('');
    await submitAnswer(page, stage.answer);
    await expect(s.getByRole('button', { name: 'Suivant', exact: true })).toBeEnabled();
    await s.getByRole('button', { name: 'Suivant', exact: true }).click();
  }
  await expect(s.getByText('Séance terminée')).toBeVisible();
});

test('Scenario E — complete 326 − 157 with 9 → 6 → 1 → 169', async ({ page }) => {
  await reachTransferWithoutAnimation(page);
  const s = session(page);
  for (let index = 0; index < transfer.length; index += 1) {
    const stage = transfer[index];
    await expect(s.getByTestId('active-question')).toContainText(stage.question);
    await submitAnswer(page, stage.answer);
    await expect(s.getByRole('status')).toBeVisible();
    if (index === transfer.length - 1) {
      await expect(s.getByRole('status')).toContainText('326 − 157 = 169');
    }
    await screenshot(page, `scenario-e-${['units', 'tens', 'hundreds', 'final'][index]}`);
    await s.getByRole('button', { name: 'Suivant', exact: true }).click();
  }
  await expect(s.getByText('Séance terminée')).toBeVisible();
  await screenshot(page, 'scenario-e-completed');
});

test('Scenario F — Animation tab exposes the original TwoCards stepper controls', async ({ page }) => {
  const s = session(page);
  await s.getByRole('tab', { name: 'Animation' }).click();
  const animation = s.getByTestId('animation-tab');
  await expect(animation).toBeVisible();
  await expect(animation).toContainText('325');
  await expect(animation).toContainText('− 8');
  await expect(animation.getByRole('button', { name: 'Read Aloud' })).toBeVisible();
  await expect(animation.getByRole('button', { name: 'Auto-read: off' })).toBeVisible();
  const controls = animation.locator('button');
  await expect(controls).toHaveCount(7); // original narration, four stepper controls, and tab-return
  expect(await controls.nth(2).isDisabled()).toBe(true); // original Previous control
  await controls.nth(4).click(); // original Next control
  await expect(controls.nth(2)).toBeEnabled();
  await controls.nth(2).click();
  await screenshot(page, 'scenario-f-original-animation');
});

test('Scenario G — switching tabs preserves the active question and typed response', async ({ page }) => {
  const s = session(page);
  await s.getByRole('button', { name: 'J’ajoute 10 unités en haut et 1 dizaine en bas' }).click();
  await submitButton(page).click();
  await answerField(page).fill('10');
  await s.getByRole('tab', { name: 'Animation' }).click();
  await s.getByRole('tab', { name: 'Mon professeur' }).click();
  await s.getByRole('tab', { name: 'Animation' }).click();
  await s.getByRole('tab', { name: 'Mon professeur' }).click();
  await expect(s.getByTestId('active-question')).toContainText('Une dizaine');
  await expect(answerField(page)).toHaveValue('10');
  await submitButton(page).click();
  await expect(s.getByTestId('active-question')).toContainText('Si on ajoute 10 unités');
  await screenshot(page, 'scenario-g-persisted-progress');
});

for (const viewport of [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile-375', width: 375, height: 812 },
  { name: 'mobile-447', width: 447, height: 956 },
]) {
  test(`Scenario H — responsive student controls at ${viewport.width} × ${viewport.height}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const s = session(page);
    await s.scrollIntoViewIfNeeded();
    await expect(answerField(page)).toBeVisible();
    await expect(submitButton(page)).toBeVisible();
    const sizes = await s.evaluate(element => ({
      client: element.clientWidth,
      scroll: element.scrollWidth,
      x: element.getBoundingClientRect().x,
      right: element.getBoundingClientRect().right,
    }));
    expect(sizes.scroll).toBeLessThanOrEqual(sizes.client + 1);
    expect(sizes.x).toBeGreaterThanOrEqual(0);
    expect(sizes.right).toBeLessThanOrEqual(viewport.width + 1);
    const inputBox = await answerField(page).boundingBox();
    const submitBox = await submitButton(page).boundingBox();
    expect(inputBox?.width).toBeGreaterThanOrEqual(200);
    expect(submitBox?.height).toBeGreaterThanOrEqual(40);
    await screenshot(page, `scenario-h-${viewport.name}`);
    await page.screenshot({ path: path.join(evidenceDir, `scenario-h-viewport-${viewport.name}.png`), animations: 'disabled' });
  });
}
