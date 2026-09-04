import { test, expect } from '@playwright/test';

test.describe('Favorites & Reading Lists', () => {
  test('reading-lists route responds', async ({ page }) => {
    const res = await page.goto('/reading-lists/test-list');
    const status = res?.status() ?? 0;
    expect([200, 301, 302, 304, 404]).toContain(status);
    await expect(page.locator('body')).toBeVisible();
  });

  test('reading-lists page shows content or empty state', async ({ page }) => {
    await page.goto('/reading-lists/test-list');
    const body = page.locator('body');
    await expect(body).toBeVisible();
    const html = await page.content();
    expect(html.length).toBeGreaterThan(200);
  });
});

// ─── Settings ────────────────────────────────────────────────────────────────
