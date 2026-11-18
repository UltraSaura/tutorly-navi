import { test, expect, ready, assertUsable } from './fixtures';

test('number line keeps correct work through placement, reading and ordering retries', async ({ page }, testInfo) => {
  test.setTimeout(90000);
  await ready(page, '/practice');
  await page.locator('section').filter({ has: page.getByRole('heading', { name: 'Demi-droite graduée', exact: true }) }).getByRole('button').click();
  const activity = page.getByTestId('number-line-activity');
  const chip = (label: string) => activity.getByTestId('number-line-values').getByRole('button', { name: label, exact: true });
  async function place(label: string, tick: string) {
    await assertUsable(page, chip(label));
    if (testInfo.project.name === 'mobile') await chip(label).tap(); else await chip(label).press('Enter');
    await activity.getByRole('button', { name: `Place at ${tick}`, exact: true }).click();
  }
  const check = () => activity.getByRole('button', { name: 'Check answer', exact: true }).click();
  const retry = () => activity.getByRole('button', { name: 'Try again', exact: true }).click();
  const next = () => page.getByRole('button', { name: 'Next activity', exact: true }).click();

  await activity.getByRole('button', { name: 'Show hint', exact: true }).click();
  await expect(activity.getByTestId('number-line-hint')).not.toContainText(/\d|1\/4/);
  await activity.getByRole('button', { name: 'Hide hint', exact: true }).click();
  await place('1/4', '0,25');
  await place('1/2', '0,75');
  await place('3/4', '0,5');
  await expect(chip('1/4')).not.toBeDisabled();
  await expect(chip('1/4 ✓')).toHaveCount(0);
  await check();
  await expect(chip('1/4 ✓')).toBeDisabled();
  await retry();
  await expect(chip('1/4 ✓')).toBeDisabled();
  await place('1/2', '0,5');
  await place('3/4', '0,75');
  await check();
  await next();
  await place('5/4', '1,25');
  await place('7/4', '1,75');
  await check();
  await next();

  // Reading must not reveal the point's value in an accessible label or error detail.
  await expect(activity.locator('[aria-label="A: 1/4"]')).toHaveCount(0);
  await page.getByRole('textbox', { name: 'A value', exact: true }).fill('0,25');
  await page.getByRole('textbox', { name: 'B value', exact: true }).fill('1/2');
  await check();
  await expect(page.getByRole('textbox', { name: 'A value', exact: true })).toBeDisabled();
  await expect(activity.getByText('View details', { exact: true })).toHaveCount(0);
  await retry();
  await expect(page.getByRole('textbox', { name: 'A value', exact: true })).toBeEnabled();
  await check();
  await activity.getByRole('button', { name: 'Guide me', exact: true }).click();
  await activity.getByText('View details', { exact: true }).click();
  await expect(activity.getByLabel('Ordering feedback')).not.toContainText('3/4');
  await retry();
  await expect(page.getByRole('textbox', { name: 'A value', exact: true })).toHaveValue('0,25');
  await expect(page.getByRole('textbox', { name: 'A value', exact: true })).toBeDisabled();
  await page.getByRole('textbox', { name: 'B value', exact: true }).fill('0.75');
  await check();
  await next();

  // The old retry reshuffled all labels. Now only the unresolved labels need work.
  await place('0,25', '0,25');
  await check();
  await retry();
  await expect(chip('0,25')).toBeEnabled();
  await check();
  await activity.getByRole('button', { name: 'Guide me', exact: true }).click();
  await retry();
  await expect(chip('0,25 ✓')).toBeDisabled();
  await place('1/2', '0,5');
  await place('0,75', '0,75');
  await place('1', '1');
  await check();
  await expect(page.getByText('All activities completed.', { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('number-line-complete.png'), fullPage: true });
  await page.getByRole('button', { name: 'Start again', exact: true }).click();
  await expect(page.getByText('1 / 4', { exact: true })).toBeVisible();
  await expect(chip('1/4')).toBeEnabled();
});
