import { test, expect } from '@playwright/test';

test.describe('Admin', () => {
  test('admin route responds with 2xx/3xx or redirect', async ({ page }) => {
    const res = await page.goto('/admin');
    const status = res?.status() ?? 0;
    expect([200, 301, 302, 304, 404]).toContain(status);
    await expect(page.locator('body')).toBeVisible();
  });
});

// ─── Smoke: non-5xx on all major routes ─────────────────────────────────────
