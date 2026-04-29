import prisma from "@/lib/prisma";
import { getCurrentUser } from "../auth-utils";
import { ERROR_CODES } from "../../constants/errorCodes";
import { AppError } from "../../utils/errors";
import type { User, KomgaConfigData, KomgaConfig } from "@/types/komga";

export class ConfigDBService {
  private static async getCurrentUser(): Promise<User> {
    const user: User | null = await getCurrentUser();
    if (!user) {
      throw new AppError(ERROR_CODES.AUTH.UNAUTHENTICATED);
    }
    return user;
  }

  /**
   * Sauvegarde / met à jour la config Komga active. Si l'utilisateur n'en a pas encore,
   * en crée une nommée "Default" et la définit comme active.
   * (Step 1 : conserve la sémantique "config unique" pré-multi-config.
   *  Step 2 ajoutera des méthodes id-aware pour gérer plusieurs configs.)
   */
  static async saveConfig(data: KomgaConfigData): Promise<KomgaConfig> {
    try {
      const user = await this.getCurrentUser();
      const userId = parseInt(user.id, 10);

      const authHeader = Buffer.from(`${data.username}:${data.password}`).toString("base64");

      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { activeKomgaConfigId: true },
      });

      if (dbUser?.activeKomgaConfigId) {
        const config = await prisma.komgaConfig.update({
          where: { id: dbUser.activeKomgaConfigId },
          data: { url: data.url, username: data.username, authHeader },
        });
        return config as KomgaConfig;
      }

      const config = await prisma.komgaConfig.create({
        data: {
          userId,
          name: "Default",
          url: data.url,
          username: data.username,
          authHeader,
        },
      });
      await prisma.user.update({
        where: { id: userId },
        data: { activeKomgaConfigId: config.id },
      });
      return config as KomgaConfig;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(ERROR_CODES.CONFIG.SAVE_ERROR, {}, error);
    }
  }

  /**
   * Récupère la config Komga active du user (ou la première disponible en fallback).
   */
  static async getConfig(): Promise<KomgaConfig | null> {
    try {
      const user = await this.getCurrentUser();
      const userId = parseInt(user.id, 10);

      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { activeKomgaConfigId: true },
      });

      if (dbUser?.activeKomgaConfigId) {
        const config = await prisma.komgaConfig.findFirst({
          where: { id: dbUser.activeKomgaConfigId, userId },
        });
        if (config) return config as KomgaConfig;
      }

      const fallback = await prisma.komgaConfig.findFirst({
        where: { userId },
        orderBy: { createdAt: "asc" },
      });
      return fallback as KomgaConfig | null;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(ERROR_CODES.CONFIG.FETCH_ERROR, {}, error);
    }
  }
}
