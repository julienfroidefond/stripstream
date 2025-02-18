import { cookies } from "next/headers";
import connectDB from "@/lib/mongodb";
import { PreferencesModel } from "@/lib/models/preferences.model";

interface User {
  id: string;
  email: string;
}

export interface UserPreferences {
  showThumbnails: boolean;
}

export class PreferencesService {
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

  static async getPreferences(): Promise<UserPreferences> {
    await connectDB();
    const user = await this.getCurrentUser();

    const preferences = await PreferencesModel.findOne({ userId: user.id });
    if (!preferences) {
      // Créer les préférences par défaut si elles n'existent pas
      const defaultPreferences = await PreferencesModel.create({
        userId: user.id,
        showThumbnails: true,
      });
      return {
        showThumbnails: defaultPreferences.showThumbnails,
      };
    }

    return {
      showThumbnails: preferences.showThumbnails,
    };
  }

  static async updatePreferences(preferences: Partial<UserPreferences>): Promise<UserPreferences> {
    await connectDB();
    const user = await this.getCurrentUser();

    const updatedPreferences = await PreferencesModel.findOneAndUpdate(
      { userId: user.id },
      { $set: preferences },
      { new: true, upsert: true }
    );

    return {
      showThumbnails: updatedPreferences.showThumbnails,
    };
  }
}
