import { expect, test } from '@playwright/test';
import { hasE2eCredentials } from '../helpers/auth';

type ImagePerformanceSample = {
  resources: Array<{ name: string; duration: number; transferSize: number }>;
  layoutShift: number;
};

async function collectImagePerformance(page: import('@playwright/test').Page): Promise<ImagePerformanceSample> {
  await page.waitForFunction(() => {
    const images = Array.from(document.images).filter((image) =>
      (image.src.includes('/api/komga/images/') || image.src.includes('/api/stripstream/images/')) &&
      image.getBoundingClientRect().top < window.innerHeight &&
      image.getBoundingClientRect().bottom > 0
    );
    return images.some((image) => image.complete && image.naturalWidth > 0);
  });

  return page.evaluate(() => {
    const resources = performance
      .getEntriesByType('resource')
      .filter((entry): entry is PerformanceResourceTiming =>
        entry instanceof PerformanceResourceTiming &&
        (entry.name.includes('/api/komga/images/') || entry.name.includes('/api/stripstream/images/'))
      )
      .map(({ name, duration, transferSize }) => ({ name, duration, transferSize }));

    const layoutShift = (window as Window & { __e2eImageLayoutShift?: number }).__e2eImageLayoutShift ?? 0;
    return { resources, layoutShift };
  });
}

test.use({ storageState: 'tests/.auth/stream.json' });

test.describe('Home functional journeys', () => {
  test.skip(!hasE2eCredentials, 'Local E2E account unavailable');

  async function goToReaderPage(page: import('@playwright/test').Page, pageNumber: number) {
    const currentPage = page.locator('img[alt^="Page "]').first();
    await expect(currentPage).toBeVisible({ timeout: 15_000 });
    await currentPage.click({ position: { x: 10, y: 10 } });
    const pageInput = page.getByRole('group', { name: 'Navigation par numéro de page' });
    await expect(pageInput).toContainText(/\d+\/10/);
    await pageInput.getByRole('button').click();
    await page.getByRole('textbox', { name: 'Entrez un numéro de page' }).fill(String(pageNumber));
    await page.getByRole('textbox', { name: 'Entrez un numéro de page' }).press('Enter');
  }

  async function selectConnection(page: import('@playwright/test').Page, name: string) {
    await page.goto('/settings');
    await page.getByRole('tab', { name: /connection/i }).click();
    const connectionId = `connection-${name === 'Stub Lists' ? 'stripstream' : 'komga'}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    const connection = page.getByTestId(connectionId);
    await expect(connection).toBeVisible();
    await connection.getByText(name, { exact: true }).click();
    await expect(connection.getByRole('radio')).toBeChecked({ timeout: 15_000 });
  }

  test('shows continue reading and resumes the last viewed page', async ({ page, request }) => {
    await page.goto('/books/book-a');
    await goToReaderPage(page, 2);
    await expect(page.locator('img[alt="Page 2"]')).toBeVisible({ timeout: 10_000 });
    // The sync mutation is a Server Action; assert the resulting provider state
    // (page 2) instead of waiting on a debounce sleep.
    await expect
      .poll(
        () =>
          request
            .get('http://127.0.0.1:8444/api/v1/books/book-a')
            .then((r) => r.json())
            .then((j) => j.readProgress?.page),
        { timeout: 10_000 }
      )
      .toBe(2);

    await page.goto(`/?e2e_refresh=${Date.now()}`);
    const resume = page.getByTestId('home-resume-reading').first();
    await expect(resume).toBeVisible({ timeout: 15_000 });
    await resume.click();
    await expect(page).toHaveURL(/\/books\/book-a/);
  });

  test('keeps carousel images stable and reuses the HTTP cache after a reload', async ({ page }, testInfo) => {
    await page.addInitScript(() => {
      const target = window as Window & { __e2eImageLayoutShift?: number };
      target.__e2eImageLayoutShift = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as PerformanceEntry[]) {
          const shift = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
          if (!shift.hadRecentInput) target.__e2eImageLayoutShift! += shift.value ?? 0;
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });

    // storageState only injects cookies; navigate so the init script below and
    // the resource-timing reset run against a real document.
    await page.goto('/');
    await page.evaluate(() => {
      performance.clearResourceTimings();
      (window as Window & { __e2eImageLayoutShift?: number }).__e2eImageLayoutShift = 0;
    });
    await page.goto('/');
    const cold = await collectImagePerformance(page);
    expect(cold.resources.length).toBeGreaterThan(0);
    expect(cold.layoutShift).toBe(0);

    await page.evaluate(() => {
      performance.clearResourceTimings();
      (window as Window & { __e2eImageLayoutShift?: number }).__e2eImageLayoutShift = 0;
    });
    await page.reload();
    const warm = await collectImagePerformance(page);

    expect(warm.resources.length).toBeGreaterThan(0);
    expect(warm.resources.every((resource) => resource.transferSize === 0)).toBe(true);
    expect(warm.layoutShift).toBe(0);

    await testInfo.attach('image-performance.json', {
      body: JSON.stringify({ cold, warm }, null, 2),
      contentType: 'application/json',
    });
    testInfo.annotations.push({
      type: 'image-performance',
      description: JSON.stringify({ cold, warm }),
    });
  });

  test('shows reading lists on the home page and opens one', async ({ page }) => {
    await selectConnection(page, 'Stub Lists');
    await page.goto('/');

    const list = page.getByTestId('home-reading-list-list-a').first();
    await expect(list).toBeVisible({ timeout: 15_000 });
    await list.click();
    await expect(page).toHaveURL(/\/reading-lists\/list-a/);
    await expect(page.getByRole('heading', { name: 'E2E Reading List' })).toBeVisible();

    await selectConnection(page, 'Stub A');
  });
});
