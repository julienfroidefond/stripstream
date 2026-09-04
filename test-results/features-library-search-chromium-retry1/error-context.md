# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: features.spec.ts >> library search
- Location: tests/features.spec.ts:2:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('textbox', { name: /search/i })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('textbox', { name: /search/i })

```

```yaml
- main:
  - button "Change language":
    - img
  - img "StripStream Logo"
  - text: StripStream
  - blockquote:
    - paragraph: Enjoy your favorite comics, manga and graphic novels with a modern and smooth reading experience.
  - img "StripStream Logo"
  - heading "Welcome to StripStream" [level=1]
  - paragraph: Sign in or create an account to get started
  - tab "Sign in" [selected]
  - tab "Sign up"
  - tabpanel:
    - text: Email
    - textbox "Email": demo@stripstream.local
    - text: Password
    - textbox "Password": fft$VSD96dis
    - checkbox "Remember me" [checked]:
      - img
    - text: Remember me
    - button "Sign in"
- region "Notifications (F8)":
  - list
- alert
```

# Test source

```ts
  1 | import { test, expect } from '@playwright/test';
> 2 | test('library search', async ({ page }) => { await page.goto('/libraries/1'); await expect(page.getByRole('textbox', { name: /search/i })).toBeVisible(); });
    |                                                                                                                                            ^ Error: expect(locator).toBeVisible() failed
  3 | test('library sort', async ({ page }) => { await page.goto('/libraries/1'); await expect(page.locator('button, select').filter({ hasText: /sort/i })).toBeVisible(); });
  4 | test('pagination', async ({ page }) => { await page.goto('/libraries/1'); await expect(page.getByRole('button', { name: /next/i })).toBeVisible(); });
  5 | test('home features', async ({ page }) => { await page.goto('/'); await expect(page.locator('main')).toBeVisible(); });
  6 | 
```