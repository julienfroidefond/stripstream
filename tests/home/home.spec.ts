import { expect, test } from '@playwright/test';
import { hasE2eCredentials, signIn } from '../helpers/auth';

test.describe('Home functional journeys', () => {
  test.skip(!hasE2eCredentials, 'Local E2E account unavailable');

  async function goToReaderPage(page: import('@playwright/test').Page, pageNumber: number) {
    const currentPage = page.locator('img[alt^="Page "]').first();
    await expect(currentPage).toBeVisible({ timeout: 15_000 });
    await currentPage.click({ position: { x: 10, y: 10 } });
    const pageInput = page.getByRole('group', { name: 'Navigation par numéro de page' });
    await expect(pageInput).toContainText(/\d+\/10/);
    await pageInput.getByRole('button').click();
    await page.getByRole('textbox', { name: 'Entrez un numéro de page' }).fill(String(pageNumber));
    await page.getByRole('textbox', { name: 'Entrez un numéro de page' }).press('Enter');
  }

  async function selectConnection(page: import('@playwright/test').Page, name: string) {
    await page.goto('/settings');
    await page.getByRole('tab', { name: /connection/i }).click();
    const connectionId = `connection-${name === 'Stub Lists' ? 'stripstream' : 'komga'}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    const connection = page.getByTestId(connectionId);
    await expect(connection).toBeVisible();
    await connection.getByText(name, { exact: true }).click();
    await expect(connection.getByRole('radio')).toBeChecked({ timeout: 15_000 });
  }

  test('shows continue reading and resumes the last viewed page', async ({ page }) => {
    await signIn(page);
    await page.goto('/books/book-a');
    await goToReaderPage(page, 2);
    await expect(page.locator('img[alt="Page 2"]')).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(800);

    await page.goto(`/?e2e_refresh=${Date.now()}`);
    const resume = page.getByTestId('home-resume-reading').first();
    await expect(resume).toBeVisible({ timeout: 15_000 });
    await resume.click();
    await expect(page).toHaveURL(/\/books\/book-a/);
  });

  test('shows reading lists on the home page and opens one', async ({ page }) => {
    await signIn(page);
    await selectConnection(page, 'Stub Lists');
    await page.goto('/');

    const list = page.getByTestId('home-reading-list-list-a').first();
    await expect(list).toBeVisible({ timeout: 15_000 });
    await list.click();
    await expect(page).toHaveURL(/\/reading-lists\/list-a/);
    await expect(page.getByRole('heading', { name: 'E2E Reading List' })).toBeVisible();

    await selectConnection(page, 'Stub A');
  });
});
