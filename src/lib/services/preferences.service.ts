import { PreferencesModel } from "@/lib/models/preferences.model";
import { AuthServerService } from "./auth-server.service";
import { ERROR_CODES } from "../../constants/errorCodes";
import { AppError } from "../../utils/errors";

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
      throw new AppError(ERROR_CODES.AUTH.UNAUTHENTICATED);
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
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(ERROR_CODES.PREFERENCES.FETCH_ERROR, {}, error);
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
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(ERROR_CODES.PREFERENCES.UPDATE_ERROR, {}, error);
    }
  }
}
