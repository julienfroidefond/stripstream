"use server";

import { FavoriteService } from "@/lib/services/favorite.service";
import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError } from "@/utils/errors";

/**
 * Ajoute une série aux favoris
 */
export async function addToFavorites(
  seriesId: string
): Promise<{ success: boolean; message: string }> {
  try {
    await FavoriteService.addToFavorites(seriesId);
    return { success: true, message: "Série ajoutée aux favoris" };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, message: error.message };
    }
    return { success: false, message: "Erreur lors de l'ajout aux favoris" };
  }
}

/**
 * Retire une série des favoris
 */
export async function removeFromFavorites(
  seriesId: string
): Promise<{ success: boolean; message: string }> {
  try {
    await FavoriteService.removeFromFavorites(seriesId);
    return { success: true, message: "Série retirée des favoris" };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, message: error.message };
    }
    return { success: false, message: "Erreur lors de la suppression des favoris" };
  }
}
