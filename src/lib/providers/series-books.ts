import type { IMediaProvider } from "./provider.interface";
import type { NormalizedBook } from "./types";

/** Taille de page utilisée pour parcourir les livres d'une série. */
const SERIES_BOOKS_PAGE_SIZE = 100;
/** Garde-fou pour éviter une boucle infinie si un provider renvoie une pagination incohérente. */
const MAX_PAGES = 500;

/**
 * Récupère **tous** les livres d'une série, quel que soit le provider.
 *
 * Les deux backends paginent différemment : Komga renvoie un `nextCursor`
 * exploitable tel quel, tandis que Stripstream renvoie `nextCursor: null` mais
 * expose `totalPages`. On gère les deux pour ne jamais s'arrêter après la
 * première page (ce qui est le cas d'usage du marquage groupé lu/non lu).
 */
export async function getAllSeriesBooks(
  provider: Pick<IMediaProvider, "getBooks">,
  seriesId: string
): Promise<NormalizedBook[]> {
  const books: NormalizedBook[] = [];
  let cursor = "1";

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const result = await provider.getBooks({
      seriesName: seriesId,
      cursor,
      limit: SERIES_BOOKS_PAGE_SIZE,
      unreadOnly: false,
    });

    if (result.items.length === 0) break;
    books.push(...result.items);

    if (result.nextCursor) {
      cursor = result.nextCursor;
      continue;
    }

    const currentPage = Number.parseInt(cursor, 10);
    if (result.totalPages && currentPage < result.totalPages) {
      cursor = String(currentPage + 1);
      continue;
    }

    break;
  }

  return books;
}
