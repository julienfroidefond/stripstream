"use server";

import { updateTag } from "next/cache";
import { getProvider } from "@/lib/providers/provider.factory";
import { SERIES_RATING_CACHE_TAG } from "@/constants/cacheConstants";
import { AppError } from "@/utils/errors";
import { getErrorMessage } from "@/utils/errors";
import { ERROR_CODES } from "@/constants/errorCodes";
import logger from "@/lib/logger";

/**
 * Invalide le cache de note pour une série après modification.
 * Ciblage granulaire : seul le tag per-id est invalidé (pas de tag global).
 */
function revalidateRatingCache(seriesId: string) {
  updateTag(`${SERIES_RATING_CACHE_TAG}:${seriesId}`);
}

export async function setSeriesRating(
  seriesId: string,
  rating: number
): Promise<{ success: boolean; message: string }> {
  if (!(1 <= rating && rating <= 10)) {
    return { success: false, message: getErrorMessage(ERROR_CODES.SERIES.RATING_ERROR) };
  }

  try {
    const provider = await getProvider();
    if (!provider) return { success: false, message: "Provider non configuré" };

    await provider.setSeriesRating(seriesId, rating);
    revalidateRatingCache(seriesId);

    return { success: true, message: "Note enregistrée" };
  } catch (error) {
    logger.error({ err: error, seriesId, rating }, "Erreur lors de l'enregistrement de la note");
    if (error instanceof AppError) {
      return { success: false, message: error.message };
    }
    return { success: false, message: getErrorMessage(ERROR_CODES.SERIES.RATING_ERROR) };
  }
}

export async function deleteSeriesRating(
  seriesId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const provider = await getProvider();
    if (!provider) return { success: false, message: "Provider non configuré" };

    await provider.deleteSeriesRating(seriesId);
    revalidateRatingCache(seriesId);

    return { success: true, message: "Note supprimée" };
  } catch (error) {
    logger.error({ err: error, seriesId }, "Erreur lors de la suppression de la note");
    if (error instanceof AppError) {
      return { success: false, message: error.message };
    }
    return { success: false, message: getErrorMessage(ERROR_CODES.SERIES.RATING_ERROR) };
  }
}
