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

  static async saveConfig(data: KomgaConfigData): Promise<KomgaConfig> {
    try {
      const user: User | null = await this.getCurrentUser();
      const userId = parseInt(user.id, 10);

      const authHeader: string = Buffer.from(`${data.username}:${data.password}`).toString(
        "base64"
      );

      const config = await prisma.komgaConfig.upsert({
        where: { userId },
        update: {
          url: data.url,
          username: data.username,
          authHeader,
        },
        create: {
          userId,
          url: data.url,
          username: data.username,
          authHeader,
        },
      });

      return config as KomgaConfig;
    } catch (error) {
if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(ERROR_CODES.CONFIG.SAVE_ERROR, {}, error);
    }
  }

  static async getConfig(): Promise<KomgaConfig | null> {
    try {
      const user: User | null = await this.getCurrentUser();
      const userId = parseInt(user.id, 10);

      const config = await prisma.komgaConfig.findUnique({
        where: { userId },
      });
      return config;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(ERROR_CODES.CONFIG.FETCH_ERROR, {}, error);
    }
  }
}
