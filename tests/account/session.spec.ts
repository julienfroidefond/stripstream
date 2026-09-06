import { expect, test } from '@playwright/test';
import { hasE2eCredentials, signIn } from '../helpers/auth';

const hasIsolatedDatabase = Boolean(process.env.E2E_DATABASE_URL);

test.describe('Session lifecycle', () => {
  test.skip(!hasE2eCredentials, 'Local E2E account unavailable');

  test('signs out and protects the application again', async ({ page }) => {
    await signIn(page);
    await page.goto('/');

    const sidebarTrigger = page.getByRole('button', { name: /menu|navigation/i }).first();
    if (await sidebarTrigger.isVisible()) await sidebarTrigger.click();
    const signOut = page.getByRole('button', { name: /sign out|déconnexion/i });
    await signOut.evaluate((element) => (element as HTMLButtonElement).click());

    await expect(page).toHaveURL(/\/login/);
    await page.goto('/account');
    await expect(page).toHaveURL(/\/login\?from=%2Faccount/);
  });
});

test.describe('Session lifecycle after app suspension', () => {
  test.skip(!hasIsolatedDatabase, 'Local E2E database unavailable');

  test('redirects a restored protected screen when its session expired in the background', async ({
    context,
    page,
  }) => {
    await signIn(page);
    await page.goto('/');
    await expect(page.getByRole('main').first()).toBeVisible();

    await context.clearCookies({ name: /(?:authjs|next-auth)\.session-token/ });

    // iPadOS resumes a suspended standalone PWA without issuing a navigation.
    // visibilitychange reproduces that lifecycle transition on Chromium.
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));

    await expect(page).toHaveURL(/\/login\?from=%2F(?:&|$)/, { timeout: 15_000 });
  });
});
