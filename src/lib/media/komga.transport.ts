import { ERROR_CODES } from "@/constants/errorCodes";
import { requireConnectionForProvider, type KomgaConnection } from "@/lib/connections";
import { createKomgaTransportPolicy } from "@/lib/providers/komga/komga.transport-policy";
import { ProviderTransport } from "@/lib/providers/provider-transport";
import { imageRequestLimiter } from "@/lib/media/image-request-limiter";
import { PreferencesService } from "@/lib/services/preferences.service";
import { requestDeduplicationService } from "@/lib/media/request-deduplication";
import { AppError } from "@/utils/errors";

import { komgaPagePath, komgaPageThumbnailPath } from "./komga-paths";
import {
  bufferMediaResponse,
  FILE_ACCEPT,
  FILE_TIMEOUT_MS,
  IMAGE_ACCEPT,
  IMAGE_TIMEOUT_MS,
  rebuildMediaResponse,
  THUMBNAIL_TIMEOUT_MS,
  validatorFingerprint,
} from "./media-fetch";
import type { MediaRef, MediaTransport, MediaTransportContext } from "./types";

function createTransport(config: KomgaConnection): ProviderTransport {
  return new ProviderTransport(
    createKomgaTransportPolicy(config.url, config.authHeader)
  );
}

function streamImage(
  transport: ProviderTransport,
  path: string,
  context: MediaTransportContext,
  timeoutMs: number
): Promise<Response> {
  return imageRequestLimiter.run(() =>
    transport.response(path, undefined, {
      accept: IMAGE_ACCEPT,
      conditionalHeaders: context.headers,
      timeoutMs,
      allowNotModified: true,
      errorCode: ERROR_CODES.IMAGE.FETCH_ERROR,
    })
  );
}

async function fetchPagePayload(
  transport: ProviderTransport,
  config: KomgaConnection,
  ref: Extract<MediaRef, { kind: "book-page" }>,
  context: MediaTransportContext
) {
  const key = [
    "komga-book-page",
    String(config.configId ?? config.url),
    ref.bookId,
    ref.pageNumber,
    validatorFingerprint(context.headers),
  ].join(":");

  return requestDeduplicationService.deduplicate(key, async () => {
    const response = await streamImage(
      transport,
      komgaPagePath(ref.bookId, ref.pageNumber),
      context,
      IMAGE_TIMEOUT_MS
    );
    return bufferMediaResponse(response);
  });
}

async function fetchBookCover(
  transport: ProviderTransport,
  bookId: string,
  context: MediaTransportContext
): Promise<Response> {
  try {
    const preferences = await PreferencesService.getPreferences(context.userId);
    const path = preferences.showThumbnails
      ? `books/${bookId}/thumbnail`
      : komgaPagePath(bookId, 1);
    return await streamImage(
      transport,
      path,
      context,
      THUMBNAIL_TIMEOUT_MS
    );
  } catch (error) {
    throw new AppError(ERROR_CODES.BOOK.PAGES_FETCH_ERROR, {}, error);
  }
}

async function fetchSeriesCover(
  transport: ProviderTransport,
  seriesId: string,
  context: MediaTransportContext
): Promise<Response> {
  try {
    const preferences = await PreferencesService.getPreferences(context.userId);
    if (preferences.showThumbnails) {
      return await streamImage(
        transport,
        `series/${seriesId}/thumbnail`,
        context,
        THUMBNAIL_TIMEOUT_MS
      );
    }

    const data = await transport.request<{
      content?: Array<{ id: string }>;
    }>(`series/${seriesId}/books`, { page: "0", size: "1" });
    const firstBookId = data.content?.[0]?.id;
    if (!firstBookId) {
      throw new AppError(ERROR_CODES.SERIES.NO_BOOKS_FOUND);
    }

    return await streamImage(
      transport,
      komgaPagePath(firstBookId, 1),
      context,
      THUMBNAIL_TIMEOUT_MS
    );
  } catch (error) {
    throw new AppError(ERROR_CODES.SERIES.FETCH_ERROR, {}, error);
  }
}

/**
 * Transport Komga. Il résout la connexion active une seule fois, construit le
 * `ProviderTransport` à partir de sa politique, puis traduit chaque `MediaRef`
 * en chemin Komga. La déduplication porte sur la connexion résolue, plus sur le
 * cookie brut ; la route applique ensuite sa politique de cache et d'erreurs.
 */
export const komgaMediaTransport: MediaTransport = {
  async fetch(ref, context) {
    const config = await requireConnectionForProvider("komga", context.userId);
    const transport = createTransport(config);

    switch (ref.kind) {
      case "book-file":
        return transport.response(`books/${ref.bookId}/file`, undefined, {
          accept: FILE_ACCEPT,
          cache: "no-store",
          timeoutMs: FILE_TIMEOUT_MS,
        });
      case "book-page":
        return rebuildMediaResponse(
          await fetchPagePayload(transport, config, ref, context)
        );
      case "book-page-thumbnail":
        return streamImage(
          transport,
          komgaPageThumbnailPath(ref.bookId, ref.pageNumber),
          context,
          THUMBNAIL_TIMEOUT_MS
        );
      case "book-cover":
        return fetchBookCover(transport, ref.bookId, context);
      case "series-cover":
        return fetchSeriesCover(transport, ref.seriesId, context);
    }
  },
};
