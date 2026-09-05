import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

export default async function globalSetup() {
  let url = process.env.E2E_DATABASE_URL;
  if (url && url.startsWith('file:./')) {
    // Normaliser en chemin absolu (Prisma résout `file:` relatif au dossier schema.prisma)
    url = 'file:' + process.cwd() + '/prisma/' + url.slice('file:./'.length);
  }
  if (!url) {
    console.log('[e2e] E2E_DATABASE_URL absent — setup skip, tests stream skip.');
    return;
  }

  const prisma = new PrismaClient({ datasources: { db: { url } } });

  const email = 'e2e-stream@test.local';
  const password = 'E2eStrong!123';
  const hashed = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, password: hashed, roles: ['ROLE_USER'] },
  });
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });

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

  await prisma.$disconnect();
  console.log(`[setup] e2e user seeded (${email}), active=Stub A (${configA.id}), B=${configB.id}`);
}
