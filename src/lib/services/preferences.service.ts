import { cookies } from "next/headers";
import connectDB from "@/lib/mongodb";
import { PreferencesModel } from "@/lib/models/preferences.model";

interface User {
  id: string;
  email: string;
}

export interface UserPreferences {
  showThumbnails: boolean;
  cacheMode: "memory" | "file";
}

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
        return {
          showThumbnails: true,
          cacheMode: "memory",
        };
      }
      return {
        showThumbnails: preferences.showThumbnails,
        cacheMode: preferences.cacheMode || "memory",
      };
    } catch (error) {
      console.error("Error getting preferences:", error);
      return {
        showThumbnails: true,
        cacheMode: "memory",
      };
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

      return {
        showThumbnails: updatedPreferences.showThumbnails,
        cacheMode: updatedPreferences.cacheMode || "memory",
      };
    } catch (error) {
      console.error("Error updating preferences:", error);
      throw error;
    }
  }
}
