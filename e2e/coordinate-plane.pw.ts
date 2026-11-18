import { test, expect, ready, assertUsable } from './fixtures';
import { coordinateLearner } from './coordinate-fixture';

test('coordinate practice is hidden and direct access is blocked for an unmapped learner', async ({ page }) => {
  await coordinateLearner(page, 'cm2');
  await ready(page, '/practice');
  await expect(page.getByRole('button', { name: 'Commencer : Coordonnées dans le plan', exact: true })).toHaveCount(0);
  await page.goto('/practice/coordinates');
  await expect(page.getByRole('alert').filter({ hasText: 'uniquement pour le programme français de 5ème' })).toBeVisible();
  await expect(page.getByTestId('coordinate-activity')).toHaveCount(0);
});

test('a different country with the same level cannot open coordinates', async ({ page }) => {
  await coordinateLearner(page, '5eme', 'be');
  await ready(page, '/practice/coordinates');
  await expect(page.getByRole('alert').filter({ hasText: 'uniquement pour le programme français de 5ème' })).toBeVisible();
  await expect(page.getByTestId('coordinate-activity')).toHaveCount(0);
});

test('admin can author coordinates only inside the mapped bank and preserve zero points', async ({ page }) => {
  await coordinateLearner(page, '5eme', 'fr', true);
  let saved: Record<string, unknown> | null = null;
  await page.route('**/rest/v1/quiz_bank_questions**', async route => {
    if (route.request().method() === 'POST') {
      saved = route.request().postDataJSON();
      return route.fulfill({ json: saved, headers: { 'access-control-allow-origin': '*', 'x-tutorly-test-data': 'synthetic' } });
    }
    if (saved) return route.fulfill({ json: [saved], headers: { 'access-control-allow-origin': '*' } });
    return route.fallback();
  });
  await ready(page, '/admin/learning');
  await page.getByRole('tab', { name: 'Quiz Banks', exact: true }).click();
  await page.getByText('QA Coordinates', { exact: true }).click();
  await page.getByRole('button', { name: 'Add Question', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('combobox').first().click();
  await page.getByRole('option', { name: 'Coordonnées dans le plan · France · 5ème', exact: true }).click();
  await expect(page.getByTestId('coordinate-editor')).toContainText('France · 5ème');
  await page.getByLabel('Points', { exact: true }).fill('0');
  await dialog.getByRole('button', { name: 'Add Question', exact: true }).click();
  await expect.poll(() => (saved?.payload as Record<string, unknown> | undefined)?.kind).toBe('coordinate-plane');
  expect((saved!.payload as Record<string, unknown>).schoolLevels).toEqual(['5eme']);
  expect((saved!.payload as Record<string, unknown>).curriculumCountry).toBe('fr');
  expect((saved!.payload as Record<string, unknown>).points).toBe(0);
});

test('admin editor disables the type for an out-of-level topic', async ({ page }) => {
  await coordinateLearner(page, 'cm2', 'fr', true);
  await ready(page, '/admin/learning');
  await page.getByRole('tab', { name: 'Quiz Banks', exact: true }).click();
  await page.getByText('QA Coordinates', { exact: true }).click();
  await page.getByRole('button', { name: 'Add Question', exact: true }).click();
  await page.getByRole('dialog').getByRole('combobox').first().click();
  await expect(page.getByRole('option', { name: 'Coordonnées dans le plan · France · 5ème', exact: true })).toHaveAttribute('aria-disabled', 'true');
});

test('eligible learner can read and plot, retry independently, request guidance and complete', async ({ page }, testInfo) => {
  test.setTimeout(90000);
  await coordinateLearner(page);
  await page.addInitScript(() => { Math.random = () => 0.5; });
  await ready(page, '/practice');
  await page.getByRole('button', { name: 'Commencer : Coordonnées dans le plan', exact: true }).click();
  const activity = page.getByTestId('coordinate-activity');
  await expect(activity).toBeVisible();
  const x = activity.getByRole('spinbutton', { name: 'x-coordinate', exact: true });
  const y = activity.getByRole('spinbutton', { name: 'y-coordinate', exact: true });
  // Deterministic generator gives A(3,4), without printing that answer for reading.
  await expect(activity).not.toContainText('(3');
  await x.fill('3'); await y.fill('2');
  await activity.getByRole('button', { name: 'Check answer', exact: true }).click();
  await expect(activity).not.toContainText('correct and kept');
  await expect(activity.getByTestId('coordinate-support-offer')).toHaveCount(0);
  await activity.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(x).toBeEnabled(); await expect(y).toHaveValue('2');
  await activity.getByRole('button', { name: 'Check answer', exact: true }).click();
  await activity.getByRole('button', { name: 'Guide me', exact: true }).click();
  await expect(activity.getByTestId('coordinate-hint')).not.toContainText(/\d/);
  await activity.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(x).toBeDisabled(); await expect(y).toBeEnabled();
  await y.fill('4');
  await activity.getByRole('button', { name: 'Check answer', exact: true }).press('Enter');
  await expect(page.getByTestId('coordinate-complete')).toContainText('Solved with help.');
  await expect(page.getByText('Score de cet exercice : 0.25 / 1', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Essayer un nouvel exemple sans aide', exact: true }).click();
  await x.fill('4'); await y.fill('5');
  await activity.getByRole('button', { name: 'Check answer', exact: true }).click();
  await expect(page.getByTestId('coordinate-complete')).toContainText('Solved without help.');
  await page.getByRole('button', { name: 'Placer un point', exact: true }).click();
  await assertUsable(page, x);
  // Exercise the actual SVG hit testing, then the keyboard alternative.
  const grid = activity.getByRole('img');
  const bounds = await grid.boundingBox();
  const position = { x: (44 + 3 / 6 * 282) / 360 * bounds!.width, y: (268 - 4 / 6 * 240) / 310 * bounds!.height };
  if (testInfo.project.name === 'mobile') await grid.tap({ position }); else await grid.click({ position });
  await expect(x).toHaveValue('3'); await expect(y).toHaveValue('4');
  await x.fill('3'); await y.fill('4');
  await page.screenshot({ path: testInfo.outputPath('coordinate-plot.png'), fullPage: true });
  await activity.getByRole('button', { name: 'Check answer', exact: true }).click();
  await expect(page.getByTestId('coordinate-complete')).toBeVisible();
});
