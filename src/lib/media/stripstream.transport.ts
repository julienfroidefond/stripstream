import { createHash } from "node:crypto";

import { requireConnectionForProvider } from "@/lib/connections";
import { createStripstreamClient } from "@/lib/providers/stripstream/stripstream.client";
import { imageRequestLimiter } from "@/lib/services/image-request-limiter";
import { requestDeduplicationService } from "@/lib/services/request-deduplication.service";
import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError } from "@/utils/errors";

import type { MediaRef, MediaTransport, MediaTransportContext } from "./types";

/** Une couverture doit répondre vite : au-delà, la tuile reste noire. */
const THUMBNAIL_TIMEOUT_MS = 12000;

interface ThumbnailPayload {
  status: number;
  buffer: ArrayBuffer | null;
  contentType: string;
  etag: string | null;
  lastModified: string | null;
}

function validatorKey(headers: Headers): string {
  const validator =
    headers.get("if-none-match") ??
    headers.get("if-modified-since") ??
    "none";
  return createHash("sha256").update(validator).digest("hex");
}

async function fetchThumbnail(
  ref: Extract<MediaRef, { kind: "book-cover" }>,
  context: MediaTransportContext
): Promise<Response> {
  const config = await requireConnectionForProvider("stripstream");
  const connectionKey = createHash("sha256")
    .update(`${config.url}\0${config.token}`)
    .digest("hex");
  const key = `stripstream-thumbnail:${connectionKey}:${ref.bookId}:${validatorKey(
    context.headers
  )}`;

  const payload = await requestDeduplicationService.deduplicate<ThumbnailPayload>(
    key,
    () =>
      imageRequestLimiter.run(async () => {
        const client = createStripstreamClient(config.url, config.token);
        const response = await client.fetchImage(
          `books/${ref.bookId}/thumbnail`,
          context.headers,
          THUMBNAIL_TIMEOUT_MS
        );

        if (response.status === 304) {
          return {
            status: 304,
            buffer: null,
            contentType: "image/jpeg",
            etag: response.headers.get("etag"),
            lastModified: response.headers.get("last-modified"),
          };
        }

        return {
          status: response.status,
          buffer: await response.arrayBuffer(),
          contentType: response.headers.get("content-type") ?? "image/jpeg",
          etag: response.headers.get("etag"),
          lastModified: response.headers.get("last-modified"),
        };
      })
  );

  const headers = new Headers();
  if (payload.etag) headers.set("ETag", payload.etag);
  if (payload.lastModified) headers.set("Last-Modified", payload.lastModified);
  if (payload.status === 304) {
    return new Response(null, { status: 304, headers });
  }

  headers.set("Content-Type", payload.contentType);
  return new Response(payload.buffer, {
    status: payload.status,
    headers,
  });
}

/**
 * Transport Stripstream. Le client est construit par la factory média ; les
 * routes ne manipulent ni token, ni URL amont, ni clé de déduplication.
 */
export const stripstreamMediaTransport: MediaTransport = {
  async fetch(ref, context) {
    switch (ref.kind) {
      case "book-file": {
        const config = await requireConnectionForProvider("stripstream");
        const client = createStripstreamClient(config.url, config.token);
        return client.fetchFile(`books/${ref.bookId}/file`);
      }
      case "book-page": {
        const config = await requireConnectionForProvider("stripstream");
        const client = createStripstreamClient(config.url, config.token);
        const query = ref.query ? `?${ref.query}` : "";
        return client.fetchImage(
          `books/${ref.bookId}/pages/${ref.pageNumber}${query}`,
          context.headers
        );
      }
      case "book-cover":
        return fetchThumbnail(ref, context);
      case "book-page-thumbnail":
      case "series-cover":
        throw new AppError(ERROR_CODES.IMAGE.FETCH_ERROR, { status: 404 });
    }
  },
};
