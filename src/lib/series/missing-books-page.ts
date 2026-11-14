import { isSpecialBook } from "@/lib/books/volume-type";
import type { NormalizedBook, NormalizedMissingBook } from "@/lib/providers/types";

export interface MissingBooksPageWindow {
  page: number;
  totalPages: number;
  /** Les manquants n'ont rien à faire dans une vue « non lus ». */
  unreadOnly: boolean;
  /**
   * Plus grand tome régulier numéroté *avant* cette page : `-Infinity` s'il
   * n'y en a aucun (rien n'a encore été placé), `null` s'il est inconnu (le
   * provider n'a pas répondu). Voir `lowerBoundBeforePage`.
   */
  lowerBound: number | null;
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
 * Une page montre les manquants `v` tels que `lowerBound < v <= upper`, où
 * `upper` est son plus grand tome régulier numéroté (sans borne sur la
 * dernière page). Les intervalles des pages successives se suivent sans se
 * chevaucher : chaque manquant apparaît sur une page et une seule, un trou
 * entre deux pages au début de la suivante. Une page sans tome régulier
 * numéroté a un intervalle vide ; ses trous passent à la page suivante.
 */
export function missingBooksForPage(
  missing: NormalizedMissingBook[],
  pageBooks: readonly NormalizedBook[],
  window: MissingBooksPageWindow
): NormalizedMissingBook[] {
  if (missing.length === 0 || window.unreadOnly) return [];
  // Borne basse inconnue : mieux vaut omettre que dupliquer.
  if (window.lowerBound === null) return [];

  const isLastPage = window.page >= window.totalPages;
  const upper = isLastPage ? Number.POSITIVE_INFINITY : maxRegularVolume(pageBooks);
  if (upper === null) return [];

  const lower = window.lowerBound;
  return missing.filter((item) => item.volumeNumber > lower && item.volumeNumber <= upper);
}

/** Pages remontées au plus pour trouver la borne basse (hors-séries en série). */
const MAX_LOWER_BOUND_PAGES = 5;

/**
 * Plus grand tome régulier numéroté avant la page `page`, en remontant les
 * pages précédentes (`fetchPage`, même requête que la grille) jusqu'à en
 * trouver un. `-Infinity` sur la première page ou si aucune page précédente
 * n'en a ; `null` si une page n'a pas pu être lue ou si la limite est atteinte.
 */
export async function lowerBoundBeforePage(
  page: number,
  fetchPage: (page: number) => Promise<readonly NormalizedBook[] | null>
): Promise<number | null> {
  const stop = Math.max(1, page - MAX_LOWER_BOUND_PAGES);
  for (let previous = page - 1; previous >= stop; previous -= 1) {
    const books = await fetchPage(previous);
    if (!books) return null;
    const max = maxRegularVolume(books);
    if (max !== null) return max;
  }
  return stop === 1 ? Number.NEGATIVE_INFINITY : null;
}
