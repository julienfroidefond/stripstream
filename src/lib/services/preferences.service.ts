import { PreferencesModel } from "@/lib/models/preferences.model";
import { AuthServerService } from "./auth-server.service";
import { ERROR_CODES } from "../../constants/errorCodes";
import { AppError } from "../../utils/errors";
import type { UserPreferences } from "@/types/preferences";
import { defaultPreferences } from "@/types/preferences";
import type { User } from "@/types/komga";
import connectDB from "@/lib/mongodb";

export class PreferencesService {
  static async getCurrentUser(): Promise<User> {
    const user = await AuthServerService.getCurrentUser();
    if (!user) {
      throw new AppError(ERROR_CODES.AUTH.UNAUTHENTICATED);
    }
    return user;
  }

  static async getPreferences(): Promise<UserPreferences> {
    try {
      const user = await this.getCurrentUser();
      await connectDB();
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
      const user = await this.getCurrentUser();
      await connectDB();
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
