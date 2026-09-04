import { test as base, Page, chromium } from '@playwright/test';
import path from 'path';
const AUTH_FILE = path.join(__dirname, '../.auth/user.json');

export const test = base.extend<{ authenticated: Page }>({
  authenticated: async ({}, use) => {
    const context = await chromium.launch().then(b =>
      b.newContext({ storageState: AUTH_FILE })
    );
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});
