import { expect, test } from '@playwright/test';
import { hasE2eCredentials } from '../helpers/auth';
import { activateStripstreamConnection } from '../helpers/stripstream-connection';

test.use({ storageState: 'tests/.auth/stream.json' });

test.describe('Library scan', () => {
  test.skip(!hasE2eCredentials, 'Local E2E account unavailable');

  test('follows a tracked scan job until completion', async ({ page }) => {
    await activateStripstreamConnection(page);
    await page.goto('/libraries/lib-a');

    // Role-based locator: during a client transition Next can keep the previous
    // tree mounted but hidden, so a testid lookup may match the stale copy.
    const scan = page.getByRole('button', { name: /Analyser la bibliothèque|Scan library/ });
    await expect(scan).toBeVisible({ timeout: 15_000 });

    await scan.click();

    // Start toast, then the stub reports "running" on the first poll and
    // "success" on the second: completion comes from the job status, not from a
    // fixed delay. `.first()` because Radix renders the toast copy twice (the
    // visible node plus its assertive live-region announcement).
    await expect(page.getByText(/Analyse lancée|Library scan started/).first()).toBeVisible();
    await expect(page.getByText(/Analyse terminée|Scan complete/).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(scan).toBeEnabled();
  });

  test('states that progress is unavailable on Komga', async ({ page }) => {
    await page.goto('/libraries/lib-a');

    const scan = page.getByRole('button', { name: /Analyser la bibliothèque|Scan library/ });
    await expect(scan).toBeVisible({ timeout: 15_000 });

    await scan.click();

    // Komga exposes no task status: the UI must say so instead of faking a
    // completion after a timeout.
    await expect(
      page.getByText(/n'expose pas la progression|does not expose scan progress/).first()
    ).toBeVisible();
    await expect(page.getByText(/Analyse terminée|Scan complete/)).toHaveCount(0);
    await expect(scan).toBeEnabled();
  });
});
