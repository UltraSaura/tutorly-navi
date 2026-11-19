import { test, expect, ready } from './fixtures';

test('number-line demo redirects to the Practice catalogue', async ({ page }) => {
  await ready(page, '/practice');
  await page.evaluate(() => {
    window.history.pushState({}, '', '/practice/number-line');
    window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
  });
  await expect(page).toHaveURL(/\/practice$/);
  await expect(page.getByTestId('number-line-activity')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Demi-droite graduée/ })).toHaveCount(0);
});
