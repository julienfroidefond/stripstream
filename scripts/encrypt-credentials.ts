#!/usr/bin/env tsx
/**
 * Chiffre au repos les identifiants de providers déjà stockés en base.
 *
 * Concerne la colonne `KomgaConfig.authHeader` (base64 `user:password`) et
 * `StripstreamConfig.token`. Les lignes déjà au format `enc:v1:` sont ignorées :
 * la migration est idempotente et peut être rejouée sans risque.
 *
 * Usage :
 *   pnpm encrypt-credentials              # avertit si la clé est absente
 *   pnpm encrypt-credentials -- --strict  # échoue si des lignes restent à migrer
 *
 * Sans `CREDENTIALS_ENCRYPTION_KEY`, rien n'est chiffré et le script sort en 0
 * après un avertissement : une clé oubliée ne doit pas casser un déploiement,
 * puisque l'application tourne de toute façon en mode dégradé (voir
 * `src/lib/credentials.ts`). `--strict` rend l'absence de clé bloquante pour les
 * pipelines qui veulent la garantie.
 *
 * En production l'image contient le nécessaire et la commande s'exécute dans le
 * conteneur (pnpm n'y est pas installé, d'où l'appel direct à tsx) :
 *   docker exec <conteneur> ./node_modules/.bin/tsx scripts/encrypt-credentials.ts
 * Le Dockerfile copie la fermeture d'imports de ce script : l'y ajouter si un
 * import est ajouté ici ou dans `src/lib/credentials.ts`.
 */

import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { ENCRYPTION_KEY_ENV_VAR, ENCRYPTION_KEY_GENERATION_HINT } from "../src/lib/credentials";
import type { CredentialEncryptionPlan } from "../src/lib/credentials-migration";
import { planCredentialEncryption } from "../src/lib/credentials-migration";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./prisma/data/stripstream.db",
});
const prisma = new PrismaClient({ adapter });

/** `--strict` : sortir en erreur si des lignes en clair n'ont pas pu être migrées. */
const strict = process.argv.includes("--strict");

function report(label: string, plan: CredentialEncryptionPlan): void {
  console.log(
    `✅ ${label}: ${plan.updates.length} chiffrée(s), ${plan.alreadyEncrypted} déjà chiffrée(s)`
  );
}

async function main(): Promise<void> {
  console.log("🔐 Chiffrement des identifiants de providers...");

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

  const pending = komgaPlan.pendingWithoutKey + stripstreamPlan.pendingWithoutKey;
  const alreadyEncrypted = komgaPlan.alreadyEncrypted + stripstreamPlan.alreadyEncrypted;

  if (!komgaPlan.enabled) {
    // Clé absente : aucune écriture. On ne fait pas échouer l'appelant par
    // défaut, mais on ne reste jamais silencieux.
    if (pending === 0 && alreadyEncrypted === 0) {
      console.log("ℹ️  Aucune connexion provider enregistrée : rien à migrer.");
      return;
    }

    console.warn(
      `⚠️  ${ENCRYPTION_KEY_ENV_VAR} est absente : aucune écriture effectuée.`
    );
    if (pending > 0) {
      console.warn(`   ${pending} identifiant(s) restent stockés en clair.`);
    }
    if (alreadyEncrypted > 0) {
      console.warn(
        `   ${alreadyEncrypted} identifiant(s) sont chiffrés mais illisibles sans la clé.`
      );
    }
    console.warn(`   Génère une clé avec : ${ENCRYPTION_KEY_GENERATION_HINT}`);
    console.warn("   Renseigne-la dans l'environnement puis relance ce script.");

    if (strict && pending > 0) {
      console.error("❌ Échec demandé par --strict.");
      process.exitCode = 1;
    }
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
    console.error("❌ Échec de la migration des identifiants :", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
