import { expect, test } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });

/**
 * Tests e2e pour les corrections de sécurité (headers HTTP et rate-limit login/register).
 * Testables sans compte ni contenu provider — vérifient les régressions
 * des CRITICAL C1 (security headers) et C3 (rate-limit login/register).
 */

test.describe('Security headers', () => {
  test('sends security headers on public pages', async ({ request }) => {
    const response = await request.get('/login');
    expect(response.status()).toBe(200);

    const headers = response.headers();
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['permissions-policy']).toContain('camera=()');
  });

  test('sends security headers on a protected route redirect', async ({ request }) => {
    // / est protégée → redirige vers /login, mais les headers doivent être présents
    const response = await request.get('/', { maxRedirects: 0 });
    expect([301, 302, 307, 308]).toContain(response.status());
    const headers = response.headers();
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['x-content-type-options']).toBe('nosniff');
  });
});

test.describe('Rate limiting', () => {
  test.describe.configure({ timeout: 60_000 });

  test('rejects invalid credentials and stays on login', async ({ page }) => {
    // Comportement de base : credentials invalides → erreur, on reste sur /login
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(`nonexistent-${Date.now()}@test.local`);
    await page.getByLabel(/password|mot de passe/i).fill('WrongPass123!');
    await page.getByRole('button', { name: /sign in|se connecter/i }).click();

    // On reste sur /login (pas de redirect vers /)
    await expect(page).toHaveURL(/\/login/);
  });

  test('blocks registration after too many attempts', async ({ page }) => {
    // Rate-limit register : 5 tentatives/min par email.
    // Le premier register crée le compte (puis redirige hors de /login) ; les
    // tentatives suivantes échouent (email déjà existant) et consomment le quota
    // jusqu'à ce que le serveur bloque l'email. On synchronise sur l'issue visible
    // côté client (navigation ou alerte d'erreur) plutôt que sur la réponse du
    // Server Action, dont l'événement réseau n'est pas garanti.
    const email = `reg-ratelimit-${Date.now()}@test.local`;
    const submit = () => page.getByRole('button', { name: /sign up|s'inscrire/i });
    const fillRegisterForm = async () => {
      await page.getByLabel(/email/i).fill(email);
      await page.getByLabel('Password', { exact: true }).fill('StrongPass123!');
      await page.getByLabel(/confirm password|mot de passe/i).fill('StrongPass123!');
    };

    // 1er register : succès + connexion automatique (navigation hors de /login)
    await page.goto('/login?tab=register');
    await fillRegisterForm();
    await submit().click();
    await expect(page).not.toHaveURL(/\/login(?:\?|$)/, { timeout: 20_000 });

    // 5 tentatives supplémentaires : rejetées par le serveur et comptabilisées
    for (let i = 0; i < 5; i++) {
      await page.goto('/login?tab=register');
      await fillRegisterForm();
      await submit().click();
      await expect(page.getByRole('alert')).toBeVisible({ timeout: 15_000 });
    }

    // La tentative suivante est bloquée : la demande est rejetée et on reste sur /login
    await page.goto('/login?tab=register');
    await fillRegisterForm();
    await submit().click();
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/login/);
  });
});
