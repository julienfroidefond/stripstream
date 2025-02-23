import { cookies } from "next/headers";
import connectDB from "@/lib/mongodb";
import { KomgaConfig } from "@/lib/models/config.model";
import { TTLConfig } from "@/lib/models/ttl-config.model";
import { DebugService } from "./debug.service";
import { AuthServerService } from "./auth-server.service";

interface User {
  id: string;
  email: string;
}

interface KomgaConfigData {
  url: string;
  username: string;
  password: string;
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
      throw new Error("Utilisateur non authentifié");
    }
    return user;
  }

  static async getConfig() {
    const user = this.getCurrentUser();
    await connectDB();

    return DebugService.measureMongoOperation("getConfig", async () => {
      const config = await KomgaConfig.findOne({ userId: user.id });
      return config;
    });
  }

  static async saveConfig(data: KomgaConfigData) {
    const user = this.getCurrentUser();
    await connectDB();

    return DebugService.measureMongoOperation("saveConfig", async () => {
      const config = await KomgaConfig.findOneAndUpdate(
        { userId: user.id },
        {
          userId: user.id,
          url: data.url,
          username: data.username,
          password: data.password,
        },
        { upsert: true, new: true }
      );
      return config;
    });
  }

  static async getTTLConfig() {
    const user = this.getCurrentUser();
    await connectDB();

    return DebugService.measureMongoOperation("getTTLConfig", async () => {
      const config = await TTLConfig.findOne({ userId: user.id });
      return config;
    });
  }

  static async saveTTLConfig(data: TTLConfigData) {
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
  }
}
