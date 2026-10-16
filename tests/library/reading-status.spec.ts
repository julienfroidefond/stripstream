import { expect, test } from '@playwright/test';

const hasIsolatedDatabase = Boolean(process.env.E2E_DATABASE_URL);

test.use({ storageState: 'tests/.auth/stream.json' });

test.describe('Reading statuses', () => {
  test.skip(!hasIsolatedDatabase, 'Local E2E database unavailable');
  test.describe.configure({ mode: 'serial' });

  test('marks a book read and unread from the series card', async ({ page }) => {
    await page.goto('/settings');
    await page.getByRole('tab', { name: /connection|connexion/i }).click();
    const komgaConnection = page.getByTestId('connection-komga-stub-a');
    await expect(komgaConnection).toBeVisible();
    await komgaConnection.getByText('Stub A', { exact: true }).click();
    await expect(komgaConnection.getByRole('radio')).toBeChecked();
    await page.goto('/series/series-a');

    const markRead = page.getByTestId('mark-as-read').first();
    const markUnread = page.getByTestId('mark-as-unread').first();
    if (await markRead.isVisible({ timeout: 15_000 }).catch(() => false)) {
      await markRead.click();
    } else {
      // The fixture can retain progress when another serial scenario has
      // already touched the same book; normalize it to unread first.
      await expect(markUnread).toBeVisible({ timeout: 15_000 });
      await expect(markUnread).toBeEnabled({ timeout: 15_000 });
      const unreadAction = page.waitForResponse(
        (r) => r.request().method() === 'POST' && !!r.request().headers()['next-action']
      );
      await markUnread.click();
      await unreadAction;
      await page.reload();
      await expect(markRead).toBeVisible({ timeout: 15_000 });
      await markRead.click();
    }

    // Le succès remplace l'action disponible : le bouton "marquer comme lu"
    // ne doit pas redevenir activable après son clic.
    await expect(markUnread).toBeVisible({ timeout: 15_000 });
    await page.reload();
    await expect(markUnread).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('mark-as-unread').first()).toBeVisible();

    await page.getByTestId('mark-as-unread').first().click();
    await expect(markRead).toBeVisible({ timeout: 15_000 });
    await page.reload();
    await expect(page.getByText(/unread|non lu/i).first()).toBeVisible();
  });

  test('marks a book read when reaching its last reader page', async ({ page }) => {
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
    const directionLabel = await page.getByRole('button', { name: /direction|sens/i }).getAttribute('aria-label');
    await page.keyboard.press(/right to left|droite (?:à|vers) gauche|rtl/i.test(directionLabel ?? '') ? 'ArrowLeft' : 'ArrowRight');
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.goto('/series/series-a');
    await expect(page.getByTestId('mark-as-unread').first()).toBeVisible({ timeout: 15_000 });
  });

  test('marks the entire series read and unread from the header', async ({ page }) => {
    await page.goto('/settings');
    await page.getByRole('tab', { name: /connection|connexion/i }).click();
    const komgaConnection = page.getByTestId('connection-komga-stub-a');
    await expect(komgaConnection).toBeVisible();
    await komgaConnection.getByText('Stub A', { exact: true }).click();
    await expect(komgaConnection.getByRole('radio')).toBeChecked();

    await page.goto('/series/series-a');
    const markAllRead = page.getByTestId('series-mark-all-read');
    const markAllUnread = page.getByTestId('series-mark-all-unread');
    await expect(markAllUnread).toBeVisible({ timeout: 15_000 });

    // Normalise the fixture: a previous journey may have left the book read.
    await markAllUnread.click();
    const resetAction = page.waitForResponse(
      (r) => r.request().method() === 'POST' && !!r.request().headers()['next-action']
    );
    await page.getByTestId('series-mark-all-unread-confirm').click();
    await resetAction;

    // The header action marks every book of the series as read.
    const readAction = page.waitForResponse(
      (r) => r.request().method() === 'POST' && !!r.request().headers()['next-action']
    );
    await markAllRead.click();
    await readAction;
    await page.reload();
    await expect(page.getByTestId('mark-as-unread').first()).toBeVisible({ timeout: 15_000 });

    // Resetting is destructive and must go through the confirmation dialog.
    await page.getByTestId('series-mark-all-unread').click();
    const unreadAction = page.waitForResponse(
      (r) => r.request().method() === 'POST' && !!r.request().headers()['next-action']
    );
    await page.getByTestId('series-mark-all-unread-confirm').click();
    await unreadAction;
    await page.reload();
    await expect(page.getByTestId('mark-as-read').first()).toBeVisible({ timeout: 15_000 });
  });
});
