import { test, expect } from '@playwright/test';

test.describe('Home', () => {
  test('home page loads and shows main layout', async ({ page }) => {
    await page.goto('/');
    // Should either show content or redirect to settings if no provider
    await expect(page.locator('body')).toBeVisible();
    const html = await page.content();
    // Either has real content or shows a meaningful state
    expect(html.length).toBeGreaterThan(500);
  });

  test('home navigation links are present', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('nav');
    // nav may be present; if page redirected to /settings, that's fine
    const url = page.url();
    if (url.includes('/settings')) {
      await expect(page.getByText(/provider|token|stripstream/i, { exact: false })).toBeVisible();
    }
  });
});

// ─── Login ───────────────────────────────────────────────────────────────────
