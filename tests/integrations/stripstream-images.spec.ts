import { expect, test } from '@playwright/test';

const hasInfra = Boolean(process.env.E2E_DATABASE_URL);

test.use({ storageState: 'tests/.auth/stream.json' });

test.describe('Stripstream image connection isolation', () => {
  test.skip(!hasInfra, 'Local E2E infrastructure unavailable');
  test.describe.configure({ mode: 'serial' });

  async function selectStripstreamConnection(page: import('@playwright/test').Page, name: string) {
    await page.goto('/settings');
    await page.getByRole('tab', { name: /connection/i }).click();
    const connection = page.getByTestId(
      `connection-stripstream-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
    );
    await expect(connection).toBeVisible();
    await connection.getByText(name, { exact: true }).click();
    await expect(connection.getByRole('radio')).toBeChecked({ timeout: 15_000 });
  }

  async function fetchImage(page: import('@playwright/test').Page, path: string) {
    return page.evaluate(async (imagePath) => {
      const response = await fetch(imagePath, { cache: 'no-store' });
      return {
        body: await response.text(),
        status: response.status,
        vary: response.headers.get('vary'),
      };
    }, path);
  }

  test('uses the active Librarian and keeps its thumbnail cache variant isolated', async ({ page }) => {
    await selectStripstreamConnection(page, 'Stub Lists');
    const fromA = await fetchImage(page, '/api/stripstream/images/books/book-a/thumbnail');
    expect(fromA.status).toBe(200);
    expect(fromA.body).toContain('A - page 1');
    expect(fromA.vary).not.toContain('Cookie');

    const pageFromA = await fetchImage(page, '/api/stripstream/images/books/book-a/pages/1');
    expect(pageFromA.status).toBe(200);
    expect(pageFromA.body).toContain('A - page 1');
    expect(pageFromA.vary).not.toContain('Cookie');

    await selectStripstreamConnection(page, 'Stub Lists B');
    const fromB = await fetchImage(page, '/api/stripstream/images/books/book-a/thumbnail');
    expect(fromB.status).toBe(200);
    expect(fromB.body).toContain('B - page 1');

    const pageFromB = await fetchImage(page, '/api/stripstream/images/books/book-a/pages/1');
    expect(pageFromB.status).toBe(200);
    expect(pageFromB.body).toContain('B - page 1');
  });
});
