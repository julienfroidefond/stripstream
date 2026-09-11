import { expect, test } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const hasIsolatedDatabase = Boolean(process.env.E2E_DATABASE_URL);
const email = 'e2e-reader@test.local';
const streamEmail = 'e2e-stream@test.local';
const password = 'E2eStrong!123';

async function signIn(page: import('@playwright/test').Page, accountEmail = email) {
  await page.goto('/login');
  const form = page.locator('form').first();
  const emailInput = form.locator('#email');
  const passwordInput = form.locator('#password');
  await expect(emailInput).toBeEditable();
  await expect(passwordInput).toBeEditable();
  await emailInput.fill(accountEmail);
  await passwordInput.fill(password);
  await expect(emailInput).toHaveValue(accountEmail);
  await expect(passwordInput).toHaveValue(password);
  await form.getByRole('button', { name: /sign in|se connecter/i }).click();
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
}

async function goToPage(page: import('@playwright/test').Page, pageNumber: number) {
  await page.locator('img[alt^="Page "]').first().click({ position: { x: 10, y: 10 } });
  const pageInput = page.getByRole('group', { name: 'Navigation par numéro de page' });
  await expect(pageInput).toContainText(/\d+\/10/);
  await pageInput.getByRole('button').click();
  const input = page.getByRole('textbox', { name: 'Entrez un numéro de page' });
  await input.fill(String(pageNumber));
  await input.press('Enter');
}

async function getConnectionId(accountEmail: string, connectionName: string) {
  const databaseUrl = process.env.E2E_DATABASE_URL;
  if (!databaseUrl) throw new Error('E2E_DATABASE_URL is required');

  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  try {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: accountEmail } });
    const connection = await prisma.komgaConfig.findUniqueOrThrow({
      where: { userId_name: { userId: user.id, name: connectionName } },
    });
    return connection.id;
  } finally {
    await prisma.$disconnect();
  }
}

test.use({ storageState: 'tests/.auth/reader.json' });

test.describe('Reader against the deterministic Komga fixture', () => {
  test.skip(!hasIsolatedDatabase, 'Local E2E database unavailable');
  test.describe.configure({ timeout: 90_000 });

  test('loads pages, navigates, switches spread direction, and syncs progress', async ({ page }) => {
    await page.goto('/books/book-a');

    // The reader intentionally resumes at the last page seen. Normalize the
    // starting point before asserting deterministic navigation behavior.
    await goToPage(page, 1);
    await expect(page.getByAltText('Page 1')).toBeVisible({ timeout: 15_000 });
    await page.getByAltText('Page 1').click({ position: { x: 10, y: 10 } });

    const next = page.getByTestId('reader-next-page');
    await expect(next).toBeVisible();
    await next.click();
    await expect(page.getByAltText('Page 2')).toBeVisible({ timeout: 10_000 });

    const doublePage = page.getByTestId('reader-toggle-double-page');
    const doublePageLabel = await doublePage.getAttribute('aria-label');
    if (/enable|activer/i.test(doublePageLabel ?? '')) {
      await doublePage.click();
    }
    await expect(page.getByAltText('Page 3')).toBeVisible({ timeout: 10_000 });

    const direction = page.getByTestId('reader-toggle-direction');
    const initialDirectionLabel = await direction.getAttribute('aria-label');
    await direction.click();
    await expect(direction).not.toHaveAttribute('aria-label', initialDirectionLabel ?? '');

    await page.waitForTimeout(800); // debounce de synchronisation vers le provider
    await page.reload();
    await expect(page.getByAltText('Page 2')).toBeVisible({ timeout: 15_000 });
  });

  test('opens thumbnails and reader information, then shows the end-of-book dialog', async ({ page }) => {
    await page.goto('/books/book-a');
    await goToPage(page, 1);
    await expect(page.getByAltText('Page 1')).toBeVisible({ timeout: 15_000 });
    await page.getByAltText('Page 1').click({ position: { x: 10, y: 10 } });

    await page.getByTestId('reader-thumbnails').click();
    await expect(page.locator('#thumbnails-container')).toBeVisible();
    await expect(page.locator('#thumbnail-1')).toBeVisible();
    await page.locator('#thumbnail-10').click();
    const lastPage = page.getByRole('img', { name: 'Page 10', exact: true });
    await expect(lastPage).toBeVisible({ timeout: 10_000 });
    await lastPage.click({ position: { x: 10, y: 10 } });
    await page.getByTestId('reader-thumbnails').click();
    await expect(page.locator('#thumbnails-container')).toBeHidden();

    await page.getByTestId('reader-info').click({ force: true });
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: /close|fermer/i }).first().click();

    const directionLabel = await page.getByRole('button', { name: /direction/i }).getAttribute('aria-label');
    await page.keyboard.press(/right to left|droite (?:à|vers) gauche|rtl/i.test(directionLabel ?? '') ? 'ArrowLeft' : 'ArrowRight');
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('does not attribute anonymous reading progress to the current account', async ({ page, request }) => {
    await request.delete('http://127.0.0.1:8444/api/v1/books/book-a/read-progress');
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/series/series-a');
    const anonymousToggle = page.getByTestId('anonymous-mode-toggle');
    await expect(anonymousToggle).toHaveAccessibleName(
      /anonymous mode disabled|mode anonyme désactivé/i
    );
    await anonymousToggle.click();
    await expect(anonymousToggle).toHaveAccessibleName(
      /anonymous mode enabled|mode anonyme activé/i
    );

    await page.goto('/books/book-a');
    await goToPage(page, 6);
    await expect(page.getByRole('img', { name: 'Page 6', exact: true })).toBeVisible();
    await page.waitForTimeout(800);

    const providerBook = await request.get('http://127.0.0.1:8444/api/v1/books/book-a');
    expect(providerBook.ok()).toBe(true);
    expect((await providerBook.json()).readProgress).toBeNull();

    await page.getByRole('img', { name: 'Page 6', exact: true }).click({ position: { x: 10, y: 10 } });
    const closeReader = page.getByTestId('reader-close');
    await expect(closeReader).toBeVisible();
    await closeReader.click();
    await expect(page).toHaveURL(/\/series\/series-a$/);
    await page.waitForLoadState('networkidle');
    await anonymousToggle.click();
    await expect(anonymousToggle).toHaveAccessibleName(
      /anonymous mode disabled|mode anonyme désactivé/i
    );
    await page.reload();

    const providerBookAfterReload = await request.get('http://127.0.0.1:8444/api/v1/books/book-a');
    expect(providerBookAfterReload.ok()).toBe(true);
    expect((await providerBookAfterReload.json()).readProgress).toBeNull();

    await page.goto('/books/book-a');
    await expect(page.getByRole('img', { name: 'Page 1', exact: true })).toBeVisible();
  });

  test('keeps reading statuses separate across two users and two connections', async ({ browser, request }) => {
    await request.delete('http://127.0.0.1:8444/api/v1/books/book-a/read-progress');
    await request.delete('http://127.0.0.1:8445/api/v1/books/book-b/read-progress');
    const connectionA = await getConnectionId(streamEmail, 'Stub A');
    const connectionB = await getConnectionId(email, 'Stub B');

    const userA = await browser.newPage();
    const userB = await browser.newPage();
    try {
      const baseURL = test.info().project.use.baseURL!;
      await userA.context().addCookies([
        { name: 'stripstream-active-provider', value: 'komga', url: baseURL },
        { name: 'stripstream-active-komga-config', value: String(connectionA), url: baseURL },
      ]);
      await userB.context().addCookies([
        { name: 'stripstream-active-provider', value: 'komga', url: baseURL },
        { name: 'stripstream-active-komga-config', value: String(connectionB), url: baseURL },
      ]);
      await signIn(userA, streamEmail);
      await userA.evaluate(() => localStorage.clear());
      await userA.goto('/books/book-a');
      await goToPage(userA, 6);
      await expect(userA.getByRole('img', { name: 'Page 6', exact: true })).toBeVisible();
      await userA.waitForTimeout(800);

      await signIn(userB, email);
      await userB.evaluate(() => localStorage.clear());
      await userB.goto('/books/book-b');
      await goToPage(userB, 4);
      await expect(userB.getByRole('img', { name: 'Page 4', exact: true })).toBeVisible();
      await userB.waitForTimeout(800);

      const progressA = await request.get('http://127.0.0.1:8444/api/v1/books/book-a');
      const progressB = await request.get('http://127.0.0.1:8445/api/v1/books/book-b');
      expect((await progressA.json()).readProgress.page).toBe(6);
      expect((await progressB.json()).readProgress.page).toBe(4);

      await userA.goto('/books/book-a');
      await expect(userA.getByRole('img', { name: 'Page 6', exact: true })).toBeVisible();
      await userB.goto('/books/book-b');
      await expect(userB.getByRole('img', { name: 'Page 4', exact: true })).toBeVisible();
    } finally {
      await userA.close();
      await userB.close();
    }
  });
});
