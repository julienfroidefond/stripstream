import { expect, test } from '@playwright/test';
import { hasE2eCredentials, signIn } from './helpers/auth';

const hasIsolatedDatabase = Boolean(process.env.E2E_DATABASE_URL);
const seededEmail = 'e2e-stream@test.local';
const seededPassword = 'E2eStrong!123';

async function signInWithSeededAccount(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(seededEmail);
  await page.getByLabel(/password|mot de passe/i).fill(seededPassword);
  await page.getByRole('button', { name: /sign in|se connecter/i }).click();
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/, { timeout: 15_000 });
}

test.describe('Session lifecycle', () => {
  test.skip(!hasE2eCredentials, 'Set E2E_USER_EMAIL and E2E_USER_PASSWORD');

  test('signs out and protects the application again', async ({ page }) => {
    await signIn(page);
    await page.goto('/');

    const sidebarTrigger = page.getByRole('button', { name: /menu|navigation/i }).first();
    if (await sidebarTrigger.isVisible()) await sidebarTrigger.click();
    await page.getByRole('button', { name: /sign out|déconnexion/i }).click();

    await expect(page).toHaveURL(/\/login/);
    await page.goto('/account');
    await expect(page).toHaveURL(/\/login\?from=%2Faccount/);
  });
});

test.describe('Session lifecycle after app suspension', () => {
  test.skip(!hasIsolatedDatabase, 'Set E2E_DATABASE_URL to use the isolated seeded account');

  test('redirects a restored protected screen when its session expired in the background', async ({
    context,
    page,
  }) => {
    await signInWithSeededAccount(page);
    await page.goto('/');
    await expect(page.getByRole('main').first()).toBeVisible();

    await context.clearCookies({ name: /(?:authjs|next-auth)\.session-token/ });

    // iPadOS resumes a suspended standalone PWA without issuing a navigation.
    // visibilitychange reproduces that lifecycle transition on Chromium.
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));

    await expect(page).toHaveURL(/\/login\?from=%2F(?:&|$)/, { timeout: 15_000 });
  });
});
