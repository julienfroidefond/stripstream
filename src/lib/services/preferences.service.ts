import prisma from "@/lib/prisma";
import { cache } from "react";
import { unstable_rethrow } from "next/navigation";
import { getCurrentUser } from "../auth-utils";
import { ERROR_CODES } from "../../constants/errorCodes";
import { AppError } from "../../utils/errors";
import type { UserPreferences } from "@/types/preferences";
import type { User } from "@/types/komga";
import {
  preferenceCreateColumns,
  preferencePatchToColumns,
  readPreferences,
} from "@/lib/preferences/descriptor";

export class PreferencesService {
  static async getCurrentUser(): Promise<User> {
    const user = await getCurrentUser();
    if (!user) {
      throw new AppError(ERROR_CODES.AUTH.UNAUTHENTICATED);
    }
    return user;
  }

  static getPreferences = cache(async (): Promise<UserPreferences> => {
    try {
      const user = await PreferencesService.getCurrentUser();
      const userId = parseInt(user.id, 10);

      const preferences = await prisma.preferences.findUnique({
        where: { userId },
      });

      return readPreferences(preferences);
    } catch (error) {
      unstable_rethrow(error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(ERROR_CODES.PREFERENCES.FETCH_ERROR, {}, error);
    }
  });

  static async updatePreferences(preferences: Partial<UserPreferences>): Promise<UserPreferences> {
    try {
      const user = await this.getCurrentUser();
      const userId = parseInt(user.id, 10);

      const updatedPreferences = await prisma.preferences.upsert({
        where: { userId },
        update: preferencePatchToColumns(preferences),
        create: { userId, ...preferenceCreateColumns(preferences) },
      });

      return readPreferences(updatedPreferences);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(ERROR_CODES.PREFERENCES.UPDATE_ERROR, {}, error);
    }
  }
}
