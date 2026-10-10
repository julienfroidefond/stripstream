#!/usr/bin/env tsx
/**
 * Script de réinitialisation forcée du mot de passe admin
 * Force la mise à jour du mot de passe du compte admin
 *
 * Usage:
 *   pnpm reset-admin-password [nouveau-mot-de-passe]
 *   pnpm reset-admin-password [email] [nouveau-mot-de-passe]
 *   docker compose exec app pnpm reset-admin-password [nouveau-mot-de-passe]
 */

import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./prisma/data/stripstream.db",
});
const prisma = new PrismaClient({ adapter });

const DEFAULT_ADMIN_EMAIL = "julienfroidefond@gmail.com";

// Récupérer les arguments de la ligne de commande
const args = process.argv.slice(2);
let adminEmail = DEFAULT_ADMIN_EMAIL;
let adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || "Admin@2025";

if (args.length === 1) {
  // Un seul argument = nouveau mot de passe pour l'email par défaut
  adminPassword = args[0];
} else if (args.length === 2) {
  // Deux arguments = email et nouveau mot de passe
  adminEmail = args[0];
  adminPassword = args[1];
} else if (args.length > 2) {
  console.error("❌ Usage: pnpm reset-admin-password [email] [nouveau-mot-de-passe]");
  console.error("   Si l'email est omis, utilise l'email par défaut");
  process.exit(1);
}

async function resetAdminPassword() {
  try {
    console.log(`🔐 Resetting password for user: ${adminEmail}`);

    // Vérifier si l'utilisateur existe
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (!existingAdmin) {
      console.error(`❌ User ${adminEmail} does not exist!`);
      console.log(`💡 Run 'npm run init-db' to create the admin user first.`);
      process.exit(1);
    }

    // Hash le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Mettre à jour le mot de passe
    await prisma.user.update({
      where: { email: adminEmail },
      data: { password: hashedPassword },
    });

    console.log(`✅ Password reset successfully for ${adminEmail}`);
    console.log(`   New password: ${adminPassword}`);
    console.log(`   ⚠️  Please change the password after login!`);
  } catch (error) {
    console.error("❌ Error resetting admin password:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  console.log("🔧 Starting admin password reset...");

  try {
    await resetAdminPassword();
    console.log("✅ Admin password reset completed");
    process.exit(0);
  } catch (error) {
    console.error("❌ Admin password reset failed:", error);
    process.exit(1);
  }
}

main();
