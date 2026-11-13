import { expect, test, type Page } from '@playwright/test';
import { selectConnection } from '../helpers/connections';

/**
 * Budget de préchargement (ADR 0031).
 *
 * Incident : le mur et les grilles préchargeaient `/series/<id>?_rsc=…` pour
 * chaque carte visible ; le proxy a répondu 429 puis a blacklisté le serveur
 * (≈ 5 400 requêtes en rafale). Les collections ne préchargent plus qu'à
 * l'intention de l'utilisateur. Le préchargement n'existe qu'en build de
 * production, ce que la suite E2E utilise.
 */
const hasIsolatedDatabase = Boolean(process.env.E2E_DATABASE_URL);
const SERIES_RSC = /\/series\/[^/?#]+\?(?:.*&)?_rsc=/;

test.use({ storageState: 'tests/.auth/stream.json' });

function recordSeriesPrefetches(page: Page): string[] {
  const urls: string[] = [];
  page.on('request', (request) => {
    if (SERIES_RSC.test(request.url())) urls.push(request.url());
  });
  return urls;
}

test.describe('Prefetch budget on dense collections', () => {
  test.skip(!hasIsolatedDatabase, 'Local E2E database unavailable');

  test('the wall renders every tile without prefetching a single series', async ({ page }) => {
    await selectConnection(page, 'Stub A');
    const prefetches = recordSeriesPrefetches(page);

    await page.goto('/wall');
    // Une transition de route peut laisser deux copies du mur pendant une frame.
    await expect(page.getByTestId('wall-count')).toHaveCount(1, { timeout: 15_000 });
    await expect(page.getByTestId('wall-count')).toBeVisible();
    await expect(page.locator('.wall-tile').first()).toBeVisible();
    await page.waitForTimeout(1_500);

    expect(await page.locator('.wall-tile').count()).toBeGreaterThan(5);
    expect(prefetches).toEqual([]);
  });

  test('a library grid prefetches only the card the user rests on', async ({ page }) => {
    await selectConnection(page, 'Stub A');
    const prefetches = recordSeriesPrefetches(page);

    await page.goto('/libraries/lib-a');
    const cards = page.locator('a[href^="/series/"]');
    await expect(cards.first()).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(1_500);

    expect(await cards.count()).toBeGreaterThan(5);
    expect(prefetches).toEqual([]);

    const target = cards.nth(2);
    const href = await target.getAttribute('href');
    await target.hover();
    // Un préchargement de route Next 16 = au plus deux requêtes RSC (arbre de
    // route + données du segment), toutes pour la série survolée.
    await expect.poll(() => prefetches.length, { timeout: 5_000 }).toBeGreaterThan(0);
    await page.waitForTimeout(1_000);
    const paths = new Set(prefetches.map((url) => new URL(url).pathname));
    expect([...paths]).toEqual([href]);
    expect(prefetches.length).toBeLessThanOrEqual(2);
  });
});
