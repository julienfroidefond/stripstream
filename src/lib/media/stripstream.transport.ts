import { ERROR_CODES } from "@/constants/errorCodes";
import { requireConnectionForProvider } from "@/lib/connections";
import { ProviderTransport, type ProviderQueryParams } from "@/lib/providers/provider-transport";
import { createStripstreamTransportPolicy } from "@/lib/providers/stripstream/stripstream.transport-policy";
import { imageRequestLimiter } from "@/lib/media/image-request-limiter";
import { requestDeduplicationService } from "@/lib/media/request-deduplication";
import { AppError } from "@/utils/errors";

import {
  bufferMediaResponse,
  FILE_ACCEPT,
  FILE_TIMEOUT_MS,
  PAGE_TIMEOUT_MS,
  rebuildMediaResponse,
  STRIPSTREAM_IMAGE_ACCEPT,
  THUMBNAIL_TIMEOUT_MS,
  validatorFingerprint,
} from "./media-fetch";
import type { MediaRef, MediaTransport, MediaTransportContext } from "./types";

/** La query brute d'une page (format, largeur…) passe en paramètres, jamais dans le chemin. */
function pageQueryParams(query: string | undefined): ProviderQueryParams | undefined {
  if (!query) return undefined;
  const params: Record<string, string[]> = {};
  for (const [key, value] of new URLSearchParams(query)) {
    (params[key] ??= []).push(value);
  }
  return params;
}

async function fetchThumbnail(
  transport: ProviderTransport,
  configId: number | null,
  url: string,
  ref: Extract<MediaRef, { kind: "book-cover" }>,
  context: MediaTransportContext
): Promise<Response> {
  const key = [
    "stripstream-thumbnail",
    String(configId ?? url),
    ref.bookId,
    validatorFingerprint(context.headers),
  ].join(":");

  const payload = await requestDeduplicationService.deduplicate(
    key,
    () =>
      imageRequestLimiter.run(async () => {
        const response = await transport.response(
          `books/${ref.bookId}/thumbnail`,
          undefined,
          {
            accept: STRIPSTREAM_IMAGE_ACCEPT,
            conditionalHeaders: context.headers,
            timeoutMs: THUMBNAIL_TIMEOUT_MS,
            allowNotModified: true,
            errorCode: ERROR_CODES.IMAGE.FETCH_ERROR,
          }
        );
        return bufferMediaResponse(response);
      })
  );

  return rebuildMediaResponse(payload);
}

/**
 * Transport Stripstream. Une seule connexion et un seul `ProviderTransport`
 * par requête, comme côté Komga ; seuls le chemin et l'Accept changent. Les
 * références non servies par ce provider échouent sans résoudre de connexion.
 */
export const stripstreamMediaTransport: MediaTransport = {
  async fetch(ref, context) {
    if (ref.kind === "book-page-thumbnail" || ref.kind === "series-cover") {
      throw new AppError(ERROR_CODES.IMAGE.FETCH_ERROR, { status: 404 });
    }

    const config = await requireConnectionForProvider("stripstream", context.userId);
    const transport = new ProviderTransport(
      createStripstreamTransportPolicy(config.url, config.token)
    );

    switch (ref.kind) {
      case "book-file":
        return transport.response(`books/${ref.bookId}/file`, undefined, {
          accept: FILE_ACCEPT,
          cache: "no-store",
          timeoutMs: FILE_TIMEOUT_MS,
        });
      case "book-page": {
        return transport.response(
          `books/${ref.bookId}/pages/${ref.pageNumber}`,
          pageQueryParams(ref.query),
          {
            accept: STRIPSTREAM_IMAGE_ACCEPT,
            conditionalHeaders: context.headers,
            timeoutMs: PAGE_TIMEOUT_MS,
            allowNotModified: true,
            errorCode: ERROR_CODES.IMAGE.FETCH_ERROR,
          }
        );
      }
      case "book-cover":
        return fetchThumbnail(
          transport,
          config.configId,
          config.url,
          ref,
          context
        );
    }
  },
};
