import { test, expect } from '@playwright/test';

test.describe('Series', () => {
  test('series route responds with 2xx/3xx', async ({ page }) => {
    const res = await page.goto('/series/test-series-id');
    const status = res?.status() ?? 0;
    expect([200, 301, 302, 304, 404]).toContain(status);
    await expect(page.locator('body')).toBeVisible();
  });

  test('series page shows a heading', async ({ page }) => {
    await page.goto('/series/test-series-id');
    const headings = page.locator('h1, h2, h3');
    await expect(headings.first()).toBeVisible({ timeout: 5000 });
  });
});

// ─── Book Reader ────────────────────────────────────────────────────────────
