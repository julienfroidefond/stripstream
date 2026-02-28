"use server";

import { revalidatePath } from "next/cache";
import { ConfigDBService } from "@/lib/services/config-db.service";
import { TestService } from "@/lib/services/test.service";
import { AppError } from "@/utils/errors";
import type { KomgaConfig, KomgaConfigData, KomgaLibrary } from "@/types/komga";

interface SaveConfigInput {
  url: string;
  username: string;
  password?: string;
  authHeader?: string;
}

/**
 * Teste la connexion à Komga
 */
export async function testKomgaConnection(
  serverUrl: string,
  username: string,
  password: string
): Promise<{ success: boolean; message: string }> {
  try {
    const authHeader = Buffer.from(`${username}:${password}`).toString("base64");

    const { libraries }: { libraries: KomgaLibrary[] } = await TestService.testConnection({
      serverUrl,
      authHeader,
    });

    return {
      success: true,
      message: `Connexion réussie ! ${libraries.length} bibliothèque${libraries.length > 1 ? "s" : ""} trouvée${libraries.length > 1 ? "s" : ""}`,
    };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, message: error.message };
    }
    return { success: false, message: "Erreur lors de la connexion" };
  }
}

/**
 * Sauvegarde la configuration Komga
 */
export async function saveKomgaConfig(
  config: SaveConfigInput
): Promise<{ success: boolean; message: string; data?: KomgaConfig }> {
  try {
    const configData: KomgaConfigData = {
      url: config.url,
      username: config.username,
      password: config.password,
      authHeader: config.authHeader || "",
    };
    const mongoConfig = await ConfigDBService.saveConfig(configData);

    // Invalider le cache
    revalidatePath("/settings");

    return {
      success: true,
      message: "Configuration sauvegardée",
      data: mongoConfig,
    };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, message: error.message };
    }
    return { success: false, message: "Erreur lors de la sauvegarde" };
  }
}
