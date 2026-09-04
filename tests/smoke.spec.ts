import { test, expect } from '@playwright/test';

test.describe('Smoke', () => {
  test('home redirects to login when unauthenticated', async ({ page }) => {
    const response = await page.goto('/', { waitUntil: 'networkidle' });
    expect(response, 'navigation response').not.toBeNull();
    expect(page.url(), 'final URL').toContain('/login');
  });

  test('login page renders', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' });
    await expect(page).toHaveTitle(/Stripstream/i);
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('production base URL is reachable over HTTPS', async ({ request }) => {
    const res = await request.get('/');
    expect(res.status(), 'home status').toBeLessThan(500);
  });

  test('login page navigates without errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    await page.goto('/login', { waitUntil: 'networkidle' });
    await page.waitForLoadState('domcontentloaded');

    expect(consoleErrors, 'uncaught page errors').toEqual([]);
  });
});