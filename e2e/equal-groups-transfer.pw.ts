import { test, expect, ready, assertUsable } from './fixtures';

for (const supported of [false, true]) {
  test(`equal groups fresh transfer: ${supported ? 'supported' : 'independent'}`, async ({ page }, testInfo) => {
    await ready(page, '/practice');
    await page.evaluate(() => {
      localStorage.setItem('tutorly:practice:guided-family:v1:equal-groups:learner:guest', JSON.stringify({ exercise: { id: 'transfer-qa', kind: 'equal-groups', groups: 3, perGroup: 4, object: 'book', prompt: 'Synthetic exercise', points: 2 } }));
    });
    await page.getByRole('button', { name: 'Commencer : Groupes égaux', exact: true }).click();
    for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Ajouter un groupe', exact: true }).click();
    const choices = page.getByRole('group', { name: 'Réponses proposées' });
    await choices.getByRole('button', { name: '3', exact: true }).click();
    await page.getByRole('button', { name: 'Vérifier', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Tu as peut-être compté les groupes' })).toBeVisible();
    await expect(page.getByLabel('Groupe de même taille', { exact: true })).toHaveCount(3);
    await expect(page.getByRole('status').filter({ hasText: 'Tu as peut-être compté les groupes' })).not.toContainText('12');
    await page.getByRole('button', { name: 'Réessayer', exact: true }).click();
    await choices.getByRole('button', { name: '12', exact: true }).click();
    await page.getByRole('button', { name: 'Vérifier', exact: true }).click();
    await expect(page.getByText('Score de cet exercice : 1 / 2', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Essayer sans le modèle', exact: true }).click();
    const transfer = page.getByTestId('equal-groups-transfer');
    await expect(transfer).toContainText('4 groupes de 5 livres');
    await expect(transfer.getByRole('img')).toHaveCount(0);
    if (supported) {
      await transfer.getByRole('button', { name: 'Besoin d’aide ?', exact: true }).click();
      await expect(transfer).not.toContainText('= 20');
      await transfer.getByRole('group').getByRole('button', { name: '4', exact: true }).click();
      await transfer.getByRole('button', { name: 'Vérifier ce nouvel essai', exact: true }).click();
      await expect(transfer.getByRole('status')).not.toContainText('restent en place');
      await transfer.getByRole('button', { name: 'Réessayer le nouvel essai', exact: true }).click();
    }
    await page.reload();
    await expect(transfer).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('fresh-question.png'), fullPage: true });
    const correct = transfer.getByRole('group').getByRole('button', { name: '20', exact: true });
    await assertUsable(page, correct);
    if (testInfo.project.name === 'mobile') await correct.tap(); else await correct.press('Enter');
    await transfer.getByRole('button', { name: 'Vérifier ce nouvel essai', exact: true }).press('Enter');
    const result = page.getByTestId('equal-groups-transfer-complete');
    await expect(result).toContainText(supported ? 'avec une aide ou une correction' : 'seul, dès le premier essai');
    await expect(page.getByText('Score de cet exercice : 1 / 2', { exact: true })).toBeVisible();
    await page.reload();
    await expect(result).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('fresh-result.png'), fullPage: true });
    await page.getByRole('button', { name: 'Un autre exercice', exact: true }).click();
    await expect(transfer).toHaveCount(0);
  });
}
