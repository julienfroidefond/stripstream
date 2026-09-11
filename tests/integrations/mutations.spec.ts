import { expect, test } from '@playwright/test';

const hasIsolatedDatabase = Boolean(process.env.E2E_DATABASE_URL);

async function openSettingsTab(page: import('@playwright/test').Page, name: RegExp) {
  await page.goto('/settings');
  await page.getByRole('tab', { name }).click();
}

test.use({ storageState: 'tests/.auth/stream.json' });

test.describe('Mutations on the isolated E2E account', () => {
  test.skip(!hasIsolatedDatabase, 'Local E2E database unavailable');
  test.describe.configure({ mode: 'serial' });

  test('persists reader preferences after a reload', async ({ page }) => {
    await openSettingsTab(page, /reading|lecture/i);

    await page.locator('#reading-dir-rtl').click();
    await expect(page.locator('#reading-dir-rtl')).toHaveAttribute('data-state', 'checked');

    await page.locator('#reader-bg-cream').click({ force: true });
    await expect(page.locator('#reader-bg-cream')).toHaveAttribute('data-state', 'checked');

    const doublePage = page.locator('#double-page-mode');
    await page.locator('label[for="double-page-mode"]').click();
    await expect(doublePage).toBeChecked();

    await page.reload();
    await expect(page.locator('#reading-dir-rtl')).toHaveAttribute('data-state', 'checked');
    await expect(page.locator('#reader-bg-cream')).toHaveAttribute('data-state', 'checked');
    await expect(page.locator('#double-page-mode')).toBeChecked();
  });

  test('creates, edits, and deletes a Komga connection', async ({ page }) => {
    await openSettingsTab(page, /connection/i);
    await page.getByTestId('connection-add').click();

    await page.locator('#conn-name').fill('E2E mutable connection');
    await page.locator('#conn-url').fill('http://127.0.0.1:8444');
    await page.locator('#conn-username').fill('user');
    await page.locator('#conn-password').fill('pass');
    await page.getByTestId('connection-save').click();

    const created = page.getByTestId('connection-komga-e2e-mutable-connection');
    await expect(created).toBeVisible();

    await created.getByTestId('connection-edit').click();
    await page.locator('#conn-name').fill('E2E renamed connection');
    await page.getByTestId('connection-save').click();

    const renamed = page.getByTestId('connection-komga-e2e-renamed-connection');
    await expect(renamed).toBeVisible();
    page.once('dialog', (dialog) => dialog.accept());
    await renamed.getByTestId('connection-delete').click();
    await expect(renamed).toHaveCount(0);
  });
});
