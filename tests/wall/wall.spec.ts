import { expect, test, type Locator, type Page } from '@playwright/test';
import { e2eReaderEmail, signIn, signOut } from '../helpers/auth';
import { selectConnection } from '../helpers/connections';

const hasIsolatedDatabase = Boolean(process.env.E2E_DATABASE_URL);

test.use({ storageState: 'tests/.auth/stream.json' });

async function readItemCount(locator: Locator): Promise<number> {
  const text = await locator.innerText();
  const match = text.match(/\d+/);
  return Number(match?.[0] ?? Number.NaN);
}

/**
 * Les transitions de route peuvent laisser deux copies du mur dans le DOM
 * pendant une frame. On attend que la page soit stabilisée avant d'utiliser
 * des locators stricts.
 */
async function openWall(page: Page): Promise<Locator> {
  await page.goto('/wall');
  const wallCount = page.getByTestId('wall-count');
  await expect(wallCount).toHaveCount(1, { timeout: 15_000 });
  await expect(wallCount).toBeVisible();
  return wallCount;
}

test.describe('Wall filters', () => {
  test.skip(!hasIsolatedDatabase, 'Local E2E database unavailable');

  test('hides finished series, composes with libraries and stays per user', async ({ page }) => {
    await selectConnection(page, 'Stub A');
    const wallCount = await openWall(page);
    const total = await readItemCount(wallCount);
    expect(total).toBeGreaterThan(1);

    await page.getByTestId('wall-filter-trigger').click();
    const libraryRow = page
      .locator('.wall-filter-row')
      .filter({ hasText: 'Bibliothèque A' })
      .first();
    await libraryRow.click();
    await expect(libraryRow).toHaveAttribute('aria-pressed', 'true');

    const hideRead = page.getByTestId('wall-filter-hide-read');
    await expect(hideRead).toHaveAttribute('aria-pressed', 'false');
    const completed = await readItemCount(
      page.getByTestId('wall-filter-hide-read-count')
    );
    expect(completed).toBeGreaterThan(0);

    await hideRead.click();
    await expect(hideRead).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => readItemCount(wallCount)).toBe(total - completed);
    await expect(page.getByRole('link', { name: /\(terminée\)/ })).toHaveCount(0);

    const storageKeys = await page.evaluate(() =>
      Object.keys(window.localStorage).filter((key) =>
        key.endsWith('wall-hide-read')
      )
    );
    expect(storageKeys).toHaveLength(1);
    expect(storageKeys[0]).toMatch(/^stripstream:\d+:wall-hide-read$/);

    await page.reload();
    const reloadedCount = page.getByTestId('wall-count');
    await expect(reloadedCount).toHaveCount(1, { timeout: 15_000 });
    await expect(reloadedCount).toBeVisible();
    await expect.poll(() => readItemCount(reloadedCount)).toBe(total - completed);

    await page.getByTestId('wall-filter-trigger').click();
    await expect(
      page.locator('.wall-filter-row').filter({ hasText: 'Bibliothèque A' }).first()
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('wall-filter-hide-read')).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    // Un autre compte du même navigateur ne doit pas hériter du filtre.
    await signOut(page);
    await signIn(page, { email: e2eReaderEmail });
    await openWall(page);
    await page.getByTestId('wall-filter-trigger').click();
    await expect(page.getByTestId('wall-filter-hide-read')).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    await expect(
      page.locator('.wall-filter-row').filter({ hasText: 'Bibliothèque A' }).first()
    ).toHaveAttribute('aria-pressed', 'false');
  });

  test('offers a reset when the filters hide every series', async ({ page }) => {
    await selectConnection(page, 'Stub B');
    const wallCount = await openWall(page);
    const total = await readItemCount(wallCount);
    expect(total).toBeGreaterThan(0);

    await page.getByTestId('wall-filter-trigger').click();
    await page.getByTestId('wall-filter-hide-read').click();
    await expect.poll(() => readItemCount(wallCount)).toBe(0);

    const empty = page.getByTestId('wall-filter-empty');
    await expect(empty).toBeVisible();
    // Le panneau se referme de lui-même pour laisser voir l'état vide.
    await expect(page.getByTestId('wall-filter-trigger')).toHaveAttribute(
      'aria-expanded',
      'false'
    );
    await empty.getByRole('button', { name: /show all|tout afficher/i }).click();

    await expect.poll(() => readItemCount(wallCount)).toBe(total);
    await page.getByTestId('wall-filter-trigger').click();
    await expect(page.getByTestId('wall-filter-hide-read')).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });
});
