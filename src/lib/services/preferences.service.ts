import prisma from "@/lib/prisma";
import { getCurrentUser } from "../auth-utils";
import { ERROR_CODES } from "../../constants/errorCodes";
import { AppError } from "../../utils/errors";
import type { UserPreferences, BackgroundPreferences } from "@/types/preferences";
import { defaultPreferences } from "@/types/preferences";
import type { User } from "@/types/komga";
import type { Prisma } from "@prisma/client";

export class PreferencesService {
  static async getCurrentUser(): Promise<User> {
    const user = await getCurrentUser();
    if (!user) {
      throw new AppError(ERROR_CODES.AUTH.UNAUTHENTICATED);
    }
    return user;
  }

  static async getPreferences(): Promise<UserPreferences> {
    try {
      const user = await this.getCurrentUser();
      const preferences = await prisma.preferences.findUnique({
        where: { userId: user.id },
      });
      
      if (!preferences) {
        return { ...defaultPreferences };
      }

      return {
        showThumbnails: preferences.showThumbnails,
        cacheMode: preferences.cacheMode as "memory" | "file",
        showOnlyUnread: preferences.showOnlyUnread,
        debug: preferences.debug,
        displayMode: preferences.displayMode as UserPreferences["displayMode"],
        background: preferences.background as unknown as BackgroundPreferences,
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
      
      const updateData: Record<string, any> = {};
      if (preferences.showThumbnails !== undefined) updateData.showThumbnails = preferences.showThumbnails;
      if (preferences.cacheMode !== undefined) updateData.cacheMode = preferences.cacheMode;
      if (preferences.showOnlyUnread !== undefined) updateData.showOnlyUnread = preferences.showOnlyUnread;
      if (preferences.debug !== undefined) updateData.debug = preferences.debug;
      if (preferences.displayMode !== undefined) updateData.displayMode = preferences.displayMode;
      if (preferences.background !== undefined) updateData.background = preferences.background;

      const updatedPreferences = await prisma.preferences.upsert({
        where: { userId: user.id },
        update: updateData,
        create: {
          userId: user.id,
          showThumbnails: preferences.showThumbnails ?? defaultPreferences.showThumbnails,
          cacheMode: preferences.cacheMode ?? defaultPreferences.cacheMode,
          showOnlyUnread: preferences.showOnlyUnread ?? defaultPreferences.showOnlyUnread,
          debug: preferences.debug ?? defaultPreferences.debug,
          displayMode: preferences.displayMode ?? defaultPreferences.displayMode,
          background: (preferences.background ?? defaultPreferences.background) as unknown as Prisma.InputJsonValue,
        },
      });

      return {
        showThumbnails: updatedPreferences.showThumbnails,
        cacheMode: updatedPreferences.cacheMode as "memory" | "file",
        showOnlyUnread: updatedPreferences.showOnlyUnread,
        debug: updatedPreferences.debug,
        displayMode: updatedPreferences.displayMode as UserPreferences["displayMode"],
        background: updatedPreferences.background as unknown as BackgroundPreferences,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(ERROR_CODES.PREFERENCES.UPDATE_ERROR, {}, error);
    }
  }
}
