import { test, expect, ready } from './fixtures';

test('guided-family demos are no longer standalone Practice destinations', async ({ page }) => {
  await ready(page, '/practice');
  for (const family of ['word-problems', 'equal-groups', 'colour-grid']) {
    await page.evaluate((nextPath) => {
      window.history.pushState({}, '', nextPath);
      window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
    }, `/practice/guided/${family}`);
    await expect(page).toHaveURL(/\/practice$/);
    await expect(page.getByTestId(/guided-family/)).toHaveCount(0);
  }
  await expect(page.getByRole('button', { name: /Petits problèmes guidés|Groupes égaux|Compter les couleurs/ })).toHaveCount(0);
});
