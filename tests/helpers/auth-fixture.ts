import { test } from '@playwright/test';
export const authFixture = test.extend({
  authPage: async ({ page }, use) => {
    await page.goto('/login');
    // Auth handled externally via .auth/user.json
    await use(page);
  },
});
