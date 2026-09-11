"use server";

import { updateTag } from "next/cache";
import { getProvider } from "@/lib/providers/provider.factory";
import { PreferencesService } from "@/lib/services/preferences.service";
import { HOME_CACHE_TAG, LIBRARY_SERIES_CACHE_TAG, SERIES_BOOKS_CACHE_TAG } from "@/constants/cacheConstants";
import { AppError } from "@/utils/errors";

/**
 * Invalide les caches après modification d'une progression.
 * Si `seriesId` est fourni, on cible uniquement `series-books:${seriesId}`
 * au lieu d'invalider toutes les listes de livres → meilleur hit rate.
 */
function revalidateReadCaches(seriesId?: string | null) {
  updateTag(HOME_CACHE_TAG);
  updateTag(LIBRARY_SERIES_CACHE_TAG);
  if (seriesId) {
    updateTag(`series-books:${seriesId}`);
  } else {
    updateTag(SERIES_BOOKS_CACHE_TAG);
  }
}

export async function updateReadProgress(
  bookId: string,
  page: number,
  completed: boolean = false,
  seriesId?: string | null
): Promise<{ success: boolean; message: string }> {
  try {
    const preferences = await PreferencesService.getPreferences();
    if (preferences.anonymousMode) {
      return { success: true, message: "Progression ignorée en mode anonyme" };
    }

    const provider = await getProvider();
    if (!provider) return { success: false, message: "Provider non configuré" };

    await provider.saveReadProgress(bookId, page, completed);
    revalidateReadCaches(seriesId);

    return { success: true, message: "Progression mise à jour" };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, message: error.message };
    }
    return { success: false, message: "Erreur lors de la mise à jour" };
  }
}

export async function deleteReadProgress(
  bookId: string,
  seriesId?: string | null
): Promise<{ success: boolean; message: string }> {
  try {
    const provider = await getProvider();
    if (!provider) return { success: false, message: "Provider non configuré" };

    await provider.resetReadProgress(bookId);
    revalidateReadCaches(seriesId);

    return { success: true, message: "Progression supprimée" };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, message: error.message };
    }
    return { success: false, message: "Erreur lors de la suppression" };
  }
}
