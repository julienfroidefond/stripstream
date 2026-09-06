import { expect, test } from '@playwright/test';

const hasIsolatedDatabase = Boolean(process.env.E2E_DATABASE_URL);
const email = 'e2e-stream@test.local';
const password = 'E2eStrong!123';

async function signIn(page: import('@playwright/test').Page) {
  await page.goto('/login');
  const form = page.locator('form').first();
  const emailInput = form.locator('#email');
  const passwordInput = form.locator('#password');
  await expect(emailInput).toBeEditable();
  await emailInput.fill(email);
  await passwordInput.fill(password);
  await expect(emailInput).toHaveValue(email);
  await expect(passwordInput).toHaveValue(password);
  await form.getByRole('button', { name: /sign in|se connecter/i }).click();
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
}

test.describe('Reading statuses', () => {
  test.skip(!hasIsolatedDatabase, 'Local E2E database unavailable');
  test.describe.configure({ mode: 'serial' });

  test('marks a book read and unread from the series card', async ({ page }) => {
    await signIn(page);
    await page.goto('/settings');
    await page.getByRole('tab', { name: /connection/i }).click();
    const komgaConnection = page.getByTestId('connection-komga-stub-a');
    await expect(komgaConnection).toBeVisible();
    await komgaConnection.getByText('Stub A', { exact: true }).click();
    await page.waitForTimeout(500);
    await page.goto('/series/series-a');

    const markRead = page.getByTestId('mark-as-read').first();
    const markUnread = page.getByTestId('mark-as-unread').first();
    if (await markRead.isVisible({ timeout: 15_000 }).catch(() => false)) {
      await markRead.click();
    } else {
      // The fixture can retain progress when another serial scenario has
      // already touched the same book; normalize it to unread first.
      await expect(markUnread).toBeVisible({ timeout: 15_000 });
      await markUnread.click();
      await expect(markUnread).toBeEnabled({ timeout: 15_000 });
      await page.reload();
      await expect(markRead).toBeVisible({ timeout: 15_000 });
      await markRead.click();
    }

    await expect(markRead).toBeEnabled({ timeout: 15_000 });
    await page.reload();
    await expect(markUnread).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('mark-as-unread').first()).toBeVisible();

    await page.getByTestId('mark-as-unread').first().click();
    await page.reload();
    await expect(page.getByText(/unread|non lu/i).first()).toBeVisible();
  });

  test('marks a book read when reaching its last reader page', async ({ page }) => {
    await signIn(page);
    await page.goto('/books/book-a');
    const currentPage = page.locator('img[alt^="Page "]').first();
    await expect(currentPage).toBeVisible({ timeout: 15_000 });
    await currentPage.click({ position: { x: 10, y: 10 } });
    await page.getByRole('button', { name: /thumbnails|vignettes/i }).click();
    await page.locator('#thumbnail-1').click();
    await expect(page.getByRole('img', { name: 'Page 1', exact: true })).toBeVisible({ timeout: 15_000 });

    await page.locator('#thumbnail-10').click();
    const lastPage = page.getByRole('img', { name: 'Page 10', exact: true });
    await expect(lastPage).toBeVisible({ timeout: 10_000 });
    await lastPage.click({ position: { x: 10, y: 10 } });
    await page.getByRole('button', { name: /thumbnails|vignettes/i }).click({ force: true });
    const directionLabel = await page.getByRole('button', { name: /direction/i }).getAttribute('aria-label');
    await page.keyboard.press(/right to left|droite (?:à|vers) gauche|rtl/i.test(directionLabel ?? '') ? 'ArrowLeft' : 'ArrowRight');
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.goto('/series/series-a');
    await expect(page.getByTestId('mark-as-unread').first()).toBeVisible({ timeout: 15_000 });
  });
});
