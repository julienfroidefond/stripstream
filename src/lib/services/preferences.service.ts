import prisma from "@/lib/prisma";
import { cache } from "react";
import { unstable_rethrow } from "next/navigation";
import { ERROR_CODES } from "../../constants/errorCodes";
import { AppError } from "../../utils/errors";
import type { UserPreferences } from "@/types/preferences";
import {
  preferenceCreateColumns,
  preferencePatchToColumns,
  readPreferences,
} from "@/lib/preferences/descriptor";

/**
 * Préférences d'un utilisateur identifié par l'appelant. Le service ne lit pas
 * la session (ADR 0029) : un chemin sans session (layout public, mode
 * anonyme) ne l'appelle pas et retombe sur `defaultPreferences`.
 */
export class PreferencesService {
  /** Mémoïsée par requête et par `userId` (React `cache`). */
  static getPreferences = cache(async (userId: number): Promise<UserPreferences> => {
    try {
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

  static async updatePreferences(
    userId: number,
    preferences: Partial<UserPreferences>
  ): Promise<UserPreferences> {
    try {
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
