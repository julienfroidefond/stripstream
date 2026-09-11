import { expect, test } from '@playwright/test';
import { hasE2eCredentials } from '../helpers/auth';

test.use({ storageState: 'tests/.auth/stream.json' });

test.describe('Settings', () => {
  test.skip(!hasE2eCredentials, 'Local E2E account unavailable');

  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
  });

  test('exposes all settings sections with real controls', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('tab')).toHaveCount(3);
    await expect(page.getByRole('switch').first()).toBeVisible();

    await page.getByRole('tab', { name: /reading|lecture/i }).click();
    await expect(page.getByRole('tab', { name: /reading|lecture/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    await page.getByRole('tab', { name: /connection/i }).click();
    await expect(page.getByRole('button', { name: /add connection|ajouter/i })).toBeVisible();
  });

  test('remembers the active tab after a reload', async ({ page }) => {
    const connectionTab = page.getByRole('tab', { name: /connection/i });
    await connectionTab.click();
    await page.reload();

    await expect(connectionTab).toHaveAttribute('aria-selected', 'true');
    await expect
      .poll(() => page.evaluate(() => sessionStorage.getItem('stripstream:settings-active-tab')))
      .toBe('connection');
  });
});
