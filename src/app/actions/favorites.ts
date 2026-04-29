"use server";

import { revalidateTag } from "next/cache";
import { FavoriteService } from "@/lib/services/favorite.service";
import { AppError } from "@/utils/errors";
import { FAVORITES_CACHE_TAG, HOME_CACHE_TAG } from "@/constants/cacheConstants";

function revalidateFavoritesCaches() {
  revalidateTag(FAVORITES_CACHE_TAG, "max");
  // La home affiche les favoris → invalider aussi pour que la liste soit à jour.
  revalidateTag(HOME_CACHE_TAG, "max");
}

export async function addToFavorites(
  seriesId: string
): Promise<{ success: boolean; message: string }> {
  try {
    await FavoriteService.addToFavorites(seriesId);
    revalidateFavoritesCaches();
    return { success: true, message: "Série ajoutée aux favoris" };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, message: error.message };
    }
    return { success: false, message: "Erreur lors de l'ajout aux favoris" };
  }
}

export async function removeFromFavorites(
  seriesId: string
): Promise<{ success: boolean; message: string }> {
  try {
    await FavoriteService.removeFromFavorites(seriesId);
    revalidateFavoritesCaches();
    return { success: true, message: "Série retirée des favoris" };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, message: error.message };
    }
    return { success: false, message: "Erreur lors de la suppression des favoris" };
  }
}
