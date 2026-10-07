import { expect, test } from '@playwright/test';

/**
 * Test e2e du streaming de la home au changement de connexion.
 * Utilise la DB SQLite seedée par global-setup + les stub providers locaux
 * (ports 8444/8445 lancés par playwright.config).
 */
const hasInfra = Boolean(process.env.E2E_DATABASE_URL);

test.use({ storageState: 'tests/.auth/stream.json' });

test.describe('Home streaming + changement de connexion', () => {
  test.skip(!hasInfra, 'Local E2E infrastructure unavailable');
  // Le premier chargement compile les routes + streame les sections : plus long en dev.
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(150_000);

  // Ouvre la sidebar (fermée par défaut) et attend que les slots streamés
  // affichent le sélecteur de connexion.
  async function openSidebar(page: import('@playwright/test').Page) {
    await page.locator('#sidebar-toggle').click();
    // La sidebar s'ouvre avec une transition translate-x : on attend qu'elle
    // soit réellement ouverte (classe translate-x-0) ET que le slot streamé
    // du ProviderSwitcher affiche la connexion active ("Stub …").
    const sidebar = page.locator('#sidebar');
    await expect(sidebar).toHaveClass(/translate-x-0/, { timeout: 10_000 });
    const trigger = sidebar.getByTestId('provider-switcher');
    await expect(trigger).toBeVisible({ timeout: 15_000 });
    return trigger;
  }

  test('affiche la home streamée avec les données de la connexion active', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // La home stream : le contenu principal apparaît sans attendre la sidebar
    await expect(page.getByRole('main').first()).toBeVisible();
    // La sidebar (ouverte) affiche la connexion active "Stub A"
    await openSidebar(page);
  });

  test('change de connexion, affiche le fallback, puis les données de la nouvelle home', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Attendre que la home de la connexion active (Stub A) ait fini de streamer
    // avant de basculer : sinon la première donnée peut arriver après le switch.
    await expect(page.getByText('BD-A (Tome 1)').first()).toBeVisible({ timeout: 20_000 });

    // Ouvrir la sidebar + le sélecteur de connexion (Stub A actif)
    const trigger = await openSidebar(page);
    await trigger.click();

    // Cliquer sur "Stub B" dans la liste déroulante
    await page.locator('#sidebar').getByTestId('provider-switch-komga-stub-b').click();

    // La home courante reste affichée pendant la bascule (pas de flash plein écran).
    await expect(page.getByText('BD-A (Tome 1)').first()).toBeVisible();
    await expect(page.getByTestId('connection-switch-loading')).toHaveCount(0);

    // La connexion active devient Stub B (le trigger affiche désormais B).
    await expect(
      page.locator('#sidebar').getByTestId('provider-switcher')
    ).toContainText('Stub B', { timeout: 15_000 });

    // Le changement de connexion recharge automatiquement la route courante,
    // qui doit alors être rendue avec les données de Stub B.
    await expect(page.getByText('BD-B (Tome 1)').first()).toBeVisible({ timeout: 15_000 });
  });
});
