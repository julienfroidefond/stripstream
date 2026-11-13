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

    // Les réglages basculent de façon optimiste et l'écriture part en
    // arrière-plan (sérialisée, éventuellement regroupée) : recharger pendant
    // qu'une action serveur est en vol l'annulerait. On suit les POST de la page.
    let inFlight = 0;
    let settled = 0;
    const isAction = (method: string, url: string) => method === 'POST' && url.includes('/settings');
    page.on('request', (request) => {
      if (isAction(request.method(), request.url())) inFlight += 1;
    });
    const done = (request: import('@playwright/test').Request) => {
      if (!isAction(request.method(), request.url())) return;
      inFlight -= 1;
      settled += 1;
    };
    page.on('requestfinished', done);
    page.on('requestfailed', done);

    await page.locator('#reading-dir-rtl').click();
    await expect(page.locator('#reading-dir-rtl')).toHaveAttribute('data-state', 'checked');

    await page.locator('#reader-bg-cream').click({ force: true });
    await expect(page.locator('#reader-bg-cream')).toHaveAttribute('data-state', 'checked');

    const doublePage = page.locator('#double-page-mode');
    await page.locator('label[for="double-page-mode"]').click();
    await expect(doublePage).toBeChecked();

    await expect.poll(() => settled, { timeout: 10_000 }).toBeGreaterThan(0);
    await expect.poll(() => inFlight, { timeout: 10_000 }).toBe(0);
    await page.reload();
    await expect(page.locator('#reading-dir-rtl')).toHaveAttribute('data-state', 'checked');
    await expect(page.locator('#reader-bg-cream')).toHaveAttribute('data-state', 'checked');
    await expect(page.locator('#double-page-mode')).toBeChecked();
  });

  test('creates, edits, and deletes a Komga connection', async ({ page }) => {
    await openSettingsTab(page, /connection|connexion/i);
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
