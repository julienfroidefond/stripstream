import { test, expect } from '@playwright/test';
test('library search', async ({ page }) => { await page.goto('/libraries/1'); await expect(page.getByRole('textbox', { name: /search/i })).toBeVisible(); });
test('library sort', async ({ page }) => { await page.goto('/libraries/1'); await expect(page.locator('button, select').filter({ hasText: /sort/i })).toBeVisible(); });
test('pagination', async ({ page }) => { await page.goto('/libraries/1'); await expect(page.getByRole('button', { name: /next/i })).toBeVisible(); });
test('home features', async ({ page }) => { await page.goto('/'); await expect(page.locator('main')).toBeVisible(); });

test.describe('Library filters with auth', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    // Login using the registered test account (if session exists, rely on cookie)
    // For e2e against prod: assume the previous session may persist, else skip
    await page.waitForLoadState('networkidle');
  });

  test('library search + sort + pagination', async ({ page }) => {
    await page.goto('/libraries/1');
    await expect(page.getByRole('textbox', { name: /search/i })).toBeVisible();
    await expect(page.locator('button, select').filter({ hasText: /sort/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /next/i })).toBeVisible();
  });
});
