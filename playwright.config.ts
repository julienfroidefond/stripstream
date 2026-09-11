import { defineConfig, devices } from '@playwright/test';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const e2ePort = process.env.E2E_PORT ?? '3000';
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${e2ePort}`;
const startsLocalServer = !process.env.E2E_BASE_URL;
const e2eServerMode = process.env.E2E_SERVER_MODE === 'dev' ? 'dev' : 'production';
const e2eDistDir = '.next-e2e';
const e2eBuildIdPath = join(__dirname, e2eDistDir, 'BUILD_ID');
// Always use a local, throwaway database by default. A caller may override it
// with another local SQLite URL, but E2E never needs a production account.
const defaultE2eDbUrl = `file:${join(tmpdir(), `stripstream-e2e-${process.pid}.db`)}`;
const e2eDbUrlRaw = process.env.E2E_DATABASE_URL ?? defaultE2eDbUrl;
process.env.E2E_DATABASE_URL = e2eDbUrlRaw;

// Normalisée en chemin absolu : Prisma résout `file:` relatif au dossier schema.prisma.
const e2eDbUrl = e2eDbUrlRaw && e2eDbUrlRaw.startsWith('file:./')
  ? `file:${__dirname}/prisma/${e2eDbUrlRaw.slice('file:./'.length)}`
  : e2eDbUrlRaw;

// Playwright démarre le webServer avant `globalSetup` : un build manquant doit
// échouer au chargement de la config, avant que le serveur ne soit lancé.
function assertE2eProductionBuild(): void {
  if (!existsSync(e2eBuildIdPath)) {
    throw new Error(
      [
        '',
        '====================================================================',
        `[e2e] Missing production build: ${e2eBuildIdPath} does not exist.`,
        '[e2e] The E2E suite starts a `next start` production server by default.',
        '[e2e] Run `pnpm test:e2e:build` first, or set E2E_SERVER_MODE=dev',
        '[e2e] to fall back to `next dev` (no build required).',
        '====================================================================',
        '',
      ].join('\n')
    );
  }

  const buildId = readFileSync(e2eBuildIdPath, 'utf8').trim();
  const builtAt = statSync(e2eBuildIdPath).mtime.toISOString();
  console.warn(
    [
      '',
      '====================================================================',
      `[e2e] Reusing existing production build: ${e2eDistDir}/BUILD_ID`,
      `[e2e] BUILD_ID: ${buildId}`,
      `[e2e] Built at: ${builtAt}`,
      '[e2e] Rerun `pnpm test:e2e:build` after any src/ change.',
      '====================================================================',
      '',
    ].join('\n')
  );
}

if (startsLocalServer && e2eServerMode === 'production') {
  assertE2eProductionBuild();
}

export default defineConfig({
  testDir: './tests',
  // The seeded account and stub providers are intentionally shared by the
  // mutation journeys; run them serially to keep one test from changing the
  // active connection/read state of another worker.
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
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
          command:
            e2eServerMode === 'production'
              ? './node_modules/.bin/next start'
              : './node_modules/.bin/next dev',
          url: baseURL,
          // The E2E environment (including the local auth throttle mode) must
          // be applied to every run; never reuse a server started elsewhere.
          reuseExistingServer: false,
          timeout: 120_000,
          env: {
            ...process.env,
            ...(e2eServerMode === 'production'
              ? { NODE_ENV: 'production', NEXT_DIST_DIR: e2eDistDir }
              : { NODE_ENV: 'development' }),
            NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? 'stripstream-e2e-local-secret',
            NEXTAUTH_URL: baseURL,
            E2E_TEST_MODE: '1',
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
                reuseExistingServer: false,
                timeout: 30_000,
              },
              {
                command: 'node tests/helpers/stub-provider.mjs 8445',
                url: 'http://127.0.0.1:8445/api/v1/libraries',
                reuseExistingServer: false,
                timeout: 30_000,
              },
            ]
          : []),
      ]
    : undefined,
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium',
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
