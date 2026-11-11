import { describe, expect, it, vi } from "vitest";

import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError } from "@/utils/errors";

import { serveMedia } from "./media-route-core";
import { MEDIA_POLICIES } from "./policies";
import type { MediaRouteDependencies, MediaTransport } from "./types";

function request(path = "/api/media/test") {
  return new Request(`http://localhost${path}`, {
    headers: { "if-none-match": '"v1"' },
  });
}

function dependencies(
  transport: MediaTransport,
  user: { id: string } | null = { id: "1" }
): MediaRouteDependencies {
  return {
    getCurrentUser: async () => user,
    getTransport: () => transport,
  };
}

describe("serveMedia", () => {
  it("forwards a 304 with the media cache policy and validator", async () => {
    const transport: MediaTransport = {
      fetch: vi.fn(async () =>
        new Response(null, {
          status: 304,
          headers: {
            ETag: '"cover-v1"',
            "Content-Type": "image/jpeg",
          },
        })
      ),
    };

    const response = await serveMedia(
      request(),
      "komga",
      { kind: "book-cover", bookId: "book-1" },
      MEDIA_POLICIES.komgaImage,
      dependencies(transport)
    );

    expect(response.status).toBe(304);
    expect(response.headers.get("cache-control")).toBe(
      "public, max-age=2592000, immutable"
    );
    expect(response.headers.get("etag")).toBe('"cover-v1"');
  });

  it("maps a nested provider 404 to the image not-found payload", async () => {
    const transport: MediaTransport = {
      fetch: async () => {
        throw new AppError(
          ERROR_CODES.BOOK.PAGES_FETCH_ERROR,
          {},
          new AppError(ERROR_CODES.IMAGE.FETCH_ERROR, { status: 404 })
        );
      },
    };

    const response = await serveMedia(
      request(),
      "komga",
      { kind: "book-cover", bookId: "missing" },
      MEDIA_POLICIES.komgaImage,
      dependencies(transport)
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: ERROR_CODES.IMAGE.FETCH_ERROR,
        message: "Image not found",
        name: "Image not found",
      },
    });
  });

  it("keeps file downloads private and relays the disposition", async () => {
    const transport: MediaTransport = {
      fetch: async () =>
        new Response("file-content", {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": 'attachment; filename="book.pdf"',
          },
        }),
    };

    const response = await serveMedia(
      request(),
      "stripstream",
      { kind: "book-file", bookId: "book-1" },
      MEDIA_POLICIES.stripstreamFile,
      dependencies(transport)
    );

    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="book.pdf"'
    );
    await expect(response.text()).resolves.toBe("file-content");
  });

  it("uses the fallback content type for a page without one", async () => {
    const transport: MediaTransport = {
      fetch: async () =>
        new Response(new Uint8Array([1, 2, 3]), { status: 200 }),
    };

    const response = await serveMedia(
      request(),
      "stripstream",
      { kind: "book-page", bookId: "book-1", pageNumber: 1 },
      MEDIA_POLICIES.stripstreamPage,
      dependencies(transport)
    );

    expect(response.headers.get("content-type")).toBe("image/jpeg");
    expect(response.headers.get("cache-control")).toBe("public, max-age=86400");
  });

  it("leaves a 304 without an implicit content type", async () => {
    const transport: MediaTransport = {
      fetch: async () =>
        new Response(null, {
          status: 304,
          headers: { ETag: '"page-v1"' },
        }),
    };

    const response = await serveMedia(
      request(),
      "stripstream",
      { kind: "book-page", bookId: "book-1", pageNumber: 1 },
      MEDIA_POLICIES.stripstreamPage,
      dependencies(transport)
    );

    expect(response.status).toBe(304);
    expect(response.headers.get("etag")).toBe('"page-v1"');
    expect(response.headers.get("content-type")).toBeNull();
  });

  it("returns an empty 404 for thumbnail failures", async () => {
    const transport: MediaTransport = {
      fetch: async () => {
        throw new AppError(ERROR_CODES.IMAGE.FETCH_ERROR, { status: 500 });
      },
    };

    const response = await serveMedia(
      request(),
      "stripstream",
      { kind: "book-cover", bookId: "book-1" },
      MEDIA_POLICIES.stripstreamThumbnail,
      dependencies(transport)
    );

    expect(response.status).toBe(404);
    await expect(response.text()).resolves.toBe("");
  });

  it("rejects an unauthenticated request before touching the transport", async () => {
    const fetch = vi.fn(async () => new Response("never"));
    const transport: MediaTransport = { fetch };

    const response = await serveMedia(
      request(),
      "komga",
      { kind: "book-cover", bookId: "book-1" },
      MEDIA_POLICIES.komgaImage,
      dependencies(transport, null)
    );

    expect(response.status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      error: { code: ERROR_CODES.AUTH.UNAUTHENTICATED },
    });
  });

  it("maps provider HTTP codes for file routes", async () => {
    const transport: MediaTransport = {
      fetch: async () => {
        throw new AppError(ERROR_CODES.STRIPSTREAM.NOT_FOUND, {
          status: 404,
        });
      },
    };

    const response = await serveMedia(
      request(),
      "stripstream",
      { kind: "book-file", bookId: "missing" },
      MEDIA_POLICIES.stripstreamFile,
      dependencies(transport)
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: ERROR_CODES.STRIPSTREAM.NOT_FOUND },
    });
  });
});
