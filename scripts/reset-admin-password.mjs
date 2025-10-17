#!/usr/bin/env node
/**
 * Script de réinitialisation forcée du mot de passe admin
 * Force la mise à jour du mot de passe du compte admin
 * 
 * Usage: docker compose exec app pnpm reset-admin-password
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ADMIN_EMAIL = "julienfroidefond@gmail.com";
const ADMIN_PASSWORD = process.env.ADMIN_DEFAULT_PASSWORD || "Admin@2025";

async function resetAdminPassword() {
  try {
    console.log(`🔐 Resetting password for admin user: ${ADMIN_EMAIL}`);
    console.log(`📡 MongoDB URI: ${process.env.MONGODB_URI || 'not set'}`);

    // Vérifier si l'utilisateur existe
    const existingAdmin = await prisma.user.findUnique({
      where: { email: ADMIN_EMAIL },
    });

    if (!existingAdmin) {
      console.error(`❌ Admin user ${ADMIN_EMAIL} does not exist!`);
      console.log(`💡 Run 'npm run init-db' to create the admin user first.`);
      process.exit(1);
    }

    // Hash le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

    // Mettre à jour le mot de passe
    await prisma.user.update({
      where: { email: ADMIN_EMAIL },
      data: { password: hashedPassword },
    });

    console.log(`✅ Password reset successfully for ${ADMIN_EMAIL}`);
    console.log(`   New password: ${ADMIN_PASSWORD}`);
    console.log(`   Source: ${process.env.ADMIN_DEFAULT_PASSWORD ? 'ADMIN_DEFAULT_PASSWORD env var' : 'default value'}`);
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

