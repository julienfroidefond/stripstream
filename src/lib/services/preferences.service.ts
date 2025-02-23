import { cookies } from "next/headers";
import { PreferencesModel } from "@/lib/models/preferences.model";

interface User {
  id: string;
  email: string;
}

export interface UserPreferences {
  showThumbnails: boolean;
  cacheMode: "memory" | "file";
  showOnlyUnread: boolean;
  debug: boolean;
}

const defaultPreferences: UserPreferences = {
  showThumbnails: true,
  cacheMode: "memory",
  showOnlyUnread: false,
  debug: false,
};

export class PreferencesService {
  static async getCurrentUser(): Promise<User> {
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

  static async getPreferences(): Promise<UserPreferences> {
    try {
      const user = await this.getCurrentUser();
      const preferences = await PreferencesModel.findOne({ userId: user.id });
      if (!preferences) {
        return defaultPreferences;
      }
      return {
        ...defaultPreferences,
        ...preferences.toObject(),
      };
    } catch (error) {
      console.error("Error getting preferences:", error);
      return defaultPreferences;
    }
  }

  static async updatePreferences(preferences: Partial<UserPreferences>): Promise<UserPreferences> {
    try {
      const user = await this.getCurrentUser();
      const updatedPreferences = await PreferencesModel.findOneAndUpdate(
        { userId: user.id },
        { $set: preferences },
        { new: true, upsert: true }
      );

      const result = {
        ...defaultPreferences,
        ...updatedPreferences.toObject(),
      };
      return result;
    } catch (error) {
      console.error("Error updating preferences:", error);
      throw error;
    }
  }
}
