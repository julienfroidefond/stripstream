import { expect, test } from '@playwright/test';
import { SPLASH_SCREENS } from '../../src/constants/splashScreens';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Public PWA resources', () => {
  test('serves a valid web app manifest', async ({ request }) => {
    const response = await request.get('/manifest.json');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toMatch(/application\/(manifest\+)?json/);

    const manifest = await response.json();
    expect(manifest.name).toBeTruthy();
    expect(manifest.start_url).toBeTruthy();
    expect(manifest.icons?.length).toBeGreaterThan(0);
    // iOS reads launch images from the document head, not from this key.
    expect(manifest.splash_screens).toBeUndefined();
  });

  test('declares and serves every iOS launch image', async ({ page, request }) => {
    await page.goto('/login');

    const links = page.locator('head link[rel="apple-touch-startup-image"]');
    await expect(links).toHaveCount(SPLASH_SCREENS.length);

    for (const screen of SPLASH_SCREENS) {
      await expect(
        page.locator(`head link[rel="apple-touch-startup-image"][href="${screen.href}"]`)
      ).toHaveAttribute('media', screen.media);
    }

    const responses = await Promise.all(SPLASH_SCREENS.map((screen) => request.head(screen.href)));
    responses.forEach((response, index) => {
      expect(response.status(), SPLASH_SCREENS[index].href).toBe(200);
    });
  });

  test('keeps the route wrapper visible before client scripts hydrate', async ({ page }) => {
    await page.route(/\/_next\/static\/.*\.js/, (route) => route.abort());
    await page.goto('/login');

    const routeContent = page.locator('[data-route-enter]');
    await expect(routeContent).toHaveCount(1);
    await expect(routeContent).toHaveCSS('opacity', '1');
  });
});
