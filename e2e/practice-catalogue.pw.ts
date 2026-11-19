import { test, expect, ready } from './fixtures';
import { coordinateLearner } from './coordinate-fixture';

const arithmeticQuestion = {
  id: 'arithmetic-partial-qa', kind: 'calculation-race', prompt: 'Answer each calculation.',
  operations: ['addition'], leftDigits: 1, rightDigits: 1, curriculumCountry: 'fr', schoolLevels: ['cp'], points: 1,
  problems: [
    { id: 'sum-one', operation: 'addition', left: 2, right: 3, choices: [4, 5, 6, 7] },
    { id: 'sum-two', operation: 'addition', left: 1, right: 4, choices: [3, 4, 5, 6] },
  ],
};

const clockQuestion = {
  id: 'clock-qa', kind: 'analogue-clock', mode: 'one-hour-later', startHour: 3, answerChoices: [2, 3, 4, 5],
  prompt: 'What time will it be one hour later?', points: 1,
};

const numberLineQuestion = {
  id: 'number-line-qa', kind: 'graduated-number-line', prompt: 'Read point A.', points: 1,
  configuration: { id: 'line-config-qa', mode: 'read_point_value', title: 'Number line', instruction: 'Read the marked value.',
    line: { start: 0, end: 1, subdivisions: 4 }, items: [{ id: 'point-a', label: 'A', value: '1/2' }],
    skillTags: ['fractions.number_line'], snapMode: 'tick', validationMode: 'exact_position' },
};

const wordProblemQuestion = {
  id: 'word-problem-qa', kind: 'guided-word-problem', prompt: 'There were 8 books. 3 were taken away. How many remain?',
  operation: 'subtraction', initial: 8, change: 3, object: 'book', curriculumCountry: 'fr', schoolLevels: ['ce1'], points: 1,
};

const equalGroupsQuestion = {
  id: 'equal-groups-qa', kind: 'equal-groups', prompt: 'Build three equal groups of four books.',
  groups: 3, perGroup: 4, object: 'book', curriculumCountry: 'fr', schoolLevels: ['ce1'], points: 1,
};

async function openMathTopic(page: import('@playwright/test').Page) {
  await ready(page, '/practice');
  await page.getByRole('button', { name: 'Maths', exact: true }).click();
  await expect(page).toHaveURL(/\/practice\/mathematiques\/topics$/);
  await page.getByRole('button', { name: 'Practice', exact: true }).click();
}

async function openQuestionEditor(page: import('@playwright/test').Page) {
  await ready(page, '/admin/learning');
  await page.getByRole('tab', { name: 'Quiz Banks', exact: true }).click();
  await page.getByText('QA Coordinates', { exact: true }).first().click();
  await page.getByRole('button', { name: 'Add Question', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Les types sont filtrés par le programme et le niveau des thèmes de la banque.')).toBeVisible();
  return dialog;
}

test('admin authoring exposes CP colour grid and disables 5ème-only coordinate type at CP', async ({ page }) => {
  await coordinateLearner(page, 'cp', 'fr', true);
  const dialog = await openQuestionEditor(page);
  await dialog.getByRole('combobox', { name: 'Question Type', exact: true }).click();
  const options = page.getByRole('option');
  await expect(options.filter({ hasText: 'Compter dans une grille de couleurs · CP uniquement' })).toBeEnabled();
  await expect(options.filter({ hasText: 'Coordonnées dans le plan · France · 5ème' })).toHaveAttribute('aria-disabled', 'true');
  await expect(options.filter({ hasText: 'Course de calcul · difficulté selon le niveau' })).toBeEnabled();
  await expect(options.filter({ hasText: 'Cartes de calcul · difficulté selon le niveau' })).toBeEnabled();
});

test('admin authoring exposes coordinate plane at 5ème and disables CP-only colour grid', async ({ page }) => {
  await coordinateLearner(page, '5eme', 'fr', true);
  const dialog = await openQuestionEditor(page);
  await dialog.getByRole('combobox', { name: 'Question Type', exact: true }).click();
  const options = page.getByRole('option');
  await expect(options.filter({ hasText: 'Compter dans une grille de couleurs · CP uniquement' })).toHaveAttribute('aria-disabled', 'true');
  await expect(options.filter({ hasText: 'Coordonnées dans le plan · France · 5ème' })).toBeEnabled();
});

test('arithmetic editor exposes level-bounded digit ranges and operations', async ({ page }) => {
  await coordinateLearner(page, 'cp', 'fr', true);
  const cpDialog = await openQuestionEditor(page);
  await cpDialog.getByRole('combobox', { name: 'Question Type', exact: true }).click();
  await page.getByRole('option', { name: 'Course de calcul · difficulté selon le niveau', exact: true }).click();
  await expect(cpDialog.getByLabel('Chiffres maximum — premier nombre')).toHaveAttribute('max', '2');
  await expect(cpDialog.getByLabel('Chiffres maximum — second nombre')).toHaveAttribute('max', '2');
  await expect(cpDialog.getByLabel('Multiplication', { exact: true })).toHaveCount(0);
  await expect(cpDialog.getByLabel('Division', { exact: true })).toHaveCount(0);
  await cpDialog.getByRole('combobox', { name: 'Question Type', exact: true }).press('Escape');

  await coordinateLearner(page, '5eme', 'fr', true);
  const upperDialog = await openQuestionEditor(page);
  await upperDialog.getByRole('combobox', { name: 'Question Type', exact: true }).click();
  await page.getByRole('option', { name: 'Cartes de calcul · difficulté selon le niveau', exact: true }).click();
  await expect(upperDialog.getByLabel('Chiffres maximum — premier nombre')).toHaveAttribute('max', '7');
  await expect(upperDialog.getByLabel('Multiplication', { exact: true })).toBeVisible();
  await expect(upperDialog.getByLabel('Division', { exact: true })).toBeVisible();
});

test('a 5ème learner cannot open a CP-only bank even through a direct topic quiz URL', async ({ page }) => {
  const cpColour = { id: 'colour-grid-qa', kind: 'colour-grid', prompt: 'Count the red squares.', rows: 1, columns: 2,
    cells: ['red', 'blue'], targetColor: 'red', points: 1, curriculumCountry: 'fr', schoolLevels: ['cp'] };
  await coordinateLearner(page, '5eme', 'fr', false, [cpColour]);
  await ready(page, '/practice/mathematiques/topics?quiz=coordinate-qa-bank');
  await expect(page.getByRole('alert')).toContainText('Ce quiz n’est pas disponible pour le programme, le niveau ou le thème sélectionné.');
  await expect(page.getByTestId('guided-family-colour-grid')).toHaveCount(0);
});

test('admin coordinate question save persists in the synthetic bank and renders through the assigned topic', async ({ page }) => {
  await coordinateLearner(page, '5eme', 'fr', true);
  const dialog = await openQuestionEditor(page);
  await dialog.getByRole('combobox', { name: 'Question Type', exact: true }).click();
  await page.getByRole('option', { name: 'Coordonnées dans le plan · France · 5ème', exact: true }).click();
  await dialog.getByRole('button', { name: 'Add Question', exact: true }).click();
  await expect(page.getByText('Q1 (coordinate-plane)', { exact: true })).toBeVisible();

  await page.reload();
  await page.getByRole('tab', { name: 'Quiz Banks', exact: true }).click();
  await page.getByText('QA Coordinates', { exact: true }).first().click();
  await expect(page.getByText('Q1 (coordinate-plane)', { exact: true })).toBeVisible();
  await openMathTopic(page);
  await expect(page.getByTestId('coordinate-activity')).toBeVisible();
  await expect(page.getByTestId('coordinate-activity').getByText('Lis les coordonnées du point A.', { exact: true })).toBeVisible();
});

test('authored arithmetic bank preserves partial score for a completed two-card race', async ({ page }) => {
  let savedAttempt: Record<string, unknown> | null = null;
  await page.route('https://sibprjxhbxahouejygeu.supabase.co/functions/v1/quiz-bank-attempt', async route => {
    savedAttempt = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({ status: 200, json: { success: true }, headers: { 'x-tutorly-test-data': 'synthetic' } });
  });
  await coordinateLearner(page, 'cp', 'fr', false, [arithmeticQuestion]);
  await openMathTopic(page);
  const activity = page.getByTestId('arithmetic-quiz-calculation-race');
  await expect(activity.getByText('Calculation 1 of 2', { exact: true })).toBeVisible();
  await activity.getByRole('button', { name: '4', exact: true }).click();
  await expect(activity.getByText('Calculation 2 of 2', { exact: true })).toBeVisible();
  await activity.getByRole('button', { name: '5', exact: true }).click();
  await expect(page.getByTestId('arithmetic-quiz-complete')).toContainText('1 correct answers out of 2.');
  // The parent quiz still records the completed item when the learner submits it.
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(page.getByText('Deck complete', { exact: true }).last()).toBeVisible();
  await expect(page.getByText('+10 XP', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Results', exact: true }).click();
  await expect.poll(() => savedAttempt).not.toBeNull();
  expect(savedAttempt).toMatchObject({ bankId: 'coordinate-qa-bank', score: 0.5, maxScore: 1 });
  expect(savedAttempt?.details).toEqual(expect.arrayContaining([
    expect.objectContaining({ correct: false, awardedPoints: 0.5 }),
  ]));
});

test('authored analogue-clock question renders support, retry and completion', async ({ page }) => {
  await coordinateLearner(page, 'ce1', 'fr', false, [clockQuestion]);
  await openMathTopic(page);
  const clock = page.getByTestId('visual-quiz-clock');
  await expect(clock.getByText('What time will it be one hour later?', { exact: true })).toBeVisible();
  await clock.getByRole('button', { name: 'Show hint', exact: true }).click();
  await expect(clock.getByTestId('visual-quiz-hint')).toBeVisible();
  await clock.getByRole('button', { name: '3 h', exact: true }).click();
  await clock.getByRole('button', { name: 'Check answer', exact: true }).click();
  await expect(clock.getByRole('status')).toContainText('Not yet.');
  await clock.getByRole('button', { name: 'Try again', exact: true }).click();
  await clock.getByRole('button', { name: '4 h', exact: true }).click();
  await clock.getByRole('button', { name: 'Check answer', exact: true }).click();
  await expect(clock.getByTestId('visual-quiz-complete')).toContainText('Solved with help.');
});

test('authored number-line question renders from its CM1 bank payload', async ({ page }) => {
  await coordinateLearner(page, 'cm1', 'fr', false, [numberLineQuestion]);
  await openMathTopic(page);
  const activity = page.getByTestId('visual-quiz-number-line');
  await expect(activity.getByText('Read point A.', { exact: true })).toBeVisible();
  await expect(activity.getByRole('textbox', { name: 'A value', exact: true })).toBeVisible();
  await activity.getByRole('textbox', { name: 'A value', exact: true }).fill('0.25');
  await activity.getByRole('button', { name: 'Check answer', exact: true }).click();
  await expect(activity.getByRole('status').filter({ hasText: 'Not quite yet.' })).toBeVisible();
  await activity.getByRole('button', { name: 'Try again', exact: true }).click();
  await activity.getByRole('textbox', { name: 'A value', exact: true }).fill('1/2');
  await activity.getByRole('button', { name: 'Check answer', exact: true }).click();
  await expect(activity.getByRole('status').filter({ hasText: 'Solved without help.' })).toBeVisible();
});

test('authored guided word problem and equal-groups banks render their own models before completion', async ({ page }) => {
  await coordinateLearner(page, 'ce1', 'fr', false, [wordProblemQuestion]);
  await openMathTopic(page);
  const word = page.getByTestId('guided-family-guided-word-problem');
  await expect(word.getByText('There are 8 books. 3 are taken away. How many are left?', { exact: true })).toBeVisible();
  await word.getByRole('button', { name: '− Subtract', exact: true }).click();
  const takeAway = word.getByRole('button', { name: 'Take away one object', exact: true });
  await expect(takeAway).toBeVisible();
  await takeAway.click();
  await expect(word).toContainText('Show the change: take away 3 books.');

  await coordinateLearner(page, 'ce1', 'fr', false, [equalGroupsQuestion]);
  await openMathTopic(page);
  const groups = page.getByTestId('guided-family-equal-groups');
  await expect(groups.getByText('Build 3 groups of 4 books.', { exact: true })).toBeVisible();
  await groups.getByRole('button', { name: 'Add one group', exact: true }).click();
  await expect(groups.getByLabel('Equal-sized group')).toHaveCount(1);
});
