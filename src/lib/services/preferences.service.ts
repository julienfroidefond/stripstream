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
import {
  mergePreferences,
  type PreferencesPatch,
} from "@/lib/preferences/preferences-writer";

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
    patch: PreferencesPatch
  ): Promise<UserPreferences> {
    try {
      // `displayMode` est une colonne JSON : un patch partiel doit être fusionné
      // avec la ligne courante avant écriture, sinon `normalizeDisplayMode`
      // compléterait les clés absentes avec les défauts et écraserait les
      // réglages de l'utilisateur (taille de page, compact).
      const current = await prisma.preferences.findUnique({ where: { userId } });
      const merged = mergePreferences(readPreferences(current), patch);
      const values: Partial<UserPreferences> = {
        ...patch,
        displayMode: merged.displayMode,
      };
      // Ne réécrit la colonne JSON que si le patch la visait.
      if (!patch.displayMode) delete values.displayMode;

      const updatedPreferences = await prisma.preferences.upsert({
        where: { userId },
        update: preferencePatchToColumns(values),
        create: { userId, ...preferenceCreateColumns(merged) },
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
