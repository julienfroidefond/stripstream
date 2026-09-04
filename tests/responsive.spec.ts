import { test, expect } from '@playwright/test';

const VIEWPORTS = [
  { name: 'mobile-portrait', width: 375, height: 667 },
  { name: 'tablet-portrait', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 800 },
];

for (const vp of VIEWPORTS) {
  test(`login page renders at ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    const resp = await page.goto('/login', { waitUntil: 'networkidle' });
    expect(resp, 'navigation response').not.toBeNull();
    expect(resp!.status(), 'response status').toBeLessThan(500);

    await expect(page.locator('form')).toBeVisible();
    await expect(page.getByRole('tab')).toHaveCount(2);

    const viewport = page.viewportSize();
    expect(viewport?.width, 'viewport width honored').toBe(vp.width);
    expect(viewport?.height, 'viewport height honored').toBe(vp.height);
  });
}

test('no horizontal overflow at mobile width', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/login', { waitUntil: 'networkidle' });

  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      innerWidth: window.innerWidth,
    };
  });

  expect(overflow.scrollWidth, 'document width').toBeLessThanOrEqual(overflow.innerWidth + 1);
});
