import { expect, test } from '@playwright/test';
import { hasE2eCredentials, signIn } from './helpers/auth';

async function openFirstBook(page: import('@playwright/test').Page) {
  await page.goto('/');
  const library = page.locator('a[href^="/libraries/"]').first();
  test.skip((await library.count()) === 0, 'The E2E account has no configured library');
  await library.click();
  const series = page.locator('a[href^="/series/"]').first();
  test.skip((await series.count()) === 0, 'The library contains no series');
  await series.click();
  const book = page.locator('a[href^="/books/"]').first();
  test.skip((await book.count()) === 0, 'The series contains no readable book');
  await book.click();
  await expect(page).toHaveURL(/\/books\/[^/]+/);
}

test.describe('Reader', () => {
  test.skip(!hasE2eCredentials, 'Set E2E_USER_EMAIL and E2E_USER_PASSWORD');

  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await openFirstBook(page);
  });

  test('offers page, direction, display and information controls', async ({ page }) => {
    await page.locator('main').click({ position: { x: 10, y: 10 } });
    await expect(page.getByRole('button', { name: /double page/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /direction/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /information|info/i })).toBeVisible();
    await expect(page.getByRole('spinbutton')).toBeVisible();
  });

  test('opens reader information without navigating away', async ({ page }) => {
    const readerUrl = page.url();
    await page.locator('main').click({ position: { x: 10, y: 10 } });
    await page.getByRole('button', { name: /information|info/i }).click();

    await expect(page.getByRole('dialog')).toBeVisible();
    expect(page.url()).toBe(readerUrl);
  });
});
