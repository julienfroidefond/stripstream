"use server";

import { FavoriteService } from "@/lib/services/favorite.service";
import { getProvider } from "@/lib/providers/provider.factory";
import { invalidateFavorites } from "@/lib/cache/invalidation";
import { ERROR_CODES } from "@/constants/errorCodes";
import { runAction, type ActionResult } from "@/lib/actions/action-runner";

/*
 * `runAction` et non `runProviderAction` : sans connexion active, l'échec
 * attendu reste `FAVORITE_ADD_ERROR` / `FAVORITE_DELETE_ERROR` (ADR 0008), pas
 * `PROVIDER_NOT_CONFIGURED`. Le runner garde la session et transmet `userId`.
 */

export async function addToFavorites(seriesId: string): Promise<ActionResult> {
  return runAction({
    name: "addToFavorites",
    fallbackCode: ERROR_CODES.FAVORITE.ADD_ERROR,
    fallbackMessage: "Erreur lors de l'ajout aux favoris",
    logContext: { seriesId },
    requireUser: true,
    invalidate: () => invalidateFavorites(),
    execute: async ({ userId }) => {
      await FavoriteService.addToFavorites({ userId, provider: await getProvider() }, seriesId);
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
    requireUser: true,
    invalidate: () => invalidateFavorites(),
    execute: async ({ userId }) => {
      await FavoriteService.removeFromFavorites(
        { userId, provider: await getProvider() },
        seriesId
      );
      return { message: "Série retirée des favoris" };
    },
  });
}
