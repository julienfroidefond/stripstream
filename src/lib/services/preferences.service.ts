import prisma from "@/lib/prisma";
import { getCurrentUser } from "../auth-utils";
import { ERROR_CODES } from "../../constants/errorCodes";
import { AppError } from "../../utils/errors";
import type {
  UserPreferences,
  BackgroundPreferences,
  CircuitBreakerConfig,
} from "@/types/preferences";
import { defaultPreferences } from "@/types/preferences";
import type { User } from "@/types/komga";
import type { Prisma } from "@prisma/client";
import { getServerCacheService } from "./server-cache.service";

export class PreferencesService {
  static async getCurrentUser(): Promise<User> {
    const user = await getCurrentUser();
    if (!user) {
      throw new AppError(ERROR_CODES.AUTH.UNAUTHENTICATED);
    }
    return user;
  }

  /**
   * Récupère les préférences depuis la DB (sans cache)
   * Utilisé en interne par getCachedPreferences()
   */
  private static async getPreferencesFromDB(): Promise<UserPreferences> {
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
        cacheMode: preferences.cacheMode as "memory" | "file",
        showOnlyUnread: preferences.showOnlyUnread,
        displayMode: {
          ...defaultPreferences.displayMode,
          ...displayMode,
          viewMode: displayMode?.viewMode || defaultPreferences.displayMode.viewMode,
        },
        background: preferences.background as unknown as BackgroundPreferences,
        komgaMaxConcurrentRequests: preferences.komgaMaxConcurrentRequests,
        readerPrefetchCount: preferences.readerPrefetchCount,
        circuitBreakerConfig: preferences.circuitBreakerConfig as unknown as CircuitBreakerConfig,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(ERROR_CODES.PREFERENCES.FETCH_ERROR, {}, error);
    }
  }

  /**
   * Récupère les préférences avec cache (TTL: 1 minute)
   * Utilise ServerCacheService pour éviter les appels DB répétés
   */
  static async getPreferences(): Promise<UserPreferences> {
    try {
      const cacheService = await getServerCacheService();
      const cacheKey = "preferences";

      // Utiliser getOrSet avec un fetcher qui récupère depuis la DB
      // Note: getOrSet ajoute automatiquement le user.id au cacheKey
      // TTL par défaut (5 min) est acceptable pour les préférences
      // Elles changent rarement et 5 min est un bon compromis
      const preferences = await cacheService.getOrSet(
        cacheKey,
        async () => this.getPreferencesFromDB(),
        "DEFAULT"
      );

      return preferences;
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

      const updateData: Record<string, any> = {};
      if (preferences.showThumbnails !== undefined)
        updateData.showThumbnails = preferences.showThumbnails;
      if (preferences.cacheMode !== undefined) updateData.cacheMode = preferences.cacheMode;
      if (preferences.showOnlyUnread !== undefined)
        updateData.showOnlyUnread = preferences.showOnlyUnread;
      if (preferences.displayMode !== undefined) updateData.displayMode = preferences.displayMode;
      if (preferences.background !== undefined) updateData.background = preferences.background;
      if (preferences.komgaMaxConcurrentRequests !== undefined)
        updateData.komgaMaxConcurrentRequests = preferences.komgaMaxConcurrentRequests;
      if (preferences.readerPrefetchCount !== undefined)
        updateData.readerPrefetchCount = preferences.readerPrefetchCount;
      if (preferences.circuitBreakerConfig !== undefined)
        updateData.circuitBreakerConfig = preferences.circuitBreakerConfig;

      const updatedPreferences = await prisma.preferences.upsert({
        where: { userId },
        update: updateData,
        create: {
          userId,
          showThumbnails: preferences.showThumbnails ?? defaultPreferences.showThumbnails,
          cacheMode: preferences.cacheMode ?? defaultPreferences.cacheMode,
          showOnlyUnread: preferences.showOnlyUnread ?? defaultPreferences.showOnlyUnread,
          displayMode: preferences.displayMode ?? defaultPreferences.displayMode,
          background: (preferences.background ??
            defaultPreferences.background) as unknown as Prisma.InputJsonValue,
          circuitBreakerConfig: (preferences.circuitBreakerConfig ??
            defaultPreferences.circuitBreakerConfig) as unknown as Prisma.InputJsonValue,
          komgaMaxConcurrentRequests: preferences.komgaMaxConcurrentRequests ?? 5,
          readerPrefetchCount: preferences.readerPrefetchCount ?? 5,
        },
      });

      const result: UserPreferences = {
        showThumbnails: updatedPreferences.showThumbnails,
        cacheMode: updatedPreferences.cacheMode as "memory" | "file",
        showOnlyUnread: updatedPreferences.showOnlyUnread,
        displayMode: updatedPreferences.displayMode as UserPreferences["displayMode"],
        background: updatedPreferences.background as unknown as BackgroundPreferences,
        komgaMaxConcurrentRequests: updatedPreferences.komgaMaxConcurrentRequests,
        readerPrefetchCount: updatedPreferences.readerPrefetchCount,
        circuitBreakerConfig:
          updatedPreferences.circuitBreakerConfig as unknown as CircuitBreakerConfig,
      };

      // Invalider le cache des préférences après mise à jour
      try {
        const cacheService = await getServerCacheService();
        await cacheService.delete("preferences");
      } catch (cacheError) {
        // Ne pas faire échouer la mise à jour si l'invalidation du cache échoue
        // Les préférences seront rechargées au prochain appel
      }

      return result;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(ERROR_CODES.PREFERENCES.UPDATE_ERROR, {}, error);
    }
  }
}
