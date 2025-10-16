import connectDB from "@/lib/mongodb";
import { KomgaConfig as KomgaConfigModel } from "@/lib/models/config.model";
import { TTLConfig as TTLConfigModel } from "@/lib/models/ttl-config.model";
import { DebugService } from "./debug.service";
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
      await connectDB();

      const authHeader: string = Buffer.from(`${data.username}:${data.password}`).toString(
        "base64"
      );

      const config: KomgaConfig | null = await KomgaConfigModel.findOneAndUpdate(
        { userId: user.id },
        {
          userId: user.id,
          url: data.url,
          username: data.username,
          // password: data.password,
          authHeader,
        },
        { upsert: true, new: true }
      );
      if (!config) {
        throw new AppError(ERROR_CODES.CONFIG.SAVE_ERROR);
      }

      return config;
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
      await connectDB();

      return DebugService.measureMongoOperation("getConfig", async () => {
        const config: KomgaConfig | null = await KomgaConfigModel.findOne({ userId: user.id });
        return config;
      });
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
      await connectDB();

      return DebugService.measureMongoOperation("getTTLConfig", async () => {
        const config: TTLConfig | null = await TTLConfigModel.findOne({ userId: user.id });
        return config;
      });
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
      await connectDB();

      return DebugService.measureMongoOperation("saveTTLConfig", async () => {
        const config: TTLConfig | null = await TTLConfigModel.findOneAndUpdate(
          { userId: user.id },
          {
            userId: user.id,
            ...data,
          },
          { upsert: true, new: true }
        );

        if (!config) {
          throw new AppError(ERROR_CODES.CONFIG.TTL_SAVE_ERROR);
        }

        return config;
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(ERROR_CODES.CONFIG.TTL_SAVE_ERROR, {}, error);
    }
  }
}
