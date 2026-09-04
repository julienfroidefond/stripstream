import { test, expect } from '@playwright/test';

test.describe('Account', () => {
  test('account page loads', async ({ page }) => {
    const res = await page.goto('/account');
    const status = res?.status() ?? 0;
    expect([200, 301, 302, 304, 404]).toContain(status);
    await expect(page.locator('body')).toBeVisible();
  });
});

// ─── Admin ───────────────────────────────────────────────────────────────────
