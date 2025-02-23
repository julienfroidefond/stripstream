import connectDB from "@/lib/mongodb";
import { KomgaConfig } from "@/lib/models/config.model";
import { TTLConfig } from "@/lib/models/ttl-config.model";
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

  static async saveConfig(data: KomgaConfigData) {
    const user = this.getCurrentUser();
    await connectDB();

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
  }

  static async getConfig() {
    const user = this.getCurrentUser();
    await connectDB();

    const config = await KomgaConfig.findOne({ userId: user.id });

    if (!config) {
      throw new Error("Configuration non trouvée");
    }

    return config;
  }

  static async saveTTLConfig(data: TTLConfigData) {
    const user = this.getCurrentUser();
    await connectDB();

    const config = await TTLConfig.findOneAndUpdate(
      { userId: user.id },
      {
        userId: user.id,
        ...data,
      },
      { upsert: true, new: true }
    );

    return config;
  }

  static async getTTLConfig() {
    const user = this.getCurrentUser();
    await connectDB();

    const config = await TTLConfig.findOne({ userId: user.id });

    if (!config) {
      // Retourner la configuration par défaut si aucune configuration n'existe
      return {
        defaultTTL: 5,
        homeTTL: 5,
        librariesTTL: 1440,
        seriesTTL: 5,
        booksTTL: 5,
        imagesTTL: 1440,
      };
    }

    return {
      defaultTTL: config.defaultTTL,
      homeTTL: config.homeTTL,
      librariesTTL: config.librariesTTL,
      seriesTTL: config.seriesTTL,
      booksTTL: config.booksTTL,
      imagesTTL: config.imagesTTL,
    };
  }
}
