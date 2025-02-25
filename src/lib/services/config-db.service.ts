import connectDB from "@/lib/mongodb";
import { KomgaConfig } from "@/lib/models/config.model";
import { TTLConfig } from "@/lib/models/ttl-config.model";
import { DebugService } from "./debug.service";
import { AuthServerService } from "./auth-server.service";
import { ERROR_CODES } from "../../constants/errorCodes";
import { AppError } from "../../utils/errors";

interface User {
  id: string;
  email: string;
}

interface KomgaConfigData {
  url: string;
  username: string;
  password: string;
  authHeader: string;
}

interface TTLConfigData {
  defaultTTL: number;
  homeTTL: number;
  librariesTTL: number;
  seriesTTL: number;
  booksTTL: number;
  imagesTTL: number;
}

export class ConfigDBService {
  private static getCurrentUser(): User {
    const user = AuthServerService.getCurrentUser();
    if (!user) {
      throw new AppError(ERROR_CODES.AUTH.UNAUTHENTICATED);
    }
    return user;
  }

  static async saveConfig(data: KomgaConfigData) {
    try {
      const user = this.getCurrentUser();
      await connectDB();

      const authHeader = Buffer.from(`${data.username}:${data.password}`).toString("base64");

      const config = await KomgaConfig.findOneAndUpdate(
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

      return config;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(ERROR_CODES.CONFIG.SAVE_ERROR, {}, error);
    }
  }

  static async getConfig() {
    try {
      const user = this.getCurrentUser();
      await connectDB();

      return DebugService.measureMongoOperation("getConfig", async () => {
        const config = await KomgaConfig.findOne({ userId: user.id });
        return config;
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(ERROR_CODES.CONFIG.FETCH_ERROR, {}, error);
    }
  }

  static async getTTLConfig() {
    try {
      const user = this.getCurrentUser();
      await connectDB();

      return DebugService.measureMongoOperation("getTTLConfig", async () => {
        const config = await TTLConfig.findOne({ userId: user.id });
        return config;
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(ERROR_CODES.CONFIG.TTL_FETCH_ERROR, {}, error);
    }
  }

  static async saveTTLConfig(data: TTLConfigData) {
    try {
      const user = this.getCurrentUser();
      await connectDB();

      return DebugService.measureMongoOperation("saveTTLConfig", async () => {
        const config = await TTLConfig.findOneAndUpdate(
          { userId: user.id },
          {
            userId: user.id,
            ...data,
          },
          { upsert: true, new: true }
        );
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
