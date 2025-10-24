#!/usr/bin/env node
/**
 * Script pour vérifier le contenu de la base de données
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log("🔍 Checking database content...");
    
    // Vérifier les utilisateurs
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        roles: true,
        createdAt: true,
      },
    });
    
    console.log(`📊 Found ${users.length} users:`);
    users.forEach(user => {
      console.log(`  - ID: ${user.id}, Email: ${user.email}, Roles: ${JSON.stringify(user.roles)}, Created: ${user.createdAt}`);
    });
    
    // Vérifier les configurations
    const komgaConfigs = await prisma.komgaConfig.count();
    const preferences = await prisma.preferences.count();
    const favorites = await prisma.favorite.count();
    
    console.log(`📊 Database stats:`);
    console.log(`  - KomgaConfigs: ${komgaConfigs}`);
    console.log(`  - Preferences: ${preferences}`);
    console.log(`  - Favorites: ${favorites}`);
    
  } catch (error) {
    console.error("❌ Error checking database:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();

