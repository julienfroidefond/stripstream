import type { NormalizedBook, NormalizedMissingBook } from "@/lib/providers/types";

export interface MissingBooksPageWindow {
  page: number;
  totalPages: number;
  /** Les manquants n'ont rien à faire dans une vue « non lus ». */
  unreadOnly: boolean;
  /**
   * Plus grand numéro de tome de la page précédente (son dernier tome), `null`
   * sur la première page ou si le provider n'en donne pas.
   */
  previousPageLastVolume: number | null;
}

function maxVolume(books: NormalizedBook[]): number | null {
  let max: number | null = null;
  for (const book of books) {
    if (book.volume == null) continue;
    if (max === null || book.volume > max) max = book.volume;
  }
  return max;
}

/**
 * Tomes manquants à intercaler sur *cette* page de la grille.
 *
 * Le provider renvoie les manquants de toute la série ; une page n'affiche que
 * ceux qui tombent après le dernier tome de la page précédente et jusqu'à son
 * propre dernier tome (sans borne haute sur la dernière page). Un trou entre
 * deux pages s'affiche ainsi au début de la page suivante, une seule fois.
 */
export function missingBooksForPage(
  missing: NormalizedMissingBook[],
  pageBooks: NormalizedBook[],
  window: MissingBooksPageWindow
): NormalizedMissingBook[] {
  if (missing.length === 0 || window.unreadOnly) return [];

  const isFirstPage = window.page <= 1;
  const isLastPage = window.page >= window.totalPages;
  const lower = isFirstPage ? null : window.previousPageLastVolume;
  const upper = isLastPage ? null : maxVolume(pageBooks);

  // Hors première page, sans borne basse connue on ne peut pas savoir si le
  // manquant a déjà été montré : mieux vaut l'omettre que le dupliquer.
  if (!isFirstPage && lower === null) return [];

  return missing.filter(
    (item) =>
      (lower === null || item.volumeNumber > lower) &&
      (upper === null || item.volumeNumber <= upper)
  );
}
