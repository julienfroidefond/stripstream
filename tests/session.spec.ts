import { expect, test } from '@playwright/test';
import { hasE2eCredentials, signIn } from './helpers/auth';

test.describe('Session lifecycle', () => {
  test.skip(!hasE2eCredentials, 'Set E2E_USER_EMAIL and E2E_USER_PASSWORD');

  test('signs out and protects the application again', async ({ page }) => {
    await signIn(page);
    await page.goto('/');

    const sidebarTrigger = page.getByRole('button', { name: /menu|navigation/i }).first();
    if (await sidebarTrigger.isVisible()) await sidebarTrigger.click();
    await page.getByRole('button', { name: /sign out|déconnexion/i }).click();

    await expect(page).toHaveURL(/\/login/);
    await page.goto('/account');
    await expect(page).toHaveURL(/\/login\?from=%2Faccount/);
  });
});
