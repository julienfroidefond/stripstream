import { PreferencesModel } from "@/lib/models/preferences.model";
import { AuthServerService } from "./auth-server.service";

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
  static getCurrentUser(): User {
    const user = AuthServerService.getCurrentUser();
    if (!user) {
      throw new Error("Utilisateur non authentifié");
    }
    return user;
  }

  static async getPreferences(): Promise<UserPreferences> {
    try {
      const user = this.getCurrentUser();
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
      const user = this.getCurrentUser();
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
