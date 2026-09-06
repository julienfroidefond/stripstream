import { expect, Page } from '@playwright/test';

/**
 * Active la connexion Stripstream "Stub Lists" dans les réglages, afin que les
 * pages dépendent du provider Stripstream (notation, tri par note, …).
 * Le stub e2e sert les endpoints Stripstream sur le même port que Komga.
 */
export async function activateStripstreamConnection(page: Page) {
  await page.goto('/settings');
  await page.getByRole('tab', { name: /connection/i }).click();
  const listsConnection = page.getByTestId('connection-stripstream-stub-lists');
  await expect(listsConnection).toBeVisible();
  await listsConnection.getByText('Stub Lists', { exact: true }).click();
  await expect(listsConnection.getByRole('radio')).toBeChecked({ timeout: 15_000 });
}
