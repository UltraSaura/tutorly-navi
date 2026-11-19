import { test, expect, ready } from './fixtures';
import { coordinateLearner } from './coordinate-fixture';

const coordinateQuestion = {
  id: 'coordinate-read-qa', kind: 'coordinate-plane', mode: 'read', maxX: 6, maxY: 6,
  target: { x: 3, y: 4 }, prompt: 'Read the marked point.', points: 1,
  curriculumCountry: 'fr', schoolLevels: ['5eme'],
};

const colourQuestion = {
  id: 'colour-grid-qa', kind: 'colour-grid', prompt: 'Count the red squares.',
  rows: 2, columns: 3, cells: ['red', 'blue', 'red', 'green', 'blue', 'yellow'], targetColor: 'red', points: 1,
};

test('legacy demo routes return to Practice and the index has no standalone activity cards', async ({ page }, testInfo) => {
  await ready(page, '/practice');
  await page.screenshot({ path: testInfo.outputPath('practice-landing.png'), fullPage: true });
  await expect(page.getByRole('button', { name: 'Maths', exact: true })).toBeVisible();
  for (const path of [
    '/practice/coordinates', '/practice/add-up-to-100', '/practice/addition-across-ten',
    '/practice/subtraction-within-ten', '/practice/guided/equal-groups', '/practice/number-line',
  ]) {
    await page.evaluate((nextPath) => {
      window.history.pushState({}, '', nextPath);
      window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
    }, path);
    await expect(page).toHaveURL(/\/practice$/);
    await expect(page.getByTestId(/coordinate-activity|guided-family|number-line-activity/)).toHaveCount(0);
  }
  await expect(page.getByRole('button', { name: /Coordonnées dans le plan|Demi-droite graduée|Groupes égaux/ })).toHaveCount(0);
});

test('French 5ème assigned coordinate bank is listed by topic and renders read, hint and retry from its stored payload', async ({ page }) => {
  await coordinateLearner(page, '5eme', 'fr', false, [coordinateQuestion]);
  await ready(page, '/practice');
  await page.getByRole('button', { name: 'Maths', exact: true }).click();
  await expect(page).toHaveURL(/\/practice\/mathematiques\/topics$/);
  await expect(page.getByText('Coordonnées', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Practice', exact: true }).click();

  const activity = page.getByTestId('coordinate-activity');
  await expect(activity).toBeVisible();
  await expect(activity.getByText('Read the marked point.', { exact: true })).toBeVisible();
  await expect(activity).not.toContainText('(3, 4)');
  await activity.getByRole('spinbutton', { name: 'x-coordinate', exact: true }).fill('3');
  await activity.getByRole('spinbutton', { name: 'y-coordinate', exact: true }).fill('2');
  await activity.getByRole('button', { name: 'Check answer', exact: true }).click();
  await expect(activity.getByRole('status')).toContainText('Not yet.');
  await activity.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(activity.getByRole('spinbutton', { name: 'x-coordinate', exact: true })).toHaveValue('3');
  await expect(activity.getByRole('spinbutton', { name: 'y-coordinate', exact: true })).toHaveValue('2');
  await activity.getByRole('button', { name: 'Show hint', exact: true }).click();
  const hint = activity.getByTestId('coordinate-hint');
  await expect(hint).toBeVisible();
  await expect(hint).not.toContainText(/\b[0-6]\b/);
  await activity.getByRole('button', { name: 'Hide hint', exact: true }).click();
  await activity.getByRole('spinbutton', { name: 'y-coordinate', exact: true }).fill('4');
  await activity.getByRole('button', { name: 'Check answer', exact: true }).click();
  await expect(activity.getByTestId('coordinate-complete')).toContainText('Solved with help.');
});

test('a 5ème bank containing CP-only colour grid is hidden and direct quiz URLs are rejected', async ({ page }) => {
  await coordinateLearner(page, '5eme', 'fr', false, [colourQuestion]);
  await ready(page, '/practice');
  await page.getByRole('button', { name: 'Maths', exact: true }).click();
  await expect(page).toHaveURL(/\/practice\/mathematiques\/topics$/);
  await expect(page.getByText('Coordonnées', { exact: true })).toHaveCount(0);
  await expect(page.getByText('No practice questions available for this subject yet.')).toBeVisible();

  await page.goto('/practice/mathematiques/topics?quiz=coordinate-qa-bank');
  await expect(page.getByRole('alert')).toContainText('Ce quiz n’est pas disponible pour le programme, le niveau ou le thème sélectionné.');
  await expect(page.getByTestId('guided-family-colour-grid')).toHaveCount(0);
});

test('a CP colour-grid question assigned to its CP topic renders from the bank payload', async ({ page }, testInfo) => {
  await coordinateLearner(page, 'cp', 'fr', false, [colourQuestion]);
  await ready(page, '/practice');
  await page.getByRole('button', { name: 'Maths', exact: true }).click();
  await expect(page).toHaveURL(/\/practice\/mathematiques\/topics$/);
  await expect(page.getByText('Coordonnées', { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('practice-topic.png'), fullPage: true });
  await page.getByRole('button', { name: 'Practice', exact: true }).click();
  const activity = page.getByTestId('guided-family-colour-grid');
  await expect(activity).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('practice-cp-colour-grid.png'), fullPage: true });
  await expect(activity.getByRole('heading', { name: 'How many tiles have the colour red (R)?', exact: true })).toBeVisible();
  const firstRed = activity.getByRole('button', { name: 'Tile 1, 1: red', exact: true });
  const secondRed = activity.getByRole('button', { name: 'Tile 1, 3: red', exact: true });
  await expect(firstRed).toBeVisible();
  if (testInfo.project.name === 'mobile') {
    await firstRed.tap(); await secondRed.tap();
    await activity.getByRole('group', { name: 'Answer choices' }).getByRole('button', { name: '2', exact: true }).tap();
    await activity.getByRole('button', { name: 'Check answer', exact: true }).tap();
  } else {
    await firstRed.focus(); await firstRed.press('Enter');
    await secondRed.focus(); await secondRed.press('Enter');
    const answer = activity.getByRole('group', { name: 'Answer choices' }).getByRole('button', { name: '2', exact: true });
    await answer.focus(); await answer.press('Enter');
    const check = activity.getByRole('button', { name: 'Check answer', exact: true });
    await check.focus(); await check.press('Enter');
  }
  await expect(activity.getByTestId('guided-family-complete')).toContainText('Good work: you counted the requested colour.');
});
