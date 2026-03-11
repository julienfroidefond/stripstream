"use server";

import { revalidatePath } from "next/cache";
import { ConfigDBService } from "@/lib/services/config-db.service";
import { AppError } from "@/utils/errors";
import { ERROR_CODES } from "@/constants/errorCodes";
import type { KomgaConfig, KomgaConfigData, KomgaLibrary } from "@/types/komga";

interface SaveConfigInput {
  url: string;
  username: string;
  password?: string;
  authHeader?: string;
}

export async function testKomgaConnection(
  serverUrl: string,
  username: string,
  password: string
): Promise<{ success: boolean; message: string }> {
  try {
    const authHeader = Buffer.from(`${username}:${password}`).toString("base64");
    const url = new URL(`${serverUrl}/api/v1/libraries`).toString();
    const headers = new Headers({
      Authorization: `Basic ${authHeader}`,
      Accept: "application/json",
    });

    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new AppError(ERROR_CODES.KOMGA.CONNECTION_ERROR);
    }

    const libraries: KomgaLibrary[] = await response.json();
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
    revalidatePath("/settings");
    return { success: true, message: "Configuration sauvegardée", data: mongoConfig };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, message: error.message };
    }
    return { success: false, message: "Erreur lors de la sauvegarde" };
  }
}
