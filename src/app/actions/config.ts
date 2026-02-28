"use server";

import { revalidatePath } from "next/cache";
import { ConfigDBService } from "@/lib/services/config-db.service";
import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError } from "@/utils/errors";
import type { KomgaConfig, KomgaConfigData } from "@/types/komga";

interface SaveConfigInput {
  url: string;
  username: string;
  password?: string;
  authHeader?: string;
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
