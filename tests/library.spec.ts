import { expect, test } from '@playwright/test';
import { hasE2eCredentials, signIn } from './helpers/auth';

async function openFirstLibrary(page: import('@playwright/test').Page) {
  await page.goto('/');
  const link = page.locator('a[href^="/libraries/"]').first();
  test.skip((await link.count()) === 0, 'The E2E account has no configured library');
  await link.click();
  await expect(page).toHaveURL(/\/libraries\/[^/]+/);
}

test.describe('Library browsing', () => {
  test.skip(!hasE2eCredentials, 'Local E2E account unavailable');

  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await openFirstLibrary(page);
  });

  test('synchronizes search with the URL and can clear it', async ({ page }) => {
    const search = page.getByRole('searchbox');
    await search.fill('__e2e_no_match__');
    await expect(page).toHaveURL(/search=__e2e_no_match__/);

    await search.fill('');
    await expect(page).not.toHaveURL(/search=/);
  });

  test('changes sorting without leaving the library', async ({ page }) => {
    const path = new URL(page.url()).pathname;
    const sort = page.getByRole('button', { name: /sort|tri|title|titre|latest|récent/i }).first();
    await expect(sort).toBeVisible();
    await sort.click();

    await expect(page).toHaveURL((url) => url.pathname === path && url.searchParams.has('sort'));
  });

  test('opens a real series card when content exists', async ({ page }) => {
    const series = page.locator('a[href^="/series/"]').first();
    test.skip((await series.count()) === 0, 'The library contains no series');
    await series.click();
    await expect(page).toHaveURL(/\/series\/[^/]+/);
    await expect(page.getByRole('heading').first()).toBeVisible();
  });
});
