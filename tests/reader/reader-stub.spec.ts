import { expect, test } from '@playwright/test';

const hasIsolatedDatabase = Boolean(process.env.E2E_DATABASE_URL);
const email = 'e2e-reader@test.local';
const password = 'E2eStrong!123';

async function signIn(page: import('@playwright/test').Page) {
  await page.goto('/login');
  const form = page.locator('form').first();
  const emailInput = form.locator('#email');
  const passwordInput = form.locator('#password');
  await expect(emailInput).toBeEditable();
  await expect(passwordInput).toBeEditable();
  await emailInput.fill(email);
  await passwordInput.fill(password);
  await expect(emailInput).toHaveValue(email);
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

test.describe('Reader against the deterministic Komga fixture', () => {
  test.skip(!hasIsolatedDatabase, 'Local E2E database unavailable');
  test.describe.configure({ timeout: 90_000 });

  test('loads pages, navigates, switches spread direction, and syncs progress', async ({ page }) => {
    await signIn(page);
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
    await signIn(page);
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
});
