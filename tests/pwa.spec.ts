import { expect, test } from '@playwright/test';

test.describe('Public PWA resources', () => {
  test('serves a valid web app manifest', async ({ request }) => {
    const response = await request.get('/manifest.json');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toMatch(/application\/(manifest\+)?json/);

    const manifest = await response.json();
    expect(manifest.name).toBeTruthy();
    expect(manifest.start_url).toBeTruthy();
    expect(manifest.icons?.length).toBeGreaterThan(0);
  });

  test('serves the offline fallback and service worker', async ({ request }) => {
    const [offline, worker] = await Promise.all([
      request.get('/offline.html'),
      request.get('/sw.js'),
    ]);

    expect(offline.status()).toBe(200);
    expect(await offline.text()).toContain('<html');
    expect(worker.status()).toBe(200);
    expect(worker.headers()['content-type']).toMatch(/javascript/);
  });
});
