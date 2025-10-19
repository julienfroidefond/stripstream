import prisma from "@/lib/prisma";
import { getCurrentUser } from "../auth-utils";
import { ERROR_CODES } from "../../constants/errorCodes";
import { AppError } from "../../utils/errors";
import type { User, KomgaConfigData, TTLConfigData, KomgaConfig, TTLConfig } from "@/types/komga";

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

      const authHeader: string = Buffer.from(`${data.username}:${data.password}`).toString(
        "base64"
      );

      const config = await prisma.komgaConfig.upsert({
        where: { userId: user.id },
        update: {
          url: data.url,
          username: data.username,
          authHeader,
        },
        create: {
          userId: user.id,
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

      const config = await prisma.komgaConfig.findUnique({
        where: { userId: user.id },
      });
      return config as KomgaConfig | null;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(ERROR_CODES.CONFIG.FETCH_ERROR, {}, error);
    }
  }

  static async getTTLConfig(): Promise<TTLConfig | null> {
    try {
      const user: User | null = await this.getCurrentUser();

      const config = await prisma.tTLConfig.findUnique({
        where: { userId: user.id },
      });
      return config as TTLConfig | null;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(ERROR_CODES.CONFIG.TTL_FETCH_ERROR, {}, error);
    }
  }

  static async saveTTLConfig(data: TTLConfigData): Promise<TTLConfig> {
    try {
      const user: User | null = await this.getCurrentUser();

      const config = await prisma.tTLConfig.upsert({
        where: { userId: user.id },
        update: {
          defaultTTL: data.defaultTTL,
          homeTTL: data.homeTTL,
          librariesTTL: data.librariesTTL,
          seriesTTL: data.seriesTTL,
          booksTTL: data.booksTTL,
          imagesTTL: data.imagesTTL,
          imageCacheMaxAge: data.imageCacheMaxAge,
        },
        create: {
          userId: user.id,
          defaultTTL: data.defaultTTL,
          homeTTL: data.homeTTL,
          librariesTTL: data.librariesTTL,
          seriesTTL: data.seriesTTL,
          booksTTL: data.booksTTL,
          imagesTTL: data.imagesTTL,
          imageCacheMaxAge: data.imageCacheMaxAge,
        },
      });

      return config as TTLConfig;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(ERROR_CODES.CONFIG.TTL_SAVE_ERROR, {}, error);
    }
  }
}
