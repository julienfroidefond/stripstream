import { expect, Page } from '@playwright/test';

// The Playwright config always provisions this account in a local SQLite DB.
// Keep external credentials out of the default E2E path entirely.
export const e2eEmail = 'e2e-stream@test.local';
export const e2ePassword = 'E2eStrong!123';
export const hasE2eCredentials = Boolean(e2eEmail && e2ePassword);

export async function signIn(page: Page) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(e2eEmail!);
  await page.getByLabel(/password|mot de passe/i).fill(e2ePassword!);
  await page.getByRole('button', { name: /sign in|se connecter/i }).click();
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/, { timeout: 15_000 });
}
