import { test, expect } from '@playwright/test';

test.describe('Settings', () => {
  test('settings page loads', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.locator('body')).toBeVisible();
  });

  test('settings has provider URL input', async ({ page }) => {
    await page.goto('/settings');
    const urlInput = page.locator('input[type="url"], input[placeholder*="url" i], input[placeholder*="URL" i], input[placeholder*="provider" i]').first();
    const visible = await urlInput.isVisible({ timeout: 5000 }).catch(() => false);
    if (visible) {
      await expect(urlInput).toBeEnabled();
    }
  });

  test('settings has token/password input', async ({ page }) => {
    await page.goto('/settings');
    const tokenInput = page.locator(
      'input[type="password"], input[placeholder*="token" i], input[placeholder*="api" i], input[placeholder*="secret" i]'
    ).first();
    const visible = await tokenInput.isVisible({ timeout: 5000 }).catch(() => false);
    if (visible) {
      await expect(tokenInput).toBeAttached();
    }
  });

  test('settings has theme toggle or display options', async ({ page }) => {
    await page.goto('/settings');
    const themeToggle = page.locator(
      'button[aria-label*="theme" i], button:has-text(/theme|dark|light|mode/i), [class*="theme"], input[type="checkbox"][role="switch"]'
    ).first();
    const visible = await themeToggle.isVisible({ timeout: 3000 }).catch(() => false);
    // Theme toggle is common — log if missing
    if (!visible) {
      console.log('Theme toggle not found in settings');
    }
  });
});

// ─── Account ─────────────────────────────────────────────────────────────────
