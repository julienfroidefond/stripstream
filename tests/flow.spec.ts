import { test, expect } from '@playwright/test';

test.describe('Stripstream prod flow', () => {
  test('home loads and redirects to /login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });

  test('login page has Sign in + Sign up tabs', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('tab', { name: 'Sign in' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Sign up' })).toBeVisible();
  });

  test('library page loads without 5xx', async ({ page }) => {
    const res = await page.goto('/library');
    expect(res?.status() ?? 500).toBeLessThan(500);
  });

  test('series route loads without 5xx', async ({ page }) => {
    const res = await page.goto('/series/test-series-id');
    expect(res?.status() ?? 500).toBeLessThan(500);
  });

  test('book route loads without 5xx', async ({ page }) => {
    const res = await page.goto('/books/test-book-id');
    expect(res?.status() ?? 500).toBeLessThan(500);
  });

  test('admin route loads or redirects', async ({ page }) => {
    const res = await page.goto('/admin');
    expect(res?.status() ?? 500).toBeLessThan(500);
  });

  test('pages return non-empty HTML', async ({ page }) => {
    for (const path of ['/', '/library', '/series/x', '/books/x', '/admin']) {
      await page.goto(path);
      const html = await page.content();
      expect(html.length).toBeGreaterThan(500);
    }
  });
});
