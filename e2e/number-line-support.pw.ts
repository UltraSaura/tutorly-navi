import { test, expect, ready, assertUsable } from './fixtures';

test('second attempt can succeed without support', async ({ page }) => {
  await ready(page, '/practice/number-line?focus=1');
  const activity = page.getByTestId('number-line-activity');
  const values = activity.getByTestId('number-line-values');
  async function place(label: string, tick: string) {
    await values.getByRole('button', { name: label, exact: true }).click();
    await activity.getByRole('button', { name: `Place at ${tick}`, exact: true }).click();
  }
  await place('1/4', '0,25');
  await place('1/2', '0,75');
  await place('3/4', '0,5');
  await activity.getByRole('button', { name: 'Check answer', exact: true }).click();
  await activity.getByRole('button', { name: 'Try again', exact: true }).click();
  await place('1/2', '0,5');
  await place('3/4', '0,75');
  await activity.getByRole('button', { name: 'Check answer', exact: true }).click();
  await expect(activity.getByText('Solved without help.', { exact: true })).toBeVisible();
  await expect(activity.getByTestId('number-line-support-offer')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Try a fresh example without help', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Next activity', exact: true })).toBeVisible();
});

test('independent retry precedes opt-in guidance and a fresh unaided example', async ({ page }, testInfo) => {
  test.setTimeout(90000);
  await ready(page, '/practice/number-line?focus=1');
  const activity = page.getByTestId('number-line-activity');
  const values = activity.getByTestId('number-line-values');
  const chip = (label: string) => values.getByRole('button', { name: label, exact: true });
  const check = () => activity.getByRole('button', { name: 'Check answer', exact: true }).click();
  const retry = () => activity.getByRole('button', { name: 'Try again', exact: true }).click();
  async function place(label: string, tick: string) {
    await assertUsable(page, chip(label));
    if (testInfo.project.name === 'mobile') await chip(label).tap(); else await chip(label).press('Enter');
    await activity.getByRole('button', { name: `Place at ${tick}`, exact: true }).click();
  }
  async function expectNoItemFeedback() {
    await expect(values).not.toContainText('✓');
    await expect(values.locator('button[aria-pressed="true"]')).toHaveCount(0);
    await expect(activity.getByText('View details', { exact: true })).toHaveCount(0);
    await expect(activity.locator('.bg-emerald-600, .bg-destructive')).toHaveCount(0);
    await expect(activity.getByText('Almost there', { exact: true })).toHaveCount(0);
    await expect(activity.getByTestId('number-line-hint')).toHaveCount(0);
  }
  await place('1/4', '0,25');
  await place('1/2', '0,75');
  await place('3/4', '0,5');
  await check();
  await expectNoItemFeedback();
  await expect(activity.getByTestId('number-line-support-offer')).toHaveCount(0);
  await retry();
  for (const label of ['1/4', '1/2', '3/4']) await expect(chip(label)).toBeEnabled();
  await activity.getByText('Accessibility options', { exact: true }).click();
  await expect(activity.getByLabel('Fallback position for 1/4', { exact: true })).toHaveValue('0.25');
  // Change the previously correct item. Guidance must use the new submitted work.
  await place('1/4', '0,5');
  await place('1/2', '0,5');
  await check();
  await expectNoItemFeedback();
  await expect(activity.getByTestId('number-line-support-offer')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('second-attempt-offer.png'), fullPage: true });
  await activity.getByRole('button', { name: 'Guide me', exact: true }).click();
  await expect(chip('1/2 ✓')).toBeDisabled();
  await expect(chip('1/4 ✓')).toHaveCount(0);
  await expect(activity.getByTestId('number-line-hint')).not.toContainText(/\d|1\/4/);
  await retry();
  await expect(chip('1/2 ✓')).toBeDisabled();
  await expect(chip('1/4')).toBeEnabled();
  await place('1/4', '0,25');
  await place('3/4', '0,75');
  await check();
  await expect(activity.getByText('Solved with help. Try a fresh example without help next.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Try a fresh example without help', exact: true }).click();
  await expect(page.getByTestId('number-line-transfer')).toBeVisible();
  await expect(page.getByTestId('number-line-activity')).toHaveCount(1);
  await expect(chip('1/4')).toHaveCount(0);
  await place('1,25', '1,25');
  await place('1,5', '1,5');
  await place('1,75', '1,75');
  await check();
  await expect(activity.getByText('Solved without help.', { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('fresh-unaided-result.png'), fullPage: true });
  await page.getByRole('button', { name: 'Next activity', exact: true }).click();
  await expect(page.getByText('2 / 4', { exact: true })).toBeVisible();
  await expect(activity.getByTestId('number-line-support-offer')).toHaveCount(0);
});

test('reset invalidates an offer without erasing failure history or help use', async ({ page }) => {
  await ready(page, '/practice/number-line?focus=1');
  const activity = page.getByTestId('number-line-activity');
  const check = () => activity.getByRole('button', { name: 'Check answer', exact: true }).click();
  await activity.getByTestId('number-line-values').getByRole('button', { name: '1/4', exact: true }).click();
  await activity.getByRole('button', { name: 'Place at 0,25', exact: true }).click();
  await check();
  await activity.getByRole('button', { name: 'Try again', exact: true }).click();
  await check();
  await expect(activity.getByTestId('number-line-support-offer')).toBeVisible();
  await activity.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(activity.getByTestId('number-line-support-offer')).toHaveCount(0);
  await expect(activity.getByTestId('number-line-values')).not.toContainText('✓');
  await check();
  await expect(activity.getByTestId('number-line-support-offer')).toBeVisible();
  await activity.getByRole('button', { name: 'Guide me', exact: true }).click();
  await expect(activity.getByTestId('number-line-values')).not.toContainText('✓');
  await activity.getByRole('button', { name: 'Hide hint', exact: true }).click();
  await activity.getByRole('button', { name: 'Try again', exact: true }).click();
  for (const [label, tick] of [['1/4', '0,25'], ['1/2', '0,5'], ['3/4', '0,75']]) {
    await activity.getByTestId('number-line-values').getByRole('button', { name: label, exact: true }).click();
    await activity.getByRole('button', { name: `Place at ${tick}`, exact: true }).click();
  }
  await check();
  await expect(activity.getByText('Solved without help.', { exact: true })).toHaveCount(0);
  await expect(activity.getByText('Solved with help. Try a fresh example without help next.', { exact: true })).toBeVisible();
});
