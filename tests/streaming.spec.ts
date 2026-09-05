import { expect, test } from '@playwright/test';

/**
 * Test e2e du streaming de la home au changement de connexion.
 * Nécessite : E2E_DATABASE_URL (DB seedée par global-setup) + stub providers
 * (ports 8444/8445, lancés par playwright.config). Skip sinon.
 */
const hasInfra = Boolean(process.env.E2E_DATABASE_URL);

const EMAIL = 'e2e-stream@test.local';
const PASSWORD = 'E2eStrong!123';

async function signIn(page: import('@playwright/test').Page) {
  await page.goto('/login');
  // Le LoginForm (onglet actif par défaut) est le premier <form> du DOM.
  // RegisterForm partage les ids #email/#password mais est rendu après.
  const loginForm = page.locator('form').first();
  const emailInput = loginForm.locator('#email');
  const passwordInput = loginForm.locator('#password');

  // L'hydratation peut re-monter le formulaire et vider les champs remplis
  // trop tôt : on attend la stabilité, on remplit, et on vérifie chaque valeur.
  await page.waitForLoadState('networkidle');
  await emailInput.fill(EMAIL);
  await expect(emailInput).toHaveValue(EMAIL);
  await passwordInput.fill(PASSWORD);
  await expect(passwordInput).toHaveValue(PASSWORD);
  await loginForm.getByRole('button', { name: /sign in|se connecter/i }).click();
  // La redirection vers / streame les sections : la navigation peut dépasser 15s en dev
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/, { timeout: 30_000 });
}

test.describe('Home streaming + changement de connexion', () => {
  test.skip(!hasInfra, 'E2E_DATABASE_URL absent — infra stub non configurée');
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
    const trigger = sidebar.getByRole('button').filter({ hasText: /stub/i }).first();
    await expect(trigger).toBeVisible({ timeout: 15_000 });
    return trigger;
  }

  test('affiche la home streamée avec les données de la connexion active', async ({ page }) => {
    await signIn(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // La home stream : le contenu principal apparaît sans attendre la sidebar
    await expect(page.getByRole('main').first()).toBeVisible();
    // La sidebar (ouverte) affiche la connexion active "Stub A"
    await openSidebar(page);
  });

  test('change de connexion, affiche le fallback, puis les données de la nouvelle home', async ({ page }) => {
    await signIn(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Ouvrir la sidebar + le sélecteur de connexion (Stub A actif)
    const trigger = await openSidebar(page);
    await trigger.click();

    // Cliquer sur "Stub B" dans la liste déroulante
    await page.locator('#sidebar').getByRole('button').filter({ hasText: /stub b/i }).first().click();

    // Une transition App Router conserve normalement l'ancien arbre visible.
    // Notre état client doit donc remplacer immédiatement la home par son skeleton.
    await expect(page.getByTestId('connection-switch-loading')).toBeVisible();

    // La connexion active devient Stub B (le trigger affiche désormais B)
    await expect(
      page.locator('#sidebar').getByRole('button').filter({ hasText: /stub b/i }).first()
    ).toBeVisible({ timeout: 15_000 });

    await expect(page.getByText('BD-B (Tome 1)').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('connection-switch-loading')).toHaveCount(0);
  });
});
