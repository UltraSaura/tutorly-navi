import { expect } from '@playwright/test';
import { test, ready, assertUsable } from './fixtures';
import type { GuidedFamilyExercise } from '../src/features/practice/guidedFamilies';

const examples: Array<{ slug: string; title: string; exercise: GuidedFamilyExercise; answer: number }> = [
  { slug: 'word-problems', title: 'Petits problèmes guidés', answer: 5, exercise: { id: 'qa-word', kind: 'guided-word-problem', prompt: 'Synthetic word problem', initial: 8, change: 3, operation: 'subtraction', object: 'apple' } },
  { slug: 'equal-groups', title: 'Groupes égaux', answer: 12, exercise: { id: 'qa-groups', kind: 'equal-groups', prompt: 'Synthetic equal groups', groups: 3, perGroup: 4, object: 'book' } },
  { slug: 'colour-grid', title: 'Compter les couleurs', answer: 2, exercise: { id: 'qa-grid', kind: 'colour-grid', prompt: 'Synthetic colour grid', rows: 2, columns: 3, cells: ['red','blue','red','green','blue','yellow'], targetColor: 'red' } },
];

for (const example of examples) {
  test(`guided family: ${example.slug} preserves work, retries and resume`, async ({ page }, testInfo) => {
    await ready(page, '/practice');
    await page.evaluate(exercise => {
      const key = `tutorly:practice:guided-family:v1:${exercise.kind}:learner:guest`;
      localStorage.setItem(key, JSON.stringify({ exercise }));
    }, example.exercise);
    await page.getByRole('button', { name: `Commencer : ${example.title}`, exact: true }).click();
    const activity = page.getByTestId(`guided-family-${example.exercise.kind}`);
    await expect(activity).toBeVisible();
    await page.getByRole('button', { name: 'Afficher un indice', exact: true }).click();
    await expect(activity.locator('p.bg-amber-50')).not.toContainText(/\d/);
    await page.getByRole('button', { name: 'Masquer l’indice', exact: true }).click();

    if (example.exercise.kind === 'guided-word-problem') {
      await page.getByRole('button', { name: '+ Additionner', exact: true }).click();
      await page.getByRole('button', { name: 'Réessayer', exact: true }).click();
      await page.getByRole('button', { name: '− Soustraire', exact: true }).click();
      const action = page.getByRole('button', { name: 'Enlever un objet', exact: true });
      await assertUsable(page, action);
      await action.click();
      await page.reload();
      await expect(action).toBeVisible();
      for (let index = 1; index < example.exercise.change; index++) await action.press('Enter');
    } else if (example.exercise.kind === 'equal-groups') {
      const action = page.getByRole('button', { name: 'Ajouter un groupe', exact: true });
      for (let index = 0; index < example.exercise.groups; index++) {
        await assertUsable(page, action);
        if (testInfo.project.name === 'mobile') await action.tap(); else await action.press('Enter');
      }
    } else {
      await activity.getByRole('button', { name: 'Case 1, 1: rouge', exact: true }).click();
      await expect(activity.getByRole('button', { name: 'Case 1, 1: rouge', exact: true })).toHaveAttribute('aria-pressed', 'true');
    }

    await expect(activity).not.toContainText(`= ${example.answer}`);
    const choices = page.getByRole('group', { name: 'Réponses proposées' });
    const labels = await choices.getByRole('button').allTextContents();
    expect(labels).toHaveLength(4);
    const wrong = labels.find(label => Number(label) !== example.answer)!;
    await choices.getByRole('button', { name: wrong, exact: true }).click();
    await page.getByRole('button', { name: 'Vérifier', exact: true }).click();
    await page.getByRole('button', { name: 'Réessayer', exact: true }).click();
    await choices.getByRole('button', { name: String(example.answer), exact: true }).click();
    await page.getByRole('button', { name: 'Vérifier', exact: true }).press('Enter');
    await expect(page.getByTestId('guided-family-complete')).toBeVisible();
    await expect(page.getByText(/Score de cet exercice/)).toBeVisible();
    await page.reload();
    await expect(page.getByTestId('guided-family-complete')).toBeVisible();
    const next = page.getByRole('button', { name: 'Un autre exercice', exact: true });
    await assertUsable(page, next);
    await next.click();
    await expect(page.getByTestId('guided-family-complete')).toHaveCount(0);
  });
}
