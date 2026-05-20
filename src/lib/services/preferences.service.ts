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
      const userId = parseInt(user.id, 10);

      const preferences = await prisma.preferences.findUnique({
        where: { userId },
      });

      if (!preferences) {
        return { ...defaultPreferences };
      }

      const displayMode = preferences.displayMode as UserPreferences["displayMode"];

      return {
        showThumbnails: preferences.showThumbnails,
        showOnlyUnread: preferences.showOnlyUnread,
        anonymousMode: preferences.anonymousMode,
        displayMode: {
          ...defaultPreferences.displayMode,
          ...displayMode,
          viewMode: displayMode?.viewMode || defaultPreferences.displayMode.viewMode,
        },
        background: {
          ...defaultPreferences.background,
          ...(preferences.background as unknown as BackgroundPreferences),
        },
        readerPrefetchCount: preferences.readerPrefetchCount,
        readingDirection: (preferences.readingDirection as UserPreferences["readingDirection"]) ?? defaultPreferences.readingDirection,
        readerFitMode: (preferences.readerFitMode as UserPreferences["readerFitMode"]) ?? defaultPreferences.readerFitMode,
        readerDoublePageMode: preferences.readerDoublePageMode,
        defaultSortOrder: (preferences.defaultSortOrder as UserPreferences["defaultSortOrder"]) ?? defaultPreferences.defaultSortOrder,
        showMissingBooks: preferences.showMissingBooks,
        hideMissingBooks: preferences.hideMissingBooks,
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
      const userId = parseInt(user.id, 10);

      const updateData: Prisma.PreferencesUpdateInput = {};
      if (preferences.showThumbnails !== undefined)
        updateData.showThumbnails = preferences.showThumbnails;
      if (preferences.showOnlyUnread !== undefined)
        updateData.showOnlyUnread = preferences.showOnlyUnread;
      if (preferences.displayMode !== undefined) updateData.displayMode = preferences.displayMode;
      if (preferences.background !== undefined) {
        updateData.background = {
          ...defaultPreferences.background,
          ...(preferences.background as unknown as BackgroundPreferences),
        } as unknown as Prisma.InputJsonValue;
      }
      if (preferences.readerPrefetchCount !== undefined)
        updateData.readerPrefetchCount = preferences.readerPrefetchCount;
      if (preferences.anonymousMode !== undefined)
        updateData.anonymousMode = preferences.anonymousMode;
      if (preferences.readingDirection !== undefined)
        updateData.readingDirection = preferences.readingDirection;
      if (preferences.readerFitMode !== undefined)
        updateData.readerFitMode = preferences.readerFitMode;
      if (preferences.readerDoublePageMode !== undefined)
        updateData.readerDoublePageMode = preferences.readerDoublePageMode;
      if (preferences.defaultSortOrder !== undefined)
        updateData.defaultSortOrder = preferences.defaultSortOrder;
      if (preferences.showMissingBooks !== undefined)
        updateData.showMissingBooks = preferences.showMissingBooks;
      if (preferences.hideMissingBooks !== undefined)
        updateData.hideMissingBooks = preferences.hideMissingBooks;

      const updatedPreferences = await prisma.preferences.upsert({
        where: { userId },
        update: updateData,
        create: {
          userId,
          showThumbnails: preferences.showThumbnails ?? defaultPreferences.showThumbnails,
          showOnlyUnread: preferences.showOnlyUnread ?? defaultPreferences.showOnlyUnread,
          anonymousMode: preferences.anonymousMode ?? defaultPreferences.anonymousMode,
          displayMode: preferences.displayMode ?? defaultPreferences.displayMode,
          background: (preferences.background ??
            defaultPreferences.background) as unknown as Prisma.InputJsonValue,
          readerPrefetchCount: preferences.readerPrefetchCount ?? 5,
          readingDirection: preferences.readingDirection ?? defaultPreferences.readingDirection,
          readerFitMode: preferences.readerFitMode ?? defaultPreferences.readerFitMode,
          readerDoublePageMode: preferences.readerDoublePageMode ?? defaultPreferences.readerDoublePageMode,
          defaultSortOrder: preferences.defaultSortOrder ?? defaultPreferences.defaultSortOrder,
          showMissingBooks: preferences.showMissingBooks ?? defaultPreferences.showMissingBooks,
          hideMissingBooks: preferences.hideMissingBooks ?? defaultPreferences.hideMissingBooks,
        },
      });

      return {
        showThumbnails: updatedPreferences.showThumbnails,
        showOnlyUnread: updatedPreferences.showOnlyUnread,
        anonymousMode: updatedPreferences.anonymousMode,
        displayMode: updatedPreferences.displayMode as UserPreferences["displayMode"],
        background: {
          ...defaultPreferences.background,
          ...(updatedPreferences.background as unknown as BackgroundPreferences),
        },
        readerPrefetchCount: updatedPreferences.readerPrefetchCount,
        readingDirection: (updatedPreferences.readingDirection as UserPreferences["readingDirection"]) ?? defaultPreferences.readingDirection,
        readerFitMode: (updatedPreferences.readerFitMode as UserPreferences["readerFitMode"]) ?? defaultPreferences.readerFitMode,
        readerDoublePageMode: updatedPreferences.readerDoublePageMode,
        defaultSortOrder: (updatedPreferences.defaultSortOrder as UserPreferences["defaultSortOrder"]) ?? defaultPreferences.defaultSortOrder,
        showMissingBooks: updatedPreferences.showMissingBooks,
        hideMissingBooks: updatedPreferences.hideMissingBooks,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(ERROR_CODES.PREFERENCES.UPDATE_ERROR, {}, error);
    }
  }
}
