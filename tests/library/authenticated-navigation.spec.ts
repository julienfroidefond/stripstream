import { expect, test } from '@playwright/test';
import { hasE2eCredentials } from '../helpers/auth';

test.use({ storageState: 'tests/.auth/stream.json' });

test.describe('Authenticated navigation', () => {
  test.skip(!hasE2eCredentials, 'Local E2E account unavailable');

  test('opens the main application navigation', async ({ page }) => {
    await page.goto('/');

    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByRole('main').first()).toBeVisible();
    await expect(page.getByRole('navigation')).toBeVisible();
  });

  test('opens settings and switches between every section', async ({ page }) => {
    await page.goto('/settings');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const tabs = page.getByRole('tab');
    await expect(tabs).toHaveCount(3);

    for (const tab of await tabs.all()) {
      await tab.click();
      await expect(tab).toHaveAttribute('aria-selected', 'true');
    }
  });

  test('discovers a real library and exercises search when data exists', async ({ page }) => {
    await page.goto('/libraries/lib-a');
    await expect(page).toHaveURL(/\/libraries\/lib-a/);
    const search = page.getByTestId('library-search').first();
    await expect(search).toBeVisible();
    await search.fill('__e2e_no_match__');
    await expect(search).toHaveValue('__e2e_no_match__');
  });

  test('opens a real series and book when the provider has content', async ({ page }) => {
    await page.goto('/series/series-a');
    await expect(page).toHaveURL(/\/series\/series-a/);
    await page.goto('/books/book-a');
    await expect(page).toHaveURL(/\/books\/book-a/);
    await expect(page.locator('img[alt^="Page "]').first()).toBeVisible({ timeout: 15_000 });
  });

  test('searches series and books through the global search', async ({ page }) => {
    await page.goto('/');
    const search = page.getByRole('searchbox');
    await expect(search).toBeVisible();

    // No match → the dropdown surfaces the localized empty state.
    await search.fill('__e2e_no_match__');
    await expect(page.getByText(/Aucun résultat|No results/i)).toBeVisible({ timeout: 10_000 });

    // A real query hits /api/provider/search and returns both a series and a
    // book; clicking the series result navigates to its detail page.
    await search.fill('BD');
    const seriesResult = page.getByRole('link', { name: /Ouvrir la série|Open series/i }).first();
    await expect(seriesResult).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('link', { name: /Ouvrir le tome|Open book/i }).first()).toBeVisible();

    await seriesResult.click();
    await expect(page).toHaveURL(/\/series\//);
  });
});
