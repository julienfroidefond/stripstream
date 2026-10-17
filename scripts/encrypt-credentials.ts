#!/usr/bin/env tsx
/**
 * Chiffre au repos les identifiants de providers déjà stockés en base.
 *
 * Concerne la colonne `KomgaConfig.authHeader` (base64 `user:password`) et
 * `StripstreamConfig.token`. Les lignes déjà au format `enc:v1:` sont ignorées :
 * la migration est idempotente et peut être rejouée sans risque.
 *
 * Usage:
 *   pnpm encrypt-credentials
 *
 * La clé `CREDENTIALS_ENCRYPTION_KEY` doit être présente dans l'environnement
 * (`.env` ou variables du conteneur). Sans elle, le script ne chiffre rien et
 * sort en erreur : il vaut mieux échouer explicitement que réécrire en clair.
 */

import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { ENCRYPTION_KEY_ENV_VAR, ENCRYPTION_KEY_GENERATION_HINT } from "../src/lib/credentials";
import {
  planCredentialEncryption,
  type CredentialEncryptionPlan,
} from "../src/lib/credentials-migration";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./prisma/data/stripstream.db",
});
const prisma = new PrismaClient({ adapter });

function report(label: string, plan: CredentialEncryptionPlan): void {
  console.log(
    `[encrypt-credentials] ${label}: ${plan.updates.length} chiffrée(s), ` +
      `${plan.alreadyEncrypted} déjà chiffrée(s), ${plan.pendingWithoutKey} en clair`
  );
}

async function main(): Promise<void> {
  const [komgaConfigs, stripstreamConfigs] = await Promise.all([
    prisma.komgaConfig.findMany({ select: { id: true, authHeader: true } }),
    prisma.stripstreamConfig.findMany({ select: { id: true, token: true } }),
  ]);

  const komgaPlan = planCredentialEncryption(
    komgaConfigs.map((row) => ({ id: row.id, value: row.authHeader }))
  );
  const stripstreamPlan = planCredentialEncryption(
    stripstreamConfigs.map((row) => ({ id: row.id, value: row.token }))
  );

  if (!komgaPlan.enabled || !stripstreamPlan.enabled) {
    console.error(
      `[encrypt-credentials] ${ENCRYPTION_KEY_ENV_VAR} est absente — aucune écriture effectuée.`
    );
    console.error(
      `[encrypt-credentials] Génère une clé avec « ${ENCRYPTION_KEY_GENERATION_HINT} » puis relance.`
    );
    process.exitCode = 1;
    return;
  }

  for (const update of komgaPlan.updates) {
    await prisma.komgaConfig.update({
      where: { id: update.id },
      data: { authHeader: update.value },
    });
  }
  for (const update of stripstreamPlan.updates) {
    await prisma.stripstreamConfig.update({
      where: { id: update.id },
      data: { token: update.value },
    });
  }

  report("Komga", komgaPlan);
  report("Stripstream", stripstreamPlan);
}

main()
  .catch((error) => {
    console.error("[encrypt-credentials] Échec de la migration :", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
