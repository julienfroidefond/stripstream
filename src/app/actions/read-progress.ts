"use server";

import { updateTag } from "next/cache";
import { getProvider } from "@/lib/providers/provider.factory";
import { getAllSeriesBooks } from "@/lib/providers/series-books";
import { PreferencesService } from "@/lib/services/preferences.service";
import { HOME_CACHE_TAG, LIBRARY_SERIES_CACHE_TAG, SERIES_BOOKS_CACHE_TAG, STATS_CACHE_TAG } from "@/constants/cacheConstants";
import { runWithConcurrency } from "@/lib/utils";
import { AppError } from "@/utils/errors";

/** Nombre d'écritures de progression simultanées lors d'un marquage de série. */
const SERIES_WRITE_CONCURRENCY = 6;

/**
 * Invalide les caches après modification d'une progression.
 * Si `seriesId` est fourni, on cible uniquement `series-books:${seriesId}`
 * au lieu d'invalider toutes les listes de livres → meilleur hit rate.
 */
function revalidateReadCaches(seriesId?: string | null) {
  updateTag(HOME_CACHE_TAG);
  updateTag(LIBRARY_SERIES_CACHE_TAG);
  updateTag(STATS_CACHE_TAG);
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
    const preferences = await PreferencesService.getPreferences();
    if (preferences.anonymousMode) {
      return { success: true, message: "Progression ignorée en mode anonyme" };
    }

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

export interface SeriesReadStatusResult {
  success: boolean;
  message: string;
  /** Nombre de livres effectivement mis à jour. */
  updated?: number;
  /** Nombre total de livres de la série au moment de l'action. */
  total?: number;
}

/**
 * Marque tous les livres d'une série comme lus ou non lus.
 *
 * Aucun des deux providers n'expose d'endpoint groupé : on pagine les livres
 * puis on applique la progression livre par livre avec une concurrence bornée.
 * Les caches sont invalidés une seule fois, après la boucle.
 */
export async function updateSeriesReadStatus(
  seriesId: string,
  read: boolean
): Promise<SeriesReadStatusResult> {
  try {
    const preferences = await PreferencesService.getPreferences();
    if (preferences.anonymousMode) {
      return { success: true, message: "Progression ignorée en mode anonyme", updated: 0, total: 0 };
    }

    const provider = await getProvider();
    if (!provider) return { success: false, message: "Provider non configuré" };

    const books = await getAllSeriesBooks(provider, seriesId);
    if (books.length === 0) {
      revalidateReadCaches(seriesId);
      return { success: true, message: "Aucun livre dans cette série", updated: 0, total: 0 };
    }

    const { succeeded, failed } = await runWithConcurrency(
      books,
      SERIES_WRITE_CONCURRENCY,
      (book) =>
        read
          ? provider.saveReadProgress(book.id, book.pageCount, true)
          : provider.resetReadProgress(book.id)
    );

    revalidateReadCaches(seriesId);

    if (failed === 0) {
      return { success: true, message: "Série mise à jour", updated: succeeded, total: books.length };
    }

    return {
      success: false,
      message:
        succeeded === 0
          ? "Échec de la mise à jour de la série"
          : `Mise à jour partielle (${succeeded}/${books.length})`,
      updated: succeeded,
      total: books.length,
    };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, message: error.message };
    }
    return { success: false, message: "Erreur lors de la mise à jour de la série" };
  }
}
