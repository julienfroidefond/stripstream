import { expect, test, type Page } from '@playwright/test';
import { activateStripstreamConnection } from '../helpers/stripstream-connection';

const hasE2eCredentials = Boolean(process.env.E2E_DATABASE_URL);
const STUB_RATING_URL = 'http://127.0.0.1:8444/series/series-a/rating';

test.use({ storageState: 'tests/.auth/stream.json' });

/**
 * Amène le lecteur sur la dernière page du fixture `book-a` (10 pages). Le mode
 * une page est forcé au préalable pour que `End` cible exactement la page 10.
 */
async function openLastPage(page: Page) {
  await page.goto('/books/book-a');
  const firstPage = page.locator('img[alt^="Page "]').first();
  await expect(firstPage).toBeVisible({ timeout: 15_000 });
  await firstPage.click({ position: { x: 10, y: 10 } });

  const doublePage = page.getByTestId('reader-toggle-double-page');
  const doublePageOn = /disable|désactiver/i.test((await doublePage.getAttribute('aria-label')) ?? '');
  if (doublePageOn) {
    await page.keyboard.press('d');
    await expect(doublePage).toHaveAttribute('aria-label', /enable|activer/i);
  }

  await page.keyboard.press('End');
  await expect(page.getByAltText('Page 10')).toBeVisible({ timeout: 10_000 });
}

/** Depuis la dernière page, `PageDown` (toujours « suivant », même en RTL) ouvre le carton de fin. */
async function openEndOfSeriesDialog(page: Page) {
  await page.keyboard.press('PageDown');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible({ timeout: 15_000 });
  await expect(dialog).toContainText(/Fin de la série|End of series/i);
  return dialog;
}

test.describe('Fin de série — notation', () => {
  test.skip(!hasE2eCredentials, 'Local E2E account unavailable');
  test.describe.configure({ timeout: 90_000 });

  test('propose de noter la série et persiste la note (Stripstream)', async ({ page, request }) => {
    await request.delete(STUB_RATING_URL);
    await activateStripstreamConnection(page);

    await openLastPage(page);
    const dialog = await openEndOfSeriesDialog(page);

    const ratingBlock = dialog.getByTestId('end-of-series-rating');
    await expect(ratingBlock).toBeVisible();

    const ratingValue = ratingBlock.getByTestId('series-rating-value');
    await expect(ratingValue).toBeHidden();

    // Clique la moitié droite de la 5e étoile → note 10/10 = 5.0.
    const fifthStar = ratingBlock.locator('[role="slider"] > span').nth(4);
    const box = await fifthStar.boundingBox();
    expect(box).not.toBeNull();
    await fifthStar.click({ position: { x: box!.width * 0.9, y: box!.height / 2 } });

    await expect(ratingValue).toHaveText('5.0');

    // La note est bien propagée côté provider : la page série (dont le cache est
    // invalidé par la server action) affiche la même valeur.
    await page.goto('/series/series-a');
    await expect(page.getByTestId('series-rating-value').first()).toHaveText('5.0', {
      timeout: 15_000,
    });

    await request.delete(STUB_RATING_URL);
  });

  test('masque la notation en fin de série sur la connexion Komga', async ({ page }) => {
    await openLastPage(page);
    const dialog = await openEndOfSeriesDialog(page);

    await expect(dialog.getByTestId('end-of-series-rating')).toHaveCount(0);
  });
});
