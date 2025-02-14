import { cookies } from "next/headers";
import connectDB from "@/lib/mongodb";
import { KomgaConfig } from "@/lib/models/config.model";

interface User {
  id: string;
  email: string;
}

interface KomgaConfigData {
  url: string;
  username: string;
  password: string;
}

export class ConfigDBService {
  private static async getCurrentUser(): Promise<User> {
    const userCookie = cookies().get("stripUser");

    if (!userCookie) {
      throw new Error("Utilisateur non authentifié");
    }

    try {
      return JSON.parse(atob(userCookie.value));
    } catch (error) {
      console.error("Erreur lors de la récupération de l'utilisateur depuis le cookie:", error);
      throw new Error("Utilisateur non authentifié");
    }
  }

  static async saveConfig(data: KomgaConfigData) {
    const user = await this.getCurrentUser();
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
    const user = await this.getCurrentUser();
    await connectDB();

    const config = await KomgaConfig.findOne({ userId: user.id });

    if (!config) {
      throw new Error("Configuration non trouvée");
    }

    return config;
  }
}
