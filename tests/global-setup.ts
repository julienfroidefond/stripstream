import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../src/generated/prisma/client';
import { encryptSecret } from '../src/lib/credentials';
import bcrypt from 'bcryptjs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export default async function globalSetup() {
  let url = process.env.E2E_DATABASE_URL;
  if (url && url.startsWith('file:./')) {
    // Normaliser en chemin absolu (Prisma résout `file:` relatif au dossier schema.prisma)
    url = 'file:' + process.cwd() + '/prisma/' + url.slice('file:./'.length);
  }
  if (!url) {
    throw new Error('[e2e] E2E_DATABASE_URL must be provided by playwright.config.ts');
  }
  if (!url.startsWith('file:')) {
    throw new Error('[e2e] E2E_DATABASE_URL must point to a local SQLite database');
  }

  execFileSync(join(process.cwd(), 'node_modules/.bin/prisma'), ['migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'inherit',
  });

  // Prisma 7 requires an explicit driver adapter instead of `datasources`.
  const adapter = new PrismaBetterSqlite3({ url });
  const prisma = new PrismaClient({ adapter });

  const email = 'e2e-stream@test.local';
  const readerEmail = 'e2e-reader@test.local';
  const password = 'E2eStrong!123';
  const hashed = await bcrypt.hash(password, 10);

  // Cette base est réservée aux E2E : repartir d'un compte neuf rend les
  // scénarios mutables indépendants d'une exécution précédente. Les relations
  // du compte (préférences et connexions incluses) sont supprimées par cascade.
  await prisma.user.deleteMany({ where: { email: { in: [email, readerEmail] } } });
  // `E2E_USER_IS_ADMIN=true` seeds the stream account as an administrator so the
  // dashboard content journeys can run; otherwise the suite only proves the
  // redirect-away path.
  const streamRoles =
    process.env.E2E_USER_IS_ADMIN === 'true' ? ['ROLE_USER', 'ROLE_ADMIN'] : ['ROLE_USER'];
  const user = await prisma.user.create({
    data: { email, password: hashed, roles: streamRoles },
  });
  const readerUser = await prisma.user.create({
    data: { email: readerEmail, password: hashed, roles: ['ROLE_USER'] },
  });

  const basic = Buffer.from('user:pass').toString('base64');
  const header = `Basic ${basic}`;
  // Chiffrement au repos actif en E2E comme en prod. Les lignes les plus
  // sollicitées (`Stub A` des deux comptes, la 1re connexion Stripstream) sont
  // chiffrées : une clé absente ou erronée côté serveur ferait échouer toute la
  // suite. `Stub B`/`Stub Partial` restent en clair pour couvrir la lecture des
  // lignes legacy non encore migrées.
  const encryptedHeader = encryptSecret(header);

  const configA = await prisma.komgaConfig.upsert({
    where: { userId_name: { userId: user.id, name: 'Stub A' } },
    update: { url: 'http://127.0.0.1:8444', authHeader: encryptedHeader },
    create: { userId: user.id, name: 'Stub A', url: 'http://127.0.0.1:8444', username: 'user', authHeader: encryptedHeader },
  });
  const configB = await prisma.komgaConfig.upsert({
    where: { userId_name: { userId: user.id, name: 'Stub B' } },
    update: { url: 'http://127.0.0.1:8445', authHeader: header },
    create: { userId: user.id, name: 'Stub B', url: 'http://127.0.0.1:8445', username: 'user', authHeader: header },
  });
  // Instance C : panne partielle (`books/ondeck` en 503) pour le test de
  // dégradation gracieuse de la home.
  await prisma.komgaConfig.create({
    data: { userId: user.id, name: 'Stub Partial', url: 'http://127.0.0.1:8446', username: 'user', authHeader: header },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { activeKomgaConfigId: configA.id },
  });

  const readerConfigA = await prisma.komgaConfig.create({
    data: { userId: readerUser.id, name: 'Stub A', url: 'http://127.0.0.1:8444', username: 'user', authHeader: encryptedHeader },
  });
  await prisma.komgaConfig.create({
    data: { userId: readerUser.id, name: 'Stub B', url: 'http://127.0.0.1:8445', username: 'user', authHeader: header },
  });
  await prisma.user.update({
    where: { id: readerUser.id },
    data: { activeKomgaConfigId: readerConfigA.id },
  });
  await prisma.stripstreamConfig.create({
    data: {
      userId: user.id,
      name: 'Stub Lists',
      url: 'http://127.0.0.1:8444',
      token: encryptSecret('e2e-stripstream-token'),
    },
  });
  await prisma.stripstreamConfig.create({
    data: {
      userId: user.id,
      name: 'Stub Lists B',
      url: 'http://127.0.0.1:8445',
      token: 'e2e-stripstream-token',
    },
  });

  await prisma.$disconnect();

  const hashFile = process.env.E2E_DB_HASH_FILE;
  if (hashFile) {
    const dbPath = url.slice('file:'.length);
    let dbContents: Buffer;
    try {
      dbContents = readFileSync(dbPath);
    } catch {
      throw new Error(`[e2e] Cannot hash SQLite database: ${dbPath} does not exist`);
    }
    const digest = createHash('sha256').update(dbContents).digest('hex');
    writeFileSync(hashFile, `${digest}\n`);
    console.warn(`[setup] wrote DB hash ${digest} to ${hashFile}`);
  }

  console.warn(`[setup] e2e users seeded (${email}, ${readerEmail}), active Stub A (${configA.id}/${readerConfigA.id}), B=${configB.id}`);
}
