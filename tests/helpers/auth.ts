import { expect, Page } from '@playwright/test';

// The Playwright config always provisions this account in a local SQLite DB.
// Keep external credentials out of the default E2E path entirely.
export const e2eEmail = 'e2e-stream@test.local';
export const e2eReaderEmail = 'e2e-reader@test.local';
export const e2ePassword = 'E2eStrong!123';
export const hasE2eCredentials = Boolean(e2eEmail && e2ePassword);

export async function signIn(
  page: Page,
  { email = e2eEmail, password = e2ePassword }: { email?: string; password?: string } = {}
) {
  await page.goto('/login');
  const emailInput = page.locator('#email');
  const passwordInput = page.locator('#password');
  await expect(emailInput).toBeEditable();
  await expect(passwordInput).toBeEditable();
  await emailInput.fill(email);
  await passwordInput.fill(password);
  await expect(emailInput).toHaveValue(email);
  await expect(passwordInput).toHaveValue(password);
  await page.getByRole('button', { name: /sign in|se connecter/i }).click();
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/, { timeout: 15_000 });
}
