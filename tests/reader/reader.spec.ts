import { expect, test } from '@playwright/test';

const hasE2eCredentials = Boolean(process.env.E2E_DATABASE_URL);

async function openFirstBook(page: import('@playwright/test').Page) {
  await page.goto('/books/book-a');
  await expect(page).toHaveURL(/\/books\/book-a/);
}

test.use({ storageState: 'tests/.auth/reader.json' });

test.describe('Reader', () => {
  test.skip(!hasE2eCredentials, 'Local E2E account unavailable');

  test.beforeEach(async ({ page }) => {
    await openFirstBook(page);
  });

  test('offers page, direction, display and information controls', async ({ page }) => {
    await page.locator('img[alt^="Page "]').first().click({ position: { x: 10, y: 10 } });
    await expect(page.getByTestId('reader-toggle-double-page')).toBeVisible();
    await expect(page.getByTestId('reader-toggle-direction')).toBeVisible();
    await expect(page.getByTestId('reader-info')).toBeVisible();
    await expect(page.getByTestId('reader-page-navigation')).toBeVisible();
  });

  test('opens reader information without navigating away', async ({ page }) => {
    const readerUrl = page.url();
    await page.locator('img[alt^="Page "]').first().click({ position: { x: 10, y: 10 } });
    await page.getByTestId('reader-info').click();

    await expect(page.getByRole('dialog')).toBeVisible();
    expect(page.url()).toBe(readerUrl);
  });
});
