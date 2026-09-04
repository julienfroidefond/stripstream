import { expect, Page } from '@playwright/test';

export const e2eEmail = process.env.E2E_USER_EMAIL;
export const e2ePassword = process.env.E2E_USER_PASSWORD;
export const hasE2eCredentials = Boolean(e2eEmail && e2ePassword);

export async function signIn(page: Page) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(e2eEmail!);
  await page.getByLabel(/password|mot de passe/i).fill(e2ePassword!);
  await page.getByRole('button', { name: /sign in|se connecter/i }).click();
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/, { timeout: 15_000 });
}
