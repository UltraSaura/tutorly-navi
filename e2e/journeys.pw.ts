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

test('Count the pens adds bundles, then checks a varied count with answer choices', async ({ page }) => {
  await ready(page, '/practice/add-up-to-100');
  const addingPrompt = await page.getByRole('heading', { level: 1 }).innerText();
  const tapsRequired = Number(addingPrompt.match(/Tap \+ (\d+)/)?.[1]);
  expect(tapsRequired).toBeGreaterThan(0);
  const addBundle = page.getByRole('button', { name: 'Add one bundle of ten pens', exact: true });
  await assertUsable(page, addBundle);
  for (let tap = 0; tap < tapsRequired; tap += 1) await addBundle.click();

  await expect(page.getByRole('heading', { name: 'How many pens are there altogether?', exact: true })).toBeVisible();
  const model = page.getByRole('img', { name: 'Picture of pens arranged in bundles of ten and single pens' });
  const bundleCount = await model.locator('[data-testid="pen-bundle"]').count();
  const loosePenCount = await model.locator('[data-testid="single-pens"] svg').count();
  const correctAnswer = bundleCount * 10 + loosePenCount;
  const answers = page.getByRole('group', { name: 'Choose how many pens there are' });
  const answerButtons = await answers.getByRole('button').all();
  expect(answerButtons).toHaveLength(4);
  const answerLabels = await answers.getByRole('button').evaluateAll((buttons) => buttons.map((button) => button.getAttribute('aria-label') ?? ''));
  const wrongAnswer = Number(answerLabels.find((label) => Number(label.split(' ')[0]) !== correctAnswer)?.split(' ')[0]);
  await answers.getByRole('button', { name: `${wrongAnswer} pens`, exact: true }).click();
  await page.getByRole('button', { name: 'Check answer', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Not quite.');
  await page.getByRole('button', { name: 'Try another answer', exact: true }).click();
  await answers.getByRole('button', { name: `${correctAnswer} pens`, exact: true }).click();
  await page.getByRole('button', { name: 'Check answer', exact: true }).click();
  await expect(page.getByRole('heading', { name: `You counted ${correctAnswer} pens.`, exact: true })).toBeVisible();
  await expect(page.getByText(/pens plus/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Try another count', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Try another count', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Add one bundle of ten pens', exact: true })).toBeVisible();
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
