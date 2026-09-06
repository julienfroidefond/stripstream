import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { execFileSync } from 'node:child_process';
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

  const prisma = new PrismaClient({ datasources: { db: { url } } });

  const email = 'e2e-stream@test.local';
  const readerEmail = 'e2e-reader@test.local';
  const password = 'E2eStrong!123';
  const hashed = await bcrypt.hash(password, 10);

  // Cette base est réservée aux E2E : repartir d'un compte neuf rend les
  // scénarios mutables indépendants d'une exécution précédente. Les relations
  // du compte (préférences et connexions incluses) sont supprimées par cascade.
  await prisma.user.deleteMany({ where: { email: { in: [email, readerEmail] } } });
  const user = await prisma.user.create({
    data: { email, password: hashed, roles: ['ROLE_USER'] },
  });
  const readerUser = await prisma.user.create({
    data: { email: readerEmail, password: hashed, roles: ['ROLE_USER'] },
  });

  const basic = Buffer.from('user:pass').toString('base64');
  const header = `Basic ${basic}`;

  const configA = await prisma.komgaConfig.upsert({
    where: { userId_name: { userId: user.id, name: 'Stub A' } },
    update: { url: 'http://127.0.0.1:8444', authHeader: header },
    create: { userId: user.id, name: 'Stub A', url: 'http://127.0.0.1:8444', username: 'user', authHeader: header },
  });
  const configB = await prisma.komgaConfig.upsert({
    where: { userId_name: { userId: user.id, name: 'Stub B' } },
    update: { url: 'http://127.0.0.1:8445', authHeader: header },
    create: { userId: user.id, name: 'Stub B', url: 'http://127.0.0.1:8445', username: 'user', authHeader: header },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { activeKomgaConfigId: configA.id },
  });

  const readerConfigA = await prisma.komgaConfig.create({
    data: { userId: readerUser.id, name: 'Stub A', url: 'http://127.0.0.1:8444', username: 'user', authHeader: header },
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
      token: 'e2e-stripstream-token',
    },
  });

  await prisma.$disconnect();
  console.log(`[setup] e2e users seeded (${email}, ${readerEmail}), active Stub A (${configA.id}/${readerConfigA.id}), B=${configB.id}`);
}
