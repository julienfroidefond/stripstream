#!/usr/bin/env tsx
/**
 * Script d'initialisation de la base de données SQLite
 * Exécuté au démarrage de l'application (docker-entrypoint.sh).
 *
 * Crée le compte administrateur initial s'il n'existe pas, avec le mot de
 * passe fourni par `ADMIN_DEFAULT_PASSWORD`. Sans ce mot de passe, le compte
 * n'est pas créé (aucun mot de passe par défaut) et le script sort avec
 * `ADMIN_BOOTSTRAP_REFUSED_EXIT_CODE`, que l'entrypoint tolère. Un compte
 * existant n'est jamais modifié : ni ses rôles ni son mot de passe.
 */

import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";
import {
  ADMIN_BOOTSTRAP_MIN_PASSWORD_LENGTH,
  ADMIN_BOOTSTRAP_REFUSED_EXIT_CODE,
  planAdminBootstrap,
} from "../src/lib/admin-bootstrap";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./prisma/data/stripstream.db",
});
const prisma = new PrismaClient({ adapter });

const ADMIN_EMAIL = "julienfroidefond@gmail.com";

/** `true` si l'admin existe ou vient d'être créé, `false` si la création est refusée. */
async function initializeAdminUser(): Promise<boolean> {
  try {
    const existingAdmin = await prisma.user.findUnique({
      where: { email: ADMIN_EMAIL },
      select: { id: true },
    });

    const plan = planAdminBootstrap({
      adminExists: existingAdmin !== null,
      password: process.env.ADMIN_DEFAULT_PASSWORD,
    });

    switch (plan.action) {
      case "keep":
        console.log(`✅ Admin user ${ADMIN_EMAIL} already exists (left unchanged)`);
        return true;
      case "refuse":
        console.error(
          plan.reason === "missing-password"
            ? `❌ Admin user ${ADMIN_EMAIL} does not exist and ADMIN_DEFAULT_PASSWORD is empty: not created.`
            : `❌ ADMIN_DEFAULT_PASSWORD is shorter than ${ADMIN_BOOTSTRAP_MIN_PASSWORD_LENGTH} characters: admin not created.`
        );
        console.error(
          "   Set ADMIN_DEFAULT_PASSWORD (strong, secret) and restart to create the admin account."
        );
        return false;
      case "create": {
        const hashedPassword = await bcrypt.hash(plan.password, 10);
        await prisma.user.create({
          data: {
            email: ADMIN_EMAIL,
            password: hashedPassword,
            roles: ["ROLE_USER", "ROLE_ADMIN"],
          },
        });
        console.log(`✅ Admin user created: ${ADMIN_EMAIL}`);
        console.log("   ⚠️  You can now remove ADMIN_DEFAULT_PASSWORD from the environment.");
        return true;
      }
    }
  } catch (error) {
    console.error("❌ Error initializing admin user:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  console.log("🔧 Initializing SQLite database...");

  try {
    const ready = await initializeAdminUser();
    if (!ready) {
      process.exit(ADMIN_BOOTSTRAP_REFUSED_EXIT_CODE);
    }
    console.log("✅ Database initialization completed");
    process.exit(0);
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    process.exit(1);
  }
}

main();
