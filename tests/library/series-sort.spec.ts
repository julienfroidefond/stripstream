import { expect, test } from '@playwright/test';
import { hasE2eCredentials, signIn } from '../helpers/auth';
import { activateStripstreamConnection } from '../helpers/stripstream-connection';

test.describe('Library sort by rating (Stripstream)', () => {
  test.skip(!hasE2eCredentials, 'Local E2E account unavailable');

  test('cycles three sort states including community_score on Stripstream', async ({ page }) => {
    await signIn(page);
    await activateStripstreamConnection(page);

    // Forcer le tri initial à "title" : un test antérieur (library.spec) peut avoir
    // persisté defaultSortOrder en base, ce qui décalerait le cycle attendu.
    await page.goto('/libraries/lib-a?sort=title');
    await expect(page).toHaveURL(/\/libraries\/lib-a/);

    const path = new URL(page.url()).pathname;
    const sort = page.getByTestId('library-sort').first();
    await expect(sort).toBeVisible();

    // title → latest
    await sort.click();
    await expect(page).toHaveURL((url) => url.pathname === path && url.searchParams.get('sort') === 'latest');

    // latest → community_score
    await sort.click();
    await expect(page).toHaveURL((url) => url.pathname === path && url.searchParams.get('sort') === 'community_score');

    // community_score → title (sort retiré de l'URL)
    await sort.click();
    await expect(page).toHaveURL((url) => url.pathname === path && !url.searchParams.has('sort'));
  });

  test('cycles only two sort states on Komga (no community_score)', async ({ page }) => {
    await signIn(page);
    // La connexion active par défaut est Komga ("Stub A").
    // Forcer le tri initial à "title" pour rester déterministe (cf. test Stripstream).
    await page.goto('/libraries/lib-a?sort=title');
    await expect(page).toHaveURL(/\/libraries\/lib-a/);

    const path = new URL(page.url()).pathname;
    const sort = page.getByTestId('library-sort').first();
    await expect(sort).toBeVisible();

    // title → latest
    await sort.click();
    await expect(page).toHaveURL((url) => url.pathname === path && url.searchParams.get('sort') === 'latest');

    // latest → title (jamais community_score)
    await sort.click();
    await expect(page).toHaveURL((url) => url.pathname === path && !url.searchParams.has('sort'));
  });
});
