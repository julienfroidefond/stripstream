import { test as base, chromium } from '@playwright/test';
import path from 'path';

const AUTH_FILE = path.join(__dirname, '../.auth/user.json');
const TS = Date.now();
const EMAIL = `e2e+${TS}@stripstream.julienfroidefond.com`;
const PASS = 'E2ePass123!';

base('register + save auth session', async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  // Register
  await page.goto('/login');
  await page.getByRole('tab', { name: 'Sign up' }).click();
  await page.getByPlaceholder(/email/i).fill(EMAIL);
  await page.getByPlaceholder(/^password/i).fill(PASS);
  await page.getByRole('button', { name: /sign up|register|create/i }).click();
  await page.waitForURL(/login|library|home/, { timeout: 15000 });

  // Login
  await page.getByRole('tab', { name: 'Sign in' }).click();
  await page.getByPlaceholder(/email/i).fill(EMAIL);
  await page.getByPlaceholder(/^password/i).fill(PASS);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await page.waitForURL(/library|home|settings/, { timeout: 15000 });

  // Save
  await ctx.storageState({ path: AUTH_FILE });
  await browser.close();
  console.log(`Saved: ${EMAIL} -> ${AUTH_FILE}`);
});
