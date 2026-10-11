import { expect, test } from '@playwright/test';
import { hasE2eCredentials } from '../helpers/auth';

const expectsAdmin = process.env.E2E_USER_IS_ADMIN === 'true';

test.use({ storageState: 'tests/.auth/stream.json' });

test.describe('Admin authorization', () => {
  test.skip(!hasE2eCredentials, 'Local E2E account unavailable');

  test('only exposes the dashboard to an administrator', async ({ page }) => {
    await page.goto('/admin');

    if (expectsAdmin) {
      await expect(page).toHaveURL(/\/admin$/);
      await expect(page.getByRole('heading', { name: 'Administration' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Utilisateurs', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Rafraîchir', exact: true })).toBeEnabled();
    } else {
      await expect(page).toHaveURL((url) => url.pathname === '/');
      await expect(page.getByRole('heading', { name: 'Administration' })).toHaveCount(0);
    }
  });

  test('renders dashboard data and refreshes on demand', async ({ page }) => {
    test.skip(!expectsAdmin, 'Set E2E_USER_IS_ADMIN=true to exercise the admin dashboard');
    await page.goto('/admin');

    // Aggregate cards are backed by AdminService.getUserStats().
    await expect(page.getByText('Utilisateurs totaux')).toBeVisible();
    await expect(page.getByText('Administrateurs')).toBeVisible();

    // The users table lists the two seeded E2E accounts.
    const table = page.getByRole('table');
    await expect(table.getByText('e2e-stream@test.local')).toBeVisible();
    await expect(table.getByText('e2e-reader@test.local')).toBeVisible();

    // Manual refresh re-runs getAdminDashboardData() and confirms via a toast.
    await page.getByRole('button', { name: 'Rafraîchir', exact: true }).click();
    await expect(page.getByText('Données rafraîchies')).toBeVisible({ timeout: 10_000 });
  });
});
