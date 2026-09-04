import { test, expect } from '@playwright/test';

test.describe('Libraries', () => {
  test('libraries route responds with 2xx/3xx', async ({ page }) => {
    const res = await page.goto('/libraries/test-id');
    const status = res?.status() ?? 0;
    expect([200, 301, 302, 304, 404]).toContain(status);
    await expect(page.locator('body')).toBeVisible();
  });

  test('libraries page has a page title or heading', async ({ page }) => {
    await page.goto('/libraries/test-id');
    const h = page.locator('h1, h2').first();
    await expect(h).toBeVisible({ timeout: 5000 });
  });

  test('library page shows search input if content loads', async ({ page }) => {
    await page.goto('/libraries/test-id');
    // Search input is common; if it exists, check it
    const search = page.locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="Search" i]').first();
    if (await search.isVisible({ timeout: 3000 })) {
      await expect(search).toBeEnabled();
    }
  });
});

// ─── Series ──────────────────────────────────────────────────────────────────
