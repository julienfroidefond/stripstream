"use server";

import { getProvider } from "@/lib/providers/provider.factory";
import { invalidateReadProgress } from "@/lib/cache/invalidation";
import { getAllSeriesBooks } from "@/lib/providers/series-books";
import { PreferencesService } from "@/lib/services/preferences.service";
import { runWithConcurrency } from "@/lib/utils";
import { AppError } from "@/utils/errors";

/** Nombre d'écritures de progression simultanées lors d'un marquage de série. */
const SERIES_WRITE_CONCURRENCY = 6;

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
    invalidateReadProgress(seriesId);

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
    invalidateReadProgress(seriesId);

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
      invalidateReadProgress(seriesId);
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

    invalidateReadProgress(seriesId);

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
