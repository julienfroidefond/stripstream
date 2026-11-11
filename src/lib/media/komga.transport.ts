import { KomgaBookService } from "@/lib/services/komga/book.service";
import { KomgaImageService } from "@/lib/services/komga/image.service";
import { KomgaSeriesService } from "@/lib/services/komga/series.service";
import { requestDeduplicationService } from "@/lib/services/request-deduplication.service";

import type { MediaRef, MediaTransport, MediaTransportContext } from "./types";

interface PagePayload {
  status: number;
  buffer: ArrayBuffer | null;
  contentType: string | null;
  etag: string | null;
  lastModified: string | null;
}

function readCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  for (const entry of cookieHeader.split(";")) {
    const [key, ...rest] = entry.trim().split("=");
    if (key === name) return rest.join("=") || null;
  }
  return null;
}

function conditionalKey(headers: Headers): string {
  return (
    headers.get("if-none-match") ??
    headers.get("if-modified-since") ??
    "none"
  );
}

async function fetchPagePayload(
  ref: Extract<MediaRef, { kind: "book-page" }>,
  context: MediaTransportContext
): Promise<PagePayload> {
  const activeConfig =
    readCookie(context.headers.get("cookie"), "stripstream-active-komga-config") ??
    "default";
  const key = [
    "komga-book-page",
    activeConfig,
    ref.bookId,
    ref.pageNumber,
    conditionalKey(context.headers),
  ].join(":");

  return requestDeduplicationService.deduplicate(key, async () => {
    const response = await KomgaImageService.streamImage(
      `books/${ref.bookId}/pages/${ref.pageNumber - 1}?zero_based=true`,
      undefined,
      context.headers
    );

    if (response.status === 304) {
      return {
        status: 304,
        buffer: null,
        contentType: null,
        etag: response.headers.get("etag"),
        lastModified: response.headers.get("last-modified"),
      };
    }

    return {
      status: response.status,
      buffer: await response.arrayBuffer(),
      contentType: response.headers.get("content-type"),
      etag: response.headers.get("etag"),
      lastModified: response.headers.get("last-modified"),
    };
  });
}

function pageResponse(payload: PagePayload): Response {
  const headers = new Headers();
  if (payload.contentType) headers.set("Content-Type", payload.contentType);
  if (payload.etag) headers.set("ETag", payload.etag);
  if (payload.lastModified) headers.set("Last-Modified", payload.lastModified);

  if (payload.status === 304) {
    return new Response(null, { status: 304, headers });
  }

  return new Response(payload.buffer, {
    status: payload.status,
    headers,
  });
}

/**
 * Transport Komga. Il traduit les références média en appels amont ; les
 * services Komga gardent l'authentification et le mapping HTTP, tandis que la
 * route ne voit plus que la réponse normalisée.
 */
export const komgaMediaTransport: MediaTransport = {
  async fetch(ref, context) {
    switch (ref.kind) {
      case "book-file":
        return KomgaBookService.streamFile(ref.bookId);
      case "book-page":
        return pageResponse(await fetchPagePayload(ref, context));
      case "book-page-thumbnail":
        return KomgaImageService.streamImage(
          `books/${ref.bookId}/pages/${ref.pageNumber}/thumbnail?zero_based=true`,
          undefined,
          context.headers
        );
      case "book-cover":
        return KomgaBookService.getCover(ref.bookId, context.headers);
      case "series-cover":
        return KomgaSeriesService.getCover(ref.seriesId, context.headers);
    }
  },
};
