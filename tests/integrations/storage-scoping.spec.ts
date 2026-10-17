import { expect, test, type Page } from '@playwright/test';
import { e2eReaderEmail, hasE2eCredentials, signIn } from '../helpers/auth';

const DISMISS_SUFFIX = 'pwa-install-dismissed';
const SCOPED_DISMISS_KEY = new RegExp(`^stripstream:.+:${DISMISS_SUFFIX}$`);

// Chromium never fires the real prompt in headless mode, so the banner is
// revealed by dispatching a synthetic `beforeinstallprompt`. The component only
// reads `preventDefault`, `prompt` and `userChoice` off the event.
async function fireInstallPrompt(page: Page) {
  await page.evaluate(() => {
    const event = new Event('beforeinstallprompt', { cancelable: true });
    Object.assign(event, {
      prompt: () => Promise.resolve(),
      userChoice: Promise.resolve({ outcome: 'dismissed' }),
    });
    window.dispatchEvent(event);
  });
}

async function dismissBanner(page: Page) {
  const banner = page.getByTestId('pwa-install-banner');
  const dismiss = page.getByTestId('pwa-install-dismiss');

  // The listener is attached by a client effect: keep firing until hydration.
  await expect
    .poll(
      async () => {
        await fireInstallPrompt(page);
        return banner.isVisible();
      },
      { message: 'install banner should react to beforeinstallprompt' }
    )
    .toBe(true);

  await dismiss.click();
  await expect(banner).toBeHidden();
}

async function scopedDismissKeys(page: Page) {
  const keys = await page.evaluate(() => Object.keys(window.localStorage));
  return keys.filter((key) => key.endsWith(DISMISS_SUFFIX));
}

test.use({ storageState: 'tests/.auth/stream.json' });

test.describe('Browser storage scoping', () => {
  test.skip(!hasE2eCredentials, 'Local E2E account unavailable');

  test('scopes the dismissed install banner to each account', async ({ page }) => {
    await page.goto('/');
    await dismissBanner(page);

    const streamKeys = await scopedDismissKeys(page);
    expect(streamKeys).toHaveLength(1);
    expect(streamKeys[0]).toMatch(SCOPED_DISMISS_KEY);

    // Switch accounts in the same browser profile: localStorage survives and
    // must not leak the first account's state into the second one.
    const sidebarTrigger = page.getByRole('button', { name: /menu|navigation/i }).first();
    if (await sidebarTrigger.isVisible()) await sidebarTrigger.click();
    const signOutButton = page.getByRole('button', { name: /sign out|déconnecter/i });
    await signOutButton.evaluate((element) => (element as HTMLButtonElement).click());
    await expect(page).toHaveURL(/\/login/);

    await signIn(page, { email: e2eReaderEmail });
    await page.goto('/');

    // The reader account never dismissed the banner, so it shows up again.
    await dismissBanner(page);

    const allKeys = await scopedDismissKeys(page);
    expect(allKeys).toHaveLength(2);
    expect(new Set(allKeys).size).toBe(2);
    expect(allKeys).toContain(streamKeys[0]);
  });
});
