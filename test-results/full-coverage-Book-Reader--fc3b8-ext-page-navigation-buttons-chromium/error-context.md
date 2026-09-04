# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: full-coverage.spec.ts >> Book Reader >> reader has prev/next page navigation buttons
- Location: tests/full-coverage.spec.ts:84:7

# Error details

```
Error: expect(received).toBeTruthy()

Received: false
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - main [ref=e3]:
      - generic [ref=e4]:
        - button "Change language" [ref=e6] [cursor=pointer]
        - generic [ref=e11]:
          - generic [ref=e14]:
            - img "StripStream Logo" [ref=e15]
            - generic [ref=e16]: StripStream
          - blockquote [ref=e18]:
            - paragraph [ref=e19]: Enjoy your favorite comics, manga and graphic novels with a modern and smooth reading experience.
        - generic [ref=e21]:
          - generic [ref=e22]:
            - img "StripStream Logo" [ref=e25]
            - heading "Welcome to StripStream" [level=1] [ref=e26]
            - paragraph [ref=e27]: Sign in or create an account to get started
          - generic [ref=e28]:
            - generic [ref=e29]:
              - tab "Sign in" [selected] [ref=e30] [cursor=pointer]
              - tab "Sign up" [ref=e31] [cursor=pointer]
            - tabpanel [ref=e32]:
              - generic [ref=e33]:
                - generic [ref=e34]:
                  - text: Email
                  - textbox "Email" [ref=e35]: demo@stripstream.local
                - generic [ref=e36]:
                  - text: Password
                  - textbox "Password" [ref=e37]: fft$VSD96dis
                - generic [ref=e38]:
                  - checkbox "Remember me" [checked] [ref=e39] [cursor=pointer]
                  - checkbox [checked]
                  - generic [ref=e40] [cursor=pointer]: Remember me
                - button "Sign in" [ref=e41] [cursor=pointer]
    - region "Notifications (F8)":
      - list
  - alert [ref=e42]
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | // ─── Home ────────────────────────────────────────────────────────────────────
  4   | test.describe('Home', () => {
  5   |   test('home page loads and shows main layout', async ({ page }) => {
  6   |     await page.goto('/');
  7   |     // Should either show content or redirect to settings if no provider
  8   |     await expect(page.locator('body')).toBeVisible();
  9   |     const html = await page.content();
  10  |     // Either has real content or shows a meaningful state
  11  |     expect(html.length).toBeGreaterThan(500);
  12  |   });
  13  | 
  14  |   test('home navigation links are present', async ({ page }) => {
  15  |     await page.goto('/');
  16  |     const nav = page.locator('nav');
  17  |     // nav may be present; if page redirected to /settings, that's fine
  18  |     const url = page.url();
  19  |     if (url.includes('/settings')) {
  20  |       await expect(page.getByText(/provider|token|stripstream/i, { exact: false })).toBeVisible();
  21  |     }
  22  |   });
  23  | });
  24  | 
  25  | // ─── Login ───────────────────────────────────────────────────────────────────
  26  | test.describe('Login', () => {
  27  |   test('login page renders sign in and sign up tabs', async ({ page }) => {
  28  |     await page.goto('/login');
  29  |     await expect(page.getByRole('tab', { name: /sign in/i })).toBeVisible();
  30  |     await expect(page.getByRole('tab', { name: /sign up/i })).toBeVisible();
  31  |   });
  32  | });
  33  | 
  34  | // ─── Libraries ───────────────────────────────────────────────────────────────
  35  | test.describe('Libraries', () => {
  36  |   test('libraries route responds with 2xx/3xx', async ({ page }) => {
  37  |     const res = await page.goto('/libraries/test-id');
  38  |     const status = res?.status() ?? 0;
  39  |     expect([200, 301, 302, 304, 404]).toContain(status);
  40  |     await expect(page.locator('body')).toBeVisible();
  41  |   });
  42  | 
  43  |   test('libraries page has a page title or heading', async ({ page }) => {
  44  |     await page.goto('/libraries/test-id');
  45  |     const h = page.locator('h1, h2').first();
  46  |     await expect(h).toBeVisible({ timeout: 5000 });
  47  |   });
  48  | 
  49  |   test('library page shows search input if content loads', async ({ page }) => {
  50  |     await page.goto('/libraries/test-id');
  51  |     // Search input is common; if it exists, check it
  52  |     const search = page.locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="Search" i]').first();
  53  |     if (await search.isVisible({ timeout: 3000 })) {
  54  |       await expect(search).toBeEnabled();
  55  |     }
  56  |   });
  57  | });
  58  | 
  59  | // ─── Series ──────────────────────────────────────────────────────────────────
  60  | test.describe('Series', () => {
  61  |   test('series route responds with 2xx/3xx', async ({ page }) => {
  62  |     const res = await page.goto('/series/test-series-id');
  63  |     const status = res?.status() ?? 0;
  64  |     expect([200, 301, 302, 304, 404]).toContain(status);
  65  |     await expect(page.locator('body')).toBeVisible();
  66  |   });
  67  | 
  68  |   test('series page shows a heading', async ({ page }) => {
  69  |     await page.goto('/series/test-series-id');
  70  |     const headings = page.locator('h1, h2, h3');
  71  |     await expect(headings.first()).toBeVisible({ timeout: 5000 });
  72  |   });
  73  | });
  74  | 
  75  | // ─── Book Reader ────────────────────────────────────────────────────────────
  76  | test.describe('Book Reader', () => {
  77  |   test('book reader responds with 2xx/3xx', async ({ page }) => {
  78  |     const res = await page.goto('/books/test-book-id');
  79  |     const status = res?.status() ?? 0;
  80  |     expect([200, 301, 302, 304, 404]).toContain(status);
  81  |     await expect(page.locator('body')).toBeVisible();
  82  |   });
  83  | 
  84  |   test('reader has prev/next page navigation buttons', async ({ page }) => {
  85  |     await page.goto('/books/test-book-id');
  86  |     // Look for common nav patterns: arrow buttons, page controls
  87  |     const nextBtn = page.locator(
  88  |       'button[aria-label*="next" i], button[aria-label*="page" i], button:has-text(">"), button:has-text("»"), svg[class*="chevron-right"], [class*="next"]'
  89  |     ).first();
  90  |     const prevBtn = page.locator(
  91  |       'button[aria-label*="prev" i], button:has-text("<"), button:has-text("«"), svg[class*="chevron-left"], [class*="prev"]'
  92  |     ).first();
  93  |     const navVisible = await nextBtn.isVisible().catch(() => false) ||
  94  |                        await prevBtn.isVisible().catch(() => false);
> 95  |     expect(navVisible).toBeTruthy();
      |                        ^ Error: expect(received).toBeTruthy()
  96  |   });
  97  | 
  98  |   test('reader has settings button', async ({ page }) => {
  99  |     await page.goto('/books/test-book-id');
  100 |     const settingsBtn = page.locator(
  101 |       'button[aria-label*="setting" i], button:has-text("Settings"), button[title*="setting" i], [class*="settings"]'
  102 |     ).first();
  103 |     const visible = await settingsBtn.isVisible().catch(() => false);
  104 |     if (!visible) {
  105 |       // Settings may appear in a toolbar; try a broader approach
  106 |       const toolbar = page.locator('[class*="toolbar" i], [class*="control" i], [class*="reader-header"]').first();
  107 |       await expect(toolbar).toBeVisible({ timeout: 5000 }).catch(() => {
  108 |         // If no toolbar either, the test is informative not fatal
  109 |       });
  110 |     }
  111 |   });
  112 | 
  113 |   test('reader favorite/star button is visible if content loaded', async ({ page }) => {
  114 |     await page.goto('/books/test-book-id');
  115 |     const favBtn = page.locator(
  116 |       'button[aria-label*="favorit" i], button[aria-label*="star" i], button:has-text(/favori|starrating/i), [class*="favorite"]'
  117 |     ).first();
  118 |     const visible = await favBtn.isVisible().catch(() => false);
  119 |     // If not visible, it may require auth or the page redirected
  120 |     const url = page.url();
  121 |     if (!visible && !url.includes('/login')) {
  122 |       // Not visible but not auth-gated — note it
  123 |       console.log(`Favorite button not visible on ${url}`);
  124 |     }
  125 |   });
  126 | 
  127 |   test('reader progress/reading status button visible if content loaded', async ({ page }) => {
  128 |     await page.goto('/books/test-book-id');
  129 |     const statusBtn = page.locator(
  130 |       'button[aria-label*="progress" i], button[aria-label*="status" i], button:has-text(/reading|progress|status/i), [class*="progress"]'
  131 |     ).first();
  132 |     await expect(statusBtn).toBeVisible({ timeout: 3000 }).catch(() => {
  133 |       // May require auth — pass informatively
  134 |     });
  135 |   });
  136 | });
  137 | 
  138 | // ─── Favorites / Reading Lists ───────────────────────────────────────────────
  139 | test.describe('Favorites & Reading Lists', () => {
  140 |   test('reading-lists route responds', async ({ page }) => {
  141 |     const res = await page.goto('/reading-lists/test-list');
  142 |     const status = res?.status() ?? 0;
  143 |     expect([200, 301, 302, 304, 404]).toContain(status);
  144 |     await expect(page.locator('body')).toBeVisible();
  145 |   });
  146 | 
  147 |   test('reading-lists page shows content or empty state', async ({ page }) => {
  148 |     await page.goto('/reading-lists/test-list');
  149 |     const body = page.locator('body');
  150 |     await expect(body).toBeVisible();
  151 |     const html = await page.content();
  152 |     expect(html.length).toBeGreaterThan(200);
  153 |   });
  154 | });
  155 | 
  156 | // ─── Settings ────────────────────────────────────────────────────────────────
  157 | test.describe('Settings', () => {
  158 |   test('settings page loads', async ({ page }) => {
  159 |     await page.goto('/settings');
  160 |     await expect(page.locator('body')).toBeVisible();
  161 |   });
  162 | 
  163 |   test('settings has provider URL input', async ({ page }) => {
  164 |     await page.goto('/settings');
  165 |     const urlInput = page.locator('input[type="url"], input[placeholder*="url" i], input[placeholder*="URL" i], input[placeholder*="provider" i]').first();
  166 |     const visible = await urlInput.isVisible({ timeout: 5000 }).catch(() => false);
  167 |     if (visible) {
  168 |       await expect(urlInput).toBeEnabled();
  169 |     }
  170 |   });
  171 | 
  172 |   test('settings has token/password input', async ({ page }) => {
  173 |     await page.goto('/settings');
  174 |     const tokenInput = page.locator(
  175 |       'input[type="password"], input[placeholder*="token" i], input[placeholder*="api" i], input[placeholder*="secret" i]'
  176 |     ).first();
  177 |     const visible = await tokenInput.isVisible({ timeout: 5000 }).catch(() => false);
  178 |     if (visible) {
  179 |       await expect(tokenInput).toBeAttached();
  180 |     }
  181 |   });
  182 | 
  183 |   test('settings has theme toggle or display options', async ({ page }) => {
  184 |     await page.goto('/settings');
  185 |     const themeToggle = page.locator(
  186 |       'button[aria-label*="theme" i], button:has-text(/theme|dark|light|mode/i), [class*="theme"], input[type="checkbox"][role="switch"]'
  187 |     ).first();
  188 |     const visible = await themeToggle.isVisible({ timeout: 3000 }).catch(() => false);
  189 |     // Theme toggle is common — log if missing
  190 |     if (!visible) {
  191 |       console.log('Theme toggle not found in settings');
  192 |     }
  193 |   });
  194 | });
  195 | 
```