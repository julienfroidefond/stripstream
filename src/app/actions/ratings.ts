"use server";

import { getProvider } from "@/lib/providers/provider.factory";
import { invalidateSeriesRating } from "@/lib/cache/invalidation";
import { AppError } from "@/utils/errors";
import { getErrorMessage } from "@/utils/errors";
import { ERROR_CODES } from "@/constants/errorCodes";
import logger from "@/lib/logger";

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
    invalidateSeriesRating(seriesId);

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
    invalidateSeriesRating(seriesId);

    return { success: true, message: "Note supprimée" };
  } catch (error) {
    logger.error({ err: error, seriesId }, "Erreur lors de la suppression de la note");
    if (error instanceof AppError) {
      return { success: false, message: error.message };
    }
    return { success: false, message: getErrorMessage(ERROR_CODES.SERIES.RATING_ERROR) };
  }
}
