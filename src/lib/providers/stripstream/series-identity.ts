import { cacheProfile } from "@/constants/cacheProfiles";
import { ERROR_CODES } from "@/constants/errorCodes";
import type {
  StripstreamBookDetails,
  StripstreamSeriesItem,
  StripstreamSeriesLookup,
} from "@/types/stripstream";
import { AppError } from "@/utils/errors";

import type { StripstreamClient } from "./stripstream.client";

/**
 * Propriétaire de l'identité « série » côté Stripstream.
 *
 * Stripstream expose trois façons d'atteindre une série : son id, le
 * `first_book_id` d'un lien de recherche historique, ou son nom dans une
 * bibliothèque. Les trois passent par ici pour que la forme des routes et la
 * politique d'absence (`null` uniquement sur un 404 confirmé) soient écrites
 * une seule fois.
 *
 * Les erreurs autres qu'un 404 remontent : c'est à l'appelant de décider s'il
 * dégrade (recherche, tome suivant) ou s'il laisse échouer (liste de livres).
 */

function rethrowUnlessNotFound(error: unknown): null {
  if (error instanceof AppError && error.code === ERROR_CODES.STRIPSTREAM.NOT_FOUND) {
    return null;
  }

  throw error;
}

/** Série par id ; `null` seulement si le serveur confirme qu'elle n'existe pas. */
export async function findSeriesById(
  client: StripstreamClient,
  seriesId: string
): Promise<StripstreamSeriesItem | null> {
  try {
    return await client.fetch<StripstreamSeriesItem>(
      `series/${seriesId}/details`,
      undefined,
      cacheProfile.series()
    );
  } catch (error) {
    return rethrowUnlessNotFound(error);
  }
}

/** Nom de série dans une bibliothèque → id ; `null` sur un 404 confirmé. */
export async function resolveSeriesIdByName(
  client: StripstreamClient,
  libraryId: string,
  name: string
): Promise<string | null> {
  try {
    const lookup = await client.fetch<StripstreamSeriesLookup>(
      `libraries/${libraryId}/series/by-name/${encodeURIComponent(name)}`,
      undefined,
      cacheProfile.series()
    );
    return lookup.id;
  } catch (error) {
    return rethrowUnlessNotFound(error);
  }
}

/**
 * `first_book_id` → id de série, via le nom porté par le tome.
 *
 * `null` quand la série est confirmée absente (404 sur le tome ou sur le nom),
 * ou quand le tome ne déclare pas de nom de série.
 */
export async function resolveSeriesIdFromBookId(
  client: StripstreamClient,
  bookId: string
): Promise<string | null> {
  try {
    const book = await client.fetch<StripstreamBookDetails>(`books/${bookId}`, undefined, cacheProfile.series());
    if (!book.series) return null;

    return await resolveSeriesIdByName(client, book.library_id, book.series);
  } catch (error) {
    return rethrowUnlessNotFound(error);
  }
}

/**
 * Accepte un id de série ou, pour les liens de recherche historiques, un
 * `first_book_id`. `null` seulement si les deux lectures confirment l'absence.
 */
export async function resolveSeriesId(
  client: StripstreamClient,
  seriesIdOrBookId: string
): Promise<string | null> {
  const series = await findSeriesById(client, seriesIdOrBookId);
  if (series) return series.series_id;

  return resolveSeriesIdFromBookId(client, seriesIdOrBookId);
}
