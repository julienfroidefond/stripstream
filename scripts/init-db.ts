#!/usr/bin/env tsx
/**
 * Script d'initialisation de la base de données SQLite
 * Exécuté au démarrage de l'application
 */

import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./prisma/data/stripstream.db",
});
const prisma = new PrismaClient({ adapter });

const ADMIN_EMAIL = "julienfroidefond@gmail.com";
const ADMIN_PASSWORD = process.env.ADMIN_DEFAULT_PASSWORD || "Admin@2025";

async function initializeAdminUser() {
  try {
    // Vérifier si l'utilisateur existe déjà
    const existingAdmin = await prisma.user.findUnique({
      where: { email: ADMIN_EMAIL },
    });

    if (existingAdmin) {
      // Vérifier si l'utilisateur a le rôle admin
      const currentRoles = Array.isArray(existingAdmin.roles)
        ? existingAdmin.roles.filter((role): role is string => typeof role === "string")
        : [];
      const hasAdminRole = currentRoles.includes("ROLE_ADMIN");

      if (hasAdminRole) {
        console.log(`✅ Admin user ${ADMIN_EMAIL} already exists with admin role`);
      } else {
        // Ajouter le rôle admin
        const updatedRoles = Array.from(new Set([...currentRoles, "ROLE_ADMIN"]));
        await prisma.user.update({
          where: { email: ADMIN_EMAIL },
          data: { roles: updatedRoles },
        });
        console.log(`✅ Admin role added to ${ADMIN_EMAIL}`);
      }
      return;
    }

    // Créer l'utilisateur admin
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
    await prisma.user.create({
      data: {
        email: ADMIN_EMAIL,
        password: hashedPassword,
        roles: ["ROLE_USER", "ROLE_ADMIN"],
      },
    });

    console.log(`✅ Admin user created: ${ADMIN_EMAIL}`);
    console.log(`   Default password: ${ADMIN_PASSWORD}`);
    console.log(`   ⚠️  Please change the password after first login!`);
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
    await initializeAdminUser();
    console.log("✅ Database initialization completed");
    process.exit(0);
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    process.exit(1);
  }
}

main();
