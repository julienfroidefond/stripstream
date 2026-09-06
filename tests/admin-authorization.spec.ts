import { expect, test } from '@playwright/test';
import { hasE2eCredentials, signIn } from './helpers/auth';

const expectsAdmin = process.env.E2E_USER_IS_ADMIN === 'true';

test.describe('Admin authorization', () => {
  test.skip(!hasE2eCredentials, 'Local E2E account unavailable');

  test('only exposes the dashboard to an administrator', async ({ page }) => {
    await signIn(page);
    await page.goto('/admin');

    if (expectsAdmin) {
      await expect(page).toHaveURL(/\/admin$/);
      await expect(page.getByRole('heading', { name: 'Administration' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Utilisateurs' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Rafraîchir' })).toBeEnabled();
    } else {
      await expect(page).toHaveURL((url) => url.pathname === '/');
      await expect(page.getByRole('heading', { name: 'Administration' })).toHaveCount(0);
    }
  });
});
