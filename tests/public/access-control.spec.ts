import { expect, test } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });

const protectedRoutes = [
  '/',
  '/settings',
  '/account',
  '/admin',
  '/libraries/library-id?sort=latest&page=2',
  '/series/series-id',
  '/books/book-id',
  '/reading-lists/list-id',
];

test.describe('Access control', () => {
  for (const route of protectedRoutes) {
    test(`redirects ${route} to sign in and preserves the destination`, async ({ page }) => {
      await page.goto(route);

      await expect(page).toHaveURL((url) => {
        return url.pathname === '/login' && url.searchParams.get('from') === route;
      });
      await expect(page.locator('form')).toBeVisible();
    });
  }

  test('returns a structured 401 for a protected API route', async ({ request }) => {
    const response = await request.get('/api/stripstream/search?q=batman');

    expect(response.status()).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Unauthorized access',
        name: 'Unauthorized',
      },
    });
  });

  test('keeps authentication and health endpoints public', async ({ request }) => {
    const [session, health] = await Promise.all([
      request.get('/api/auth/session'),
      request.get('/api/health'),
    ]);

    expect(session.status()).toBe(200);
    expect(health.status()).not.toBe(401);
  });
});
