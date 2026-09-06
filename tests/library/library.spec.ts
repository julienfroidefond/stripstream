import { expect, test } from '@playwright/test';
import { hasE2eCredentials, signIn } from '../helpers/auth';

async function openFirstLibrary(page: import('@playwright/test').Page) {
  await page.goto('/libraries/lib-a');
  await expect(page).toHaveURL(/\/libraries\/lib-a/);
}

test.describe('Library browsing', () => {
  test.skip(!hasE2eCredentials, 'Local E2E account unavailable');

  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await openFirstLibrary(page);
  });

  test('synchronizes search with the URL and can clear it', async ({ page }) => {
    const search = page.getByTestId('library-search');
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

  test('toggles unread and missing filters through the URL', async ({ page }) => {
    const unread = page.getByTestId('library-filter-unread');
    await unread.click();
    await expect(page).toHaveURL(/unread=true/);

    const showAll = page.getByTestId('library-filter-unread');
    await showAll.click();
    await expect(page).toHaveURL(/unread=false/);

    const missing = page.getByTestId('library-filter-missing');
    await missing.click();
    await expect(page).toHaveURL(/missing=true/);
  });

  test('navigates between library pages when the result set spans pages', async ({ page }) => {
    const pagination = page.getByTestId('pagination');
    test.skip((await pagination.count()) === 0, 'The provider result set fits on one page');

    await expect(page.getByTestId('pagination-next')).toBeEnabled();
    await page.getByTestId('pagination-next').click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByRole('button', { name: 'Page 2' })).toHaveAttribute(
      'aria-current',
      'page'
    );
  });

  test('opens a real series card when content exists', async ({ page }) => {
    const series = page.locator('a[href^="/series/"]').first();
    test.skip((await series.count()) === 0, 'The library contains no series');
    await series.click();
    await expect(page).toHaveURL(/\/series\/[^/]+/);
    await expect(page.getByRole('heading').first()).toBeVisible();
  });
});
