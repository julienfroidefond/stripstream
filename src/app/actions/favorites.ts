"use server";

import { FavoriteService } from "@/lib/services/favorite.service";
import { invalidateFavorites } from "@/lib/cache/invalidation";
import { ERROR_CODES } from "@/constants/errorCodes";
import { runAction, type ActionResult } from "@/lib/actions/action-runner";

export async function addToFavorites(seriesId: string): Promise<ActionResult> {
  return runAction({
    name: "addToFavorites",
    fallbackCode: ERROR_CODES.FAVORITE.ADD_ERROR,
    fallbackMessage: "Erreur lors de l'ajout aux favoris",
    logContext: { seriesId },
    invalidate: () => invalidateFavorites(),
    execute: async () => {
      await FavoriteService.addToFavorites(seriesId);
      return { message: "Série ajoutée aux favoris" };
    },
  });
}

export async function removeFromFavorites(seriesId: string): Promise<ActionResult> {
  return runAction({
    name: "removeFromFavorites",
    fallbackCode: ERROR_CODES.FAVORITE.DELETE_ERROR,
    fallbackMessage: "Erreur lors de la suppression des favoris",
    logContext: { seriesId },
    invalidate: () => invalidateFavorites(),
    execute: async () => {
      await FavoriteService.removeFromFavorites(seriesId);
      return { message: "Série retirée des favoris" };
    },
  });
}
