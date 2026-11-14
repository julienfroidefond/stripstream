import { isSpecialBook } from "@/lib/books/volume-type";
import type { NormalizedBook, NormalizedMissingBook } from "@/lib/providers/types";

export interface MissingBooksPageWindow {
  page: number;
  totalPages: number;
  /** Les manquants n'ont rien à faire dans une vue « non lus ». */
  unreadOnly: boolean;
  /**
   * Tomes de la page précédente (même requête, page − 1), `null` sur la
   * première page ou si le provider n'a pas pu les servir.
   */
  previousPageBooks: NormalizedBook[] | null;
}

/**
 * Plus grand numéro des tomes *réguliers numérotés* : les hors-séries (section
 * à part, numérotation propre) et les tomes sans numéro ne bornent rien.
 */
export function maxRegularVolume(books: readonly NormalizedBook[]): number | null {
  let max: number | null = null;
  for (const book of books) {
    if (book.volume == null || isSpecialBook(book)) continue;
    if (max === null || book.volume > max) max = book.volume;
  }
  return max;
}

/**
 * Tomes manquants à intercaler sur *cette* page de la grille.
 *
 * Le provider renvoie les manquants de toute la série ; une page n'affiche que
 * ceux qui tombent après le dernier tome régulier de la page précédente et
 * jusqu'à son propre dernier tome régulier (sans borne haute sur la dernière
 * page). Un trou entre deux pages s'affiche au début de la page suivante, une
 * seule fois. Faute de borne basse hors première page, mieux vaut omettre que
 * dupliquer.
 */
export function missingBooksForPage(
  missing: NormalizedMissingBook[],
  pageBooks: readonly NormalizedBook[],
  window: MissingBooksPageWindow
): NormalizedMissingBook[] {
  if (missing.length === 0 || window.unreadOnly) return [];

  const isFirstPage = window.page <= 1;
  const isLastPage = window.page >= window.totalPages;
  const lower = isFirstPage ? null : maxRegularVolume(window.previousPageBooks ?? []);
  if (!isFirstPage && lower === null) return [];

  const upper = isLastPage ? null : maxRegularVolume(pageBooks);
  // Page intermédiaire sans tome régulier numéroté : aucune borne haute fiable.
  if (!isLastPage && upper === null) return [];

  return missing.filter(
    (item) =>
      (lower === null || item.volumeNumber > lower) &&
      (upper === null || item.volumeNumber <= upper)
  );
}
