import { expect, test } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Authentication', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.addCookies([{ name: 'NEXT_LOCALE', value: 'en', url: test.info().project.use.baseURL! }]);
    await page.goto('/login');
  });

  test('shows an accessible, empty sign-in form', async ({ page }) => {
    await expect(page).toHaveTitle(/StripStream/i);
    await expect(page.getByRole('heading', { name: 'Welcome to StripStream' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Sign in' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tab', { name: 'Sign up' })).toBeVisible();

    const email = page.getByLabel('Email');
    const password = page.getByLabel('Password');
    await expect(email).toHaveAttribute('autocomplete', 'email');
    await expect(password).toHaveAttribute('autocomplete', 'current-password');
    await expect(email).toHaveValue('');
    await expect(password).toHaveValue('');
    await expect(page.getByLabel('Remember me')).toBeChecked();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeEnabled();
  });

  test('switches to registration and validates matching passwords client-side', async ({ page }) => {
    await page.getByRole('tab', { name: 'Sign up' }).click();

    await expect(page.getByLabel('Confirm password')).toBeVisible();
    await page.getByLabel('Email').fill('reader@example.test');
    await page.getByLabel('Password', { exact: true }).fill('StrongPassword123!');
    await page.getByLabel('Confirm password').fill('DifferentPassword123!');
    await page.getByRole('button', { name: 'Sign up' }).click();

    await expect(page.getByRole('alert').filter({ hasText: 'Passwords do not match' })).toHaveText(
      'Passwords do not match',
    );
    await expect(page).toHaveURL(/\/login/);
  });

  test('honours a registration tab deep link', async ({ page }) => {
    await page.goto('/login?tab=register');
    await expect(page.getByRole('tab', { name: 'Sign up' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByLabel('Confirm password')).toBeVisible();
  });

  test('changes the interface language', async ({ page }) => {
    await page.getByRole('button', { name: 'Change language' }).click();
    await page.getByRole('menuitem', { name: 'French' }).click();

    await expect(page.getByRole('tab', { name: 'Connexion' })).toBeVisible();
    await expect(page.getByLabel('Mot de passe')).toBeVisible();
  });
});
