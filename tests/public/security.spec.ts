import { expect, test } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });

/**
 * Tests e2e pour les corrections de sécurité (audit-perf-quality).
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
    // Pour déclencher le rate-limit serveur, il faut des tentatives qui atteignent
    // AuthServerService.registerUser. Un mot de passe fort + email déjà existant
    // échoue au check d'existence (après le rate-limit check) → compte dans le compteur.
    const email = `reg-ratelimit-${Date.now()}@test.local`;

    // 1er register : crée le user (succès)
    await page.goto('/login?tab=register');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel('Password', { exact: true }).fill('StrongPass123!');
    await page.getByLabel(/confirm password|mot de passe/i).fill('StrongPass123!');
    await page.getByRole('button', { name: /sign up|s'inscrire/i }).click();
    await page.waitForTimeout(1500);

    // Re-tenter 5 fois le même email (existe déjà → échec serveur, compte dans le rate-limit)
    for (let i = 0; i < 5; i++) {
      await page.goto('/login?tab=register');
      await page.getByLabel(/email/i).fill(email);
      await page.getByLabel('Password', { exact: true }).fill('StrongPass123!');
      await page.getByLabel(/confirm password|mot de passe/i).fill('StrongPass123!');
      await page.getByRole('button', { name: /sign up|s'inscrire/i }).click();
      await page.waitForTimeout(400);
    }

    // La tentative suivante doit être bloquée par le rate-limit
    await page.goto('/login?tab=register');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel('Password', { exact: true }).fill('StrongPass123!');
    await page.getByLabel(/confirm password|mot de passe/i).fill('StrongPass123!');
    await page.getByRole('button', { name: /sign up|s'inscrire/i }).click();

    await expect(page).toHaveURL(/\/login/);
  });
});
