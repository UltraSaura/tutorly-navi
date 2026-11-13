import { test, expect, ready, assertUsable } from './fixtures';

// Every request to hosted Supabase is intercepted with clearly synthetic data.
// The interactions below execute the actual production application and components.
test('startup and navigation', async ({ page }) => {
  await ready(page, '/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('AI-Powered Education');
  const signIn = page.getByRole('link', { name: 'Sign In / Register' });
  await assertUsable(page, signIn);
  await signIn.click();
  await expect(page).toHaveURL(/\/auth$/);
  await expect(page.getByLabel('Username or Email')).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
});

test('authentication validation and reset navigation without credentials', async ({ page }) => {
  await ready(page, '/auth');
  const submit = page.getByRole('button', { name: 'Sign In', exact: true });
  await assertUsable(page, submit);
  await submit.click();
  await expect(page.getByText('Username or email is required', { exact: true })).toBeVisible();
  await expect(page.getByText('Password is required', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Forgot Password?' }).click();
  await expect(page.getByLabel('Email', { exact: true })).toBeVisible();
});

test('language switching updates visible content and persists preference', async ({ page }) => {
  await ready(page, '/');
  const language = page.getByRole('button', { name: /English/ });
  await assertUsable(page, language);
  await language.click();
  await page.getByRole('menuitem', { name: /Français/ }).click();
  await expect(page.getByRole('link', { name: 'Connexion / Inscription' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  expect(await page.evaluate(() => localStorage.getItem('lang'))).toBe('fr');
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByRole('link', { name: 'Connexion / Inscription' })).toBeVisible();
});

test('practice answer submission, incorrect feedback, retry and progress', async ({ page }) => {
  await ready(page, '/practice/number-line?focus=1');
  await expect(page.getByText('1 / 4', { exact: true })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Choose a position on the graduated number line' })).toBeVisible();
  const check = page.getByRole('button', { name: 'Check answer', exact: true });
  await assertUsable(page, check);
  for (const [fraction, tick] of [['1/4', '0,5'], ['1/2', '0,75'], ['3/4', '0,25']]) {
    await page.getByRole('button', { name: fraction, exact: true }).click();
    await page.getByRole('button', { name: `Place at ${tick}`, exact: true }).click();
  }
  await check.click();
  await expect(page.getByRole('status').filter({ hasText: 'Not yet' })).toBeVisible();
  await expect(page.getByText('Some labels are not on the right graduation.', { exact: true })).toBeVisible();
  await expect(page).toHaveScreenshot('practice-wrong-answer.png', { fullPage: true });
  await expect(page.getByRole('button', { name: 'Next activity', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await assertUsable(page, page.getByRole('button', { name: 'Place at 0,25', exact: true }));
  for (const [fraction, tick] of [['1/4', '0,25'], ['1/2', '0,5'], ['3/4', '0,75']]) {
    await page.getByRole('button', { name: `${fraction} ✓`, exact: true }).click();
    await page.getByRole('button', { name: `Place at ${tick}`, exact: true }).click();
  }
  await check.click();
  await expect(page.getByRole('status').filter({ hasText: 'Good job' })).toBeVisible();
  const next = page.getByRole('button', { name: 'Next activity', exact: true });
  await assertUsable(page, next);
  await next.click();
  await expect(page.getByText('2 / 4', { exact: true })).toBeVisible();
  await expect(page.getByText('Placer des fractions supérieures à 1', { exact: true })).toBeVisible();
});

test('Add up to 100 adds three groups, then offers selectable answers', async ({ page }) => {
  await ready(page, '/practice/add-up-to-100');
  await page.getByRole('button', { name: 'Start the check', exact: true }).click();

  const addTen = page.getByRole('button', { name: 'Add one group of ten', exact: true });
  await assertUsable(page, addTen);
  for (let tap = 0; tap < 3; tap += 1) await addTen.click();

  await expect(page.getByRole('heading', { name: 'What number is that?', exact: true })).toBeVisible();
  await expect(page.locator('[role="img"][aria-label="Countable dots arranged as 3 groups of ten and 0 ones"]')).toBeVisible();
  const answers = page.getByRole('group', { name: 'Choose an answer' });
  await expect(answers.getByRole('button')).toHaveText(['30', '40', '50', '300']);
  await answers.getByRole('button', { name: '40', exact: true }).click();
  await page.getByRole('button', { name: 'Check answer', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Not quite yet.');

  await page.getByRole('button', { name: 'Retry this step', exact: true }).click();
  await answers.getByRole('button', { name: '30', exact: true }).click();
  await page.getByRole('button', { name: 'Check answer', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Three groups of ten make 30.');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'What is 30 + 30?', exact: true })).toBeVisible();

  for (const [prompt, answer] of [
    ['What is 30 + 30?', '60'],
    ['What number is 60 + 7?', '67'],
    ['What do you add to 67 to make 100?', '33'],
    ['Solve 45 + 7.', '52'],
  ]) {
    await expect(page.getByRole('heading', { name: prompt, exact: true })).toBeVisible();
    const answerChoices = page.getByRole('group', { name: 'Choose an answer' });
    await answerChoices.getByRole('button', { name: answer, exact: true }).click();
    await page.getByRole('button', { name: 'Check answer', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('That’s right.');
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
  }
  await expect(page.getByRole('heading', { name: 'Recall check complete', exact: true })).toBeVisible();
});

test('synthetic published lesson navigation and diagram rendering', async ({ page }) => {
  await ready(page, '/learning/mathematiques?focus=1');
  const theme = page.getByTestId('lesson-theme-tile');
  await expect(theme).toHaveCount(1);
  await expect(theme).toContainText('Aires');
  await theme.click();
  await expect(page).toHaveURL(/\/learning\/mathematiques\/theme\/aires$/);
  await page.getByRole('button', { name: 'Leçon 1', exact: true }).click();
  await expect(page.getByText('Avant de commencer', { exact: true })).toBeVisible();
  await page.getByLabel('Réponse au prérequis', { exact: true }).fill('oui');
  await page.getByRole('button', { name: 'Valider', exact: true }).click();
  await expect(page.getByText('Rectangle — synthetic fixture', { exact: true })).toBeVisible();
  await expect(page.getByRole('img', { name: 'rectangle géométrique', exact: true })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Synthetic rectangle ABCD', exact: true })).toHaveScreenshot('lesson-diagram.png');
  await expect(page.getByText('AB = 6 cm', { exact: true })).toBeVisible();
  await assertUsable(page, page.getByRole('button', { name: 'Terminer', exact: true }));
  await page.getByRole('button', { name: 'Terminer', exact: true }).click();
  await expect(page.getByText('Leçon terminée', { exact: true })).toBeVisible();
});

test('visual home and accessible language control', async ({ page }) => {
  await ready(page, '/');
  await assertUsable(page, page.getByRole('button', { name: /English/ }));
  const overlap = await page.getByRole('button', { name: /English/ }).evaluate((element) => {
    const badge = document.querySelector('[data-testid=staging-environment-indicator]');
    if (!badge) return false;
    const a = element.getBoundingClientRect(); const b = badge.getBoundingClientRect();
    return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  });
  expect(overlap, 'Environment badge overlaps the language selector').toBe(false);
  await expect(page).toHaveScreenshot('home.png', { fullPage: true });
});

test('visual authentication form', async ({ page }) => {
  await ready(page, '/auth');
  await assertUsable(page, page.getByLabel('Username or Email'));
  await expect(page).toHaveScreenshot('auth.png', { fullPage: true });
});

test('visual practice diagram and answer controls', async ({ page }) => {
  await ready(page, '/practice/number-line?focus=1');
  await assertUsable(page, page.getByRole('button', { name: 'Check answer', exact: true }));
  await expect(page).toHaveScreenshot('practice.png', { fullPage: true });
});
