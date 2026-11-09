"use server";

import { updateTag, revalidatePath } from "next/cache";
import { getProvider } from "@/lib/providers/provider.factory";
import {
  HOME_CACHE_TAG,
  LIBRARY_SERIES_CACHE_TAG,
  SERIES_SHELF_CACHE_TAG,
} from "@/constants/cacheConstants";
import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError, getErrorMessage } from "@/utils/errors";
import logger from "@/lib/logger";

export interface SeriesShelfResult {
  success: boolean;
  message: string;
}

/**
 * Invalide les caches impactés par la mise de côté d'une série :
 * - la home (carrousel « Reprendre la lecture » + rangée « Séries en cours ») ;
 * - le détail de la série (badge « De côté ») ;
 * - la liste de la bibliothèque quand son id est connu.
 */
function revalidateShelfCaches(seriesId: string, libraryId?: string) {
  updateTag(HOME_CACHE_TAG);
  revalidatePath("/");
  revalidatePath("/in-progress");
  updateTag(`${SERIES_SHELF_CACHE_TAG}:${seriesId}`);
  revalidatePath(`/series/${seriesId}`);
  if (libraryId) {
    updateTag(`library-series:${libraryId}`);
    revalidatePath(`/libraries/${libraryId}`);
  } else {
    updateTag(LIBRARY_SERIES_CACHE_TAG);
  }
}

async function updateShelf(
  seriesId: string,
  shelved: boolean,
  libraryId?: string
): Promise<SeriesShelfResult> {
  try {
    const provider = await getProvider();
    if (!provider) return { success: false, message: "Provider non configuré" };

    if (shelved) {
      await provider.shelveSeries(seriesId);
    } else {
      await provider.unshelveSeries(seriesId);
    }

    revalidateShelfCaches(seriesId, libraryId);
    return {
      success: true,
      message: shelved ? "Série mise de côté" : "Série reprise",
    };
  } catch (error) {
    logger.error(
      { err: error, seriesId, shelved },
      "Erreur lors de la modification de la mise de côté"
    );
    if (error instanceof AppError) {
      return { success: false, message: error.message };
    }
    return {
      success: false,
      message: getErrorMessage(ERROR_CODES.SERIES.SHELF_ERROR),
    };
  }
}

/** Met une série de côté pour le lecteur courant (idempotent). */
export async function shelveSeries(
  seriesId: string,
  libraryId?: string
): Promise<SeriesShelfResult> {
  return updateShelf(seriesId, true, libraryId);
}

/** Reprend une série mise de côté par le lecteur courant (idempotent). */
export async function unshelveSeries(
  seriesId: string,
  libraryId?: string
): Promise<SeriesShelfResult> {
  return updateShelf(seriesId, false, libraryId);
}
