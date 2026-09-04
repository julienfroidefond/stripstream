import { test, expect } from '@playwright/test';

test.describe('Login', () => {
  test('login page renders sign in and sign up tabs', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('tab', { name: /sign in/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /sign up/i })).toBeVisible();
  });
});

// ─── Libraries ───────────────────────────────────────────────────────────────
