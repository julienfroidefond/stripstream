import { expect, test } from '@playwright/test';
import { e2eEmail, hasE2eCredentials, signIn } from '../helpers/auth';

test.describe('Account', () => {
  test.skip(!hasE2eCredentials, 'Local E2E account unavailable');

  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await page.goto('/account');
  });

  test('shows the signed-in profile without exposing password values', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Mon compte' })).toBeVisible();
    await expect(page.getByText(e2eEmail!, { exact: true })).toBeVisible();
    await expect(page.getByText('Informations du compte')).toBeVisible();

    for (const input of await page.locator('input[type="password"]').all()) {
      await expect(input).toHaveValue('');
    }
  });

  test('rejects a short new password before contacting the server', async ({ page }) => {
    await page.getByLabel('Mot de passe actuel').fill('not-used');
    await page.getByLabel('Nouveau mot de passe').fill('Short1');
    await page.getByLabel('Confirmer le mot de passe').fill('Short1');
    await page.getByRole('button', { name: 'Changer le mot de passe' }).click();

    await expect(
      page.getByText('Le mot de passe doit contenir au moins 8 caractères', { exact: true })
    ).toBeVisible();
  });

  test('rejects mismatching new passwords before contacting the server', async ({ page }) => {
    await page.getByLabel('Mot de passe actuel').fill('not-used');
    await page.getByLabel('Nouveau mot de passe').fill('FirstPassword1');
    await page.getByLabel('Confirmer le mot de passe').fill('SecondPassword1');
    await page.getByRole('button', { name: 'Changer le mot de passe' }).click();

    await expect(
      page.getByText('Les mots de passe ne correspondent pas', { exact: true })
    ).toBeVisible();
  });
});
