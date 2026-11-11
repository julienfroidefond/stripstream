"use server";

import { invalidateReadProgress } from "@/lib/cache/invalidation";
import { getAllSeriesBooks } from "@/lib/providers/series-books";
import { runWithConcurrency } from "@/lib/utils";
import { ERROR_CODES } from "@/constants/errorCodes";
import {
  ActionError,
  runProviderAction,
  type ActionResult,
} from "@/lib/actions/action-runner";

/** Nombre d'écritures de progression simultanées lors d'un marquage de série. */
const SERIES_WRITE_CONCURRENCY = 6;

export type ReadProgressResult = ActionResult;

export async function updateReadProgress(
  bookId: string,
  page: number,
  completed: boolean = false,
  seriesId?: string | null
): Promise<ReadProgressResult> {
  return runProviderAction({
    name: "updateReadProgress",
    fallbackCode: ERROR_CODES.BOOK.PROGRESS_UPDATE_ERROR,
    fallbackMessage: "Erreur lors de la mise à jour",
    logContext: { bookId, page, completed, seriesId },
    skipAnonymous: { message: "Progression ignorée en mode anonyme" },
    invalidate: () => invalidateReadProgress(seriesId),
    execute: async ({ provider }) => {
      await provider.saveReadProgress(bookId, page, completed);
      return { message: "Progression mise à jour" };
    },
  });
}

export async function deleteReadProgress(
  bookId: string,
  seriesId?: string | null
): Promise<ReadProgressResult> {
  return runProviderAction({
    name: "deleteReadProgress",
    fallbackCode: ERROR_CODES.BOOK.PROGRESS_DELETE_ERROR,
    fallbackMessage: "Erreur lors de la suppression",
    logContext: { bookId, seriesId },
    skipAnonymous: { message: "Progression ignorée en mode anonyme" },
    invalidate: () => invalidateReadProgress(seriesId),
    execute: async ({ provider }) => {
      await provider.resetReadProgress(bookId);
      return { message: "Progression supprimée" };
    },
  });
}

export type SeriesReadStatusResult = ActionResult<{
  /** Nombre de livres effectivement mis à jour. */
  updated: number;
  /** Nombre total de livres de la série au moment de l'action. */
  total: number;
}>;

/**
 * Marque tous les livres d'une série comme lus ou non lus.
 *
 * Aucun des deux providers n'expose d'endpoint groupé : on pagine les livres
 * puis on applique la progression livre par livre avec une concurrence bornée.
 * Les caches sont invalidés une seule fois, après la boucle, par le runner.
 */
export async function updateSeriesReadStatus(
  seriesId: string,
  read: boolean
): Promise<SeriesReadStatusResult> {
  return runProviderAction<{ updated: number; total: number }>({
    name: "updateSeriesReadStatus",
    fallbackCode: ERROR_CODES.BOOK.PROGRESS_UPDATE_ERROR,
    fallbackMessage: "Erreur lors de la mise à jour de la série",
    logContext: { seriesId, read },
    skipAnonymous: {
      message: "Progression ignorée en mode anonyme",
      data: { updated: 0, total: 0 },
    },
    invalidate: () => invalidateReadProgress(seriesId),
    execute: async ({ provider }) => {
      const books = await getAllSeriesBooks(provider, seriesId);
      if (books.length === 0) {
        return { message: "Aucun livre dans cette série", updated: 0, total: 0 };
      }

      const { succeeded, failed } = await runWithConcurrency(
        books,
        SERIES_WRITE_CONCURRENCY,
        (book) =>
          read
            ? provider.saveReadProgress(book.id, book.pageCount, true)
            : provider.resetReadProgress(book.id)
      );

      if (failed > 0) {
        // Certaines écritures ont pu aboutir : on rafraîchit les caches avant
        // de signaler l'échec partiel, comme le faisait l'action d'origine.
        invalidateReadProgress(seriesId);
        const message =
          succeeded === 0
            ? "Échec de la mise à jour de la série"
            : `Mise à jour partielle (${succeeded}/${books.length})`;
        throw new ActionError(
          ERROR_CODES.BOOK.PROGRESS_UPDATE_ERROR,
          { updated: succeeded, total: books.length },
          message
        );
      }

      return { message: "Série mise à jour", updated: succeeded, total: books.length };
    },
  });
}
