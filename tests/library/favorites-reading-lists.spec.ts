import { expect, test } from '@playwright/test';

const hasIsolatedDatabase = Boolean(process.env.E2E_DATABASE_URL);

test.use({ storageState: 'tests/.auth/stream.json' });

test.describe('Favorites and reading lists', () => {
  test.skip(!hasIsolatedDatabase, 'Local E2E database unavailable');

  test('adds and removes a series favorite, including persistence after reload', async ({ page }) => {
    await page.goto('/series/series-a');

    const add = page.getByTestId('series-favorite-add').first();
    const remove = page.getByTestId('series-favorite-remove').first();
    // Keep the assertion deterministic even if a previous interrupted run left
    // the freshly seeded local account with this favorite already present.
    if (await remove.isVisible().catch(() => false)) {
      await remove.click();
      await expect(add).toBeVisible({ timeout: 15_000 });
    }
    await expect(add).toBeVisible({ timeout: 15_000 });
    await add.click();

    await expect(remove).toBeVisible();
    await page.reload();
    await expect(page.getByTestId('series-favorite-remove').first()).toBeVisible();

    await page.getByTestId('series-favorite-remove').first().click();
    await expect(page.getByTestId('series-favorite-add').first()).toBeVisible();
  });

  test('opens a deterministic reading list through the Stripstream connection', async ({ page }) => {
    await page.goto('/settings');
    await page.getByRole('tab', { name: /connection/i }).click();
    const listsConnection = page.getByTestId('connection-stripstream-stub-lists');
    await expect(listsConnection).toBeVisible();
    await listsConnection.getByText('Stub Lists', { exact: true }).click();
    await expect(listsConnection.getByRole('radio')).toBeChecked({ timeout: 15_000 });

    await page.goto('/reading-lists/list-a');
    await expect(page.getByRole('heading', { name: 'E2E Reading List' })).toBeVisible();
    await expect(page.getByRole('link', { name: /BD-A|series-a/i })).toBeVisible();
  });
});
