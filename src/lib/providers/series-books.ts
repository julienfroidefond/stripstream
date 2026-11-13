import type { IMediaProvider } from "./provider.interface";
import type { NormalizedBook } from "./types";
import { iteratePages } from "./pagination";

/** Taille de page utilisée pour parcourir les livres d'une série. */
const SERIES_BOOKS_PAGE_SIZE = 100;
/** Garde-fou : au-delà, la série dépasse 50 000 tomes et le total annoncé est suspect. */
const MAX_PAGES = 500;

/**
 * Récupère **tous** les livres d'une série, quel que soit le provider (cas
 * d'usage : le marquage groupé lu/non lu). Le parcours suit le contrat de page
 * commun (`page` 1-based, `totalPages`) via `iteratePages`.
 */
export async function getAllSeriesBooks(
  provider: Pick<IMediaProvider, "getBooks">,
  seriesId: string
): Promise<NormalizedBook[]> {
  return iteratePages(
    (page) =>
      provider.getBooks({
        seriesId,
        page,
        limit: SERIES_BOOKS_PAGE_SIZE,
        unreadOnly: false,
      }),
    { max: MAX_PAGES }
  );
}
