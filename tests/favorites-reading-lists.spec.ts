import { expect, test } from '@playwright/test';

const hasIsolatedDatabase = Boolean(process.env.E2E_DATABASE_URL);
const email = 'e2e-stream@test.local';
const password = 'E2eStrong!123';

async function signIn(page: import('@playwright/test').Page) {
  await page.goto('/login');
  const form = page.locator('form').first();
  await form.locator('#email').fill(email);
  await form.locator('#password').fill(password);
  await form.getByRole('button', { name: /sign in|se connecter/i }).click();
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
}

test.describe('Favorites and reading lists', () => {
  test.skip(!hasIsolatedDatabase, 'Set E2E_DATABASE_URL to use the isolated seeded account');

  test('adds and removes a series favorite, including persistence after reload', async ({ page }) => {
    await signIn(page);
    await page.goto('/series/series-a');

    const add = page.getByRole('button', { name: /add.*favorite|ajouter.*favori/i });
    await expect(add).toBeVisible({ timeout: 15_000 });
    await add.click();

    const remove = page.getByRole('button', { name: /remove.*favorite|retirer.*favori/i });
    await expect(remove).toBeVisible();
    await page.reload();
    await expect(page.getByRole('button', { name: /remove.*favorite|retirer.*favori/i })).toBeVisible();

    await page.getByRole('button', { name: /remove.*favorite|retirer.*favori/i }).click();
    await expect(page.getByRole('button', { name: /add.*favorite|ajouter.*favori/i })).toBeVisible();
  });

  test('opens a deterministic reading list through the Stripstream connection', async ({ page }) => {
    await signIn(page);
    await page.goto('/settings');
    await page.getByRole('tab', { name: /connection/i }).click();
    const listsConnection = page.locator('li').filter({ hasText: 'Stub Lists' });
    await expect(listsConnection).toBeVisible();
    await listsConnection.getByText('Stub Lists', { exact: true }).click();
    await page.waitForTimeout(500);

    await page.goto('/reading-lists/list-a');
    await expect(page.getByRole('heading', { name: 'E2E Reading List' })).toBeVisible();
    await expect(page.getByRole('link', { name: /BD-A|series-a/i })).toBeVisible();
  });
});
