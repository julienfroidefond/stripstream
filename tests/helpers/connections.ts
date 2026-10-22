import { expect, type Page } from '@playwright/test';

/**
 * Active une connexion seedée depuis les réglages. Le type est déduit du nom
 * du fixture : « Stub Lists » est la connexion Stripstream, les autres sont
 * des connexions Komga.
 */
export async function selectConnection(page: Page, name: string) {
  await page.goto('/settings');
  await page.getByRole('tab', { name: /connection|connexion/i }).click();
  const provider = name === 'Stub Lists' ? 'stripstream' : 'komga';
  const connectionId = `connection-${provider}-${name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')}`;
  const connection = page.getByTestId(connectionId);
  await expect(connection).toBeVisible();
  await connection.getByText(name, { exact: true }).click();
  await expect(connection.getByRole('radio')).toBeChecked({ timeout: 15_000 });
}
