import { expect, test } from '@playwright/test';
import { hasE2eCredentials, signIn } from './helpers/auth';

test.describe('Authenticated navigation', () => {
  test.skip(!hasE2eCredentials, 'Set E2E_USER_EMAIL and E2E_USER_PASSWORD to run authenticated journeys');

  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test('opens the main application navigation', async ({ page }) => {
    await page.goto('/');

    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('main')).toBeVisible();
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
    await page.goto('/');
    const libraryLink = page.locator('a[href^="/libraries/"]').first();
    test.skip((await libraryLink.count()) === 0, 'The E2E account has no configured library');

    await libraryLink.click();
    await expect(page).toHaveURL(/\/libraries\/[^/]+/);
    const search = page.getByRole('textbox', { name: /search|recherch/i });
    await expect(search).toBeVisible();
    await search.fill('__e2e_no_match__');
    await expect(search).toHaveValue('__e2e_no_match__');
  });

  test('opens a real series and book when the provider has content', async ({ page }) => {
    await page.goto('/');
    const libraryLink = page.locator('a[href^="/libraries/"]').first();
    test.skip((await libraryLink.count()) === 0, 'The E2E account has no configured library');
    await libraryLink.click();

    const seriesLink = page.locator('a[href^="/series/"]').first();
    test.skip((await seriesLink.count()) === 0, 'The configured library contains no series');
    await seriesLink.click();
    await expect(page).toHaveURL(/\/series\/[^/]+/);

    const bookLink = page.locator('a[href^="/books/"]').first();
    test.skip((await bookLink.count()) === 0, 'The series contains no readable book');
    await bookLink.click();
    await expect(page).toHaveURL(/\/books\/[^/]+/);
    await expect(page.locator('main')).toBeVisible();
  });
});
