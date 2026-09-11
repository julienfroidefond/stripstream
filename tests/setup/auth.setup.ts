import { test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { e2eReaderEmail, signIn } from '../helpers/auth';

const authDir = join(__dirname, '..', '.auth');

function ensureAuthDir() {
  mkdirSync(authDir, { recursive: true });
}

test('authenticate as the stream account', async ({ page }) => {
  ensureAuthDir();
  await signIn(page);
  await page.context().storageState({ path: join(authDir, 'stream.json') });
});

test('authenticate as the reader account', async ({ page }) => {
  ensureAuthDir();
  await signIn(page, { email: e2eReaderEmail });
  await page.context().storageState({ path: join(authDir, 'reader.json') });
});
