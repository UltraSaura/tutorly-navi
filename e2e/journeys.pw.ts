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

test('reusable counting exercise adds groups, checks answers, and accepts another object', async ({ page }, testInfo) => {
  await ready(page, '/practice/add-up-to-100');
  const addingPrompt = await page.getByRole('heading', { level: 1 }).innerText();
  expect(addingPrompt).toMatch(/Start with \d+ \w+\. Add \d+ groups? of ten\./);
  const tapsRequired = Number(addingPrompt.match(/Add (\d+) groups? of ten/)?.[1]);
  const addGroup = page.getByRole('button', { name: /^Add one group of ten / });
  await assertUsable(page, addGroup);

  const model = page.getByRole('img', { name: /^Picture of / });
  const objectDescription = await model.getAttribute('aria-label') ?? '';
  const object = objectDescription.match(/^Picture of (\w+)/)?.[1];
  expect(object).toBeTruthy();
  const initialGroupCount = await model.locator('[data-testid="countable-group"]').count();
  const hint = page.getByRole('button', { name: 'Show hint', exact: true });
  await hint.click();
  await expect(page.getByText('Each outlined group has ten. Count the single ones, then count on the groups you added.')).toBeVisible();
  await page.getByRole('button', { name: 'Hide hint', exact: true }).click();

  await addGroup.focus();
  await page.keyboard.press('Enter');
  await expect(model.locator('[data-testid="countable-group"]')).toHaveCount(initialGroupCount + 1);
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByRole('img', { name: /^Picture of / }).locator('[data-testid="countable-group"]')).toHaveCount(initialGroupCount + 1);
  const remainingGroups = tapsRequired - 1;
  const continueAdding = page.getByRole('button', { name: /^Add one group of ten / });
  for (let tap = 0; tap < remainingGroups; tap += 1) {
    if (testInfo.project.name === 'mobile') await continueAdding.tap();
    else await continueAdding.click();
  }

  const groupCount = await page.getByRole('img', { name: /^Picture of / }).locator('[data-testid="countable-group"]').count();
  const looseCount = await page.getByRole('img', { name: /^Picture of / }).locator('[data-testid="single-objects"] svg').count();
  const correctAnswer = groupCount * 10 + looseCount;
  const answers = page.getByRole('group', { name: new RegExp(`Choose how many ${object}`) });
  const answerButtons = await answers.getByRole('button').all();
  expect(answerButtons).toHaveLength(4);
  const answerLabels = await answers.getByRole('button').evaluateAll((buttons) => buttons.map((button) => button.getAttribute('aria-label') ?? ''));
  const wrongLabel = answerLabels.find((label) => Number(label.split(' ')[0]) !== correctAnswer);
  expect(wrongLabel).toBeTruthy();
  await answers.getByRole('button', { name: new RegExp(`^${wrongLabel?.split(' ')[0]} `) }).click();
  await page.getByRole('button', { name: 'Check answer', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Not quite.');
  await page.getByRole('button', { name: 'Try another answer', exact: true }).click();
  await answers.getByRole('button', { name: new RegExp(`^${correctAnswer} `) }).click();
  await page.getByRole('button', { name: 'Check answer', exact: true }).click();
  await expect(page.getByRole('heading', { name: `You counted ${correctAnswer} ${object}.`, exact: true })).toBeVisible();
  await expect(page.getByText('Score: 0.5 / 1 point', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Try another count', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Try another count', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Add one group of ten / })).toBeVisible();
});

test('CE1 subtraction with bubbles adds, takes away, and checks the result', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: testInfo.project.name === 'mobile' ? 'reduce' : 'no-preference' });
  await ready(page, '/practice');
  await expect(page.getByRole('heading', { name: 'Subtraction within ten', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'Practice page should not overflow horizontally').toBe(true);
  await page.getByRole('button', { name: 'Start subtraction practice', exact: true }).click();
  await expect(page).toHaveURL(/\/practice\/subtraction-within-ten$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'Subtraction activity should not overflow horizontally').toBe(true);
  const prompt = page.getByRole('heading', { name: /^Add \d+ (bubbles|pencils|apples|books|stars)\.$/ });
  const promptText = await prompt.innerText();
  const targetCount = Number(promptText.match(/Add (\d+)/)?.[1]);
  const pluralObject = promptText.match(/Add \d+ (\w+)\./)?.[1];
  const pluralObjectLabel = pluralObject ? `${pluralObject[0].toUpperCase()}${pluralObject.slice(1)}` : '';
  const singularObjects: Record<string, string> = { bubbles: 'bubble', pencils: 'pencil', apples: 'apple', books: 'book', stars: 'star' };
  const object = singularObjects[pluralObject ?? ''];
  expect(object).toBeTruthy();
  await testInfo.attach('subtraction-with-bubbles-prompt', { body: await page.screenshot({ fullPage: true, animations: 'disabled' }), contentType: 'image/png' });
  const add = page.getByRole('button', { name: `Add one ${object}`, exact: true });
  if (testInfo.project.name === 'mobile') {
    const buttonBottom = await add.evaluate((element) => element.getBoundingClientRect().bottom);
    expect(buttonBottom, 'First action remains above the fixed bottom navigation').toBeLessThanOrEqual(754);
  }
  await page.getByRole('button', { name: 'Show hint', exact: true }).click();
  const subtractionHint = page.getByTestId('subtraction-hint');
  await expect(subtractionHint).toHaveText(`Point to each ${object} once as you count. After taking some away, count the ones that are still there.`);
  expect(await subtractionHint.innerText()).not.toMatch(/\d/);
  await page.getByRole('button', { name: 'Hide hint', exact: true }).click();
  await assertUsable(page, add);
  if (testInfo.project.name === 'desktop') {
    await add.focus();
    await page.keyboard.press('Enter');
  }
  for (let index = testInfo.project.name === 'desktop' ? 1 : 0; index < targetCount; index += 1) {
    if (testInfo.project.name === 'mobile') await add.tap();
    else await add.click();
  }
  await testInfo.attach('subtraction-scattered-object-model', { body: await page.screenshot({ fullPage: true, animations: 'disabled' }), contentType: 'image/png' });
  const removalPrompt = page.getByRole('heading', { name: /^Now take away \d+ (bubbles|pencils|apples|books|stars)\.$/ });
  const takeAway = Number((await removalPrompt.innerText()).match(/take away (\d+)/)?.[1]);
  const answer = targetCount - takeAway;
  const remove = page.getByRole('button', { name: `Take away one ${object}`, exact: true });
  await expect(page.getByText(new RegExp(`Tap the minus button to remove one ${object} at a time\\.`))).toBeVisible();
  await expect(remove.locator('svg.lucide-minus')).toHaveCount(1);
  if (testInfo.project.name === 'mobile') {
    const buttonBottom = await remove.evaluate((element) => element.getBoundingClientRect().bottom);
    expect(buttonBottom, 'Lightning action remains above the fixed bottom navigation').toBeLessThanOrEqual(754);
  }
  await assertUsable(page, remove);
  await expect(remove).toBeVisible();
  expect(await page.getByRole('button', { name: `Add one ${object}`, exact: true }).count()).toBe(0);
  let removedBeforeReload = 0;
  if (takeAway > 1) {
    if (testInfo.project.name === 'mobile') await remove.tap();
    else await remove.click();
    removedBeforeReload = 1;
    await expect(page.getByText('Taken away: 1', { exact: true })).toBeVisible();
    await page.reload({ waitUntil: 'networkidle' });
    await expect(remove).toBeVisible();
    await expect(page.getByText('Taken away: 1', { exact: true })).toBeVisible();
  }
  if (testInfo.project.name === 'desktop' && takeAway === 1) {
    await remove.focus();
    await page.keyboard.press('Enter');
    removedBeforeReload = 1;
  }
  for (let index = removedBeforeReload; index < takeAway; index += 1) {
    if (testInfo.project.name === 'mobile') await remove.tap();
    else await remove.click();
  }
  const equations = page.getByRole('group', { name: 'Choose the subtraction equation', exact: true });
  await equations.getByRole('button', { name: `${targetCount} + ${takeAway}`, exact: true }).click();
  await page.getByRole('button', { name: 'Check equation', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Not quite');
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await equations.getByRole('button', { name: `${targetCount} − ${takeAway}`, exact: true }).click();
  await page.getByRole('button', { name: 'Check equation', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Good job' })).toBeVisible();
  const subtractionModel = page.getByTestId('subtraction-with-dots-model');
  await expect(subtractionModel).toContainText('in the picture');
  await expect(subtractionModel).not.toContainText(`${pluralObjectLabel} left: ${answer}`);
  const answers = page.getByRole('group', { name: `Choose how many remain after ${targetCount} minus ${takeAway}`, exact: true });
  await answers.getByRole('button', { name: String(answer), exact: true }).click();
  await page.getByRole('button', { name: 'Check answer', exact: true }).click();
  await expect(page.getByRole('heading', { name: `${targetCount} − ${takeAway} = ${answer}`, exact: true })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Good job' })).toBeVisible();
  if (testInfo.project.name === 'desktop') {
    await expect(page.getByTestId('subtraction-confetti')).toHaveCount(1);
  } else {
    await expect(page.getByTestId('subtraction-confetti')).toHaveCount(0);
  }
  await testInfo.attach('subtraction-correct-answer-feedback', { body: await page.screenshot({ fullPage: true, animations: 'disabled' }), contentType: 'image/png' });
  await expect(page.getByText('Score: 0.5 / 1 point', { exact: true })).toBeVisible();
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: `${targetCount} − ${takeAway} = ${answer}`, exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Try another subtraction', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Try another subtraction', exact: true }).click();
  const nextPrompt = page.getByRole('heading', { name: /^Add \d+ (bubbles|pencils|apples|books|stars)\.$/ });
  const nextPluralObject = (await nextPrompt.innerText()).match(/Add \d+ (\w+)\./)?.[1];
  expect(nextPluralObject).not.toBe(pluralObject);
  await expect(page.getByRole('button', { name: `Add one ${singularObjects[nextPluralObject ?? '']}`, exact: true })).toBeVisible();
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
