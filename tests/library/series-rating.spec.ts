import { expect, test } from '@playwright/test';
import { hasE2eCredentials, signIn } from '../helpers/auth';
import { activateStripstreamConnection } from '../helpers/stripstream-connection';

test.describe('Series rating (Stripstream)', () => {
  test.skip(!hasE2eCredentials, 'Local E2E account unavailable');

  test('sets, persists, then clears a series rating on the Stripstream connection', async ({ page }) => {
    await signIn(page);
    await activateStripstreamConnection(page);

    await page.goto('/series/series-a');
    await expect(page).toHaveURL(/\/series\/series-a/);

    const rating = page.getByTestId('series-rating').first();
    const ratingValue = page.getByTestId('series-rating-value').first();
    const ratingClear = page.getByTestId('series-rating-clear').first();
    await expect(rating).toBeVisible({ timeout: 15_000 });

    // S'assurer d'un état initial propre : si une exécution précédente a laissé
    // une note, on la supprime avant de mesurer.
    if (await ratingClear.isVisible().catch(() => false)) {
      await ratingClear.click();
      await expect(ratingValue).toBeHidden();
    }

    // Clique la partie droite de la 5e étoile → note 10/10 = 5.0 (étoile pleine).
    const stars = rating.locator('[role="slider"] > span');
    const fifthStar = stars.nth(4);
    const box = await fifthStar.boundingBox();
    expect(box).not.toBeNull();
    await fifthStar.click({ position: { x: box!.width * 0.9, y: box!.height / 2 } });

    await expect(ratingValue).toHaveText('5.0');

    // La note persiste après rechargement (sauvegarde côté backend stub).
    await page.reload();
    await expect(ratingValue).toHaveText('5.0');
    await expect(ratingClear).toBeVisible();

    // Suppression de la note.
    await ratingClear.click();
    await expect(ratingValue).toBeHidden();

    // L'état "non noté" persiste après rechargement.
    await page.reload();
    await expect(ratingValue).toBeHidden();
  });

  test('hides the rating control on the Komga connection', async ({ page }) => {
    await signIn(page);
    // La connexion active par défaut est Komga ("Stub A").
    await page.goto('/series/series-a');
    await expect(page).toHaveURL(/\/series\/series-a/);
    await expect(page.getByTestId('series-rating')).toBeHidden();
  });
});
