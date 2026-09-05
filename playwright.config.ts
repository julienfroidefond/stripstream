import { defineConfig, devices } from '@playwright/test';

const e2ePort = process.env.E2E_PORT ?? '3000';
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${e2ePort}`;
const startsLocalServer = !process.env.E2E_BASE_URL;
// DB e2e dédiée (seedée par global-setup) — activée via env pour les tests stream.
// Normalisée en chemin absolu : Prisma résout `file:` relatif au dossier schema.prisma.
const e2eDbUrlRaw = process.env.E2E_DATABASE_URL;
const e2eDbUrl = e2eDbUrlRaw && e2eDbUrlRaw.startsWith('file:./')
  ? `file:${__dirname}/prisma/${e2eDbUrlRaw.slice('file:./'.length)}`
  : e2eDbUrlRaw;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['line'], ['html', { open: 'never' }]] : 'list',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  globalSetup: './tests/global-setup.ts',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: startsLocalServer
    ? [
        {
          // Appeler Next directement évite que Corepack tente de télécharger
          // et vérifier une autre copie de pnpm pendant le démarrage E2E.
          command: './node_modules/.bin/next dev',
          url: baseURL,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
          env: {
            ...process.env,
            NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? 'stripstream-e2e-local-secret',
            NEXTAUTH_URL: baseURL,
            PORT: e2ePort,
            // DB e2e dédiée si fournie, sinon DB par défaut
            ...(e2eDbUrl ? { DATABASE_URL: e2eDbUrl } : {}),
          },
        },
        // Stub providers pour les tests de streaming (2 instances distinctes)
        ...(e2eDbUrl
          ? [
              {
                command: 'node tests/helpers/stub-provider.mjs 8444',
                url: 'http://127.0.0.1:8444/api/v1/libraries',
                reuseExistingServer: !process.env.CI,
                timeout: 30_000,
              },
              {
                command: 'node tests/helpers/stub-provider.mjs 8445',
                url: 'http://127.0.0.1:8445/api/v1/libraries',
                reuseExistingServer: !process.env.CI,
                timeout: 30_000,
              },
            ]
          : []),
      ]
    : undefined,
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
