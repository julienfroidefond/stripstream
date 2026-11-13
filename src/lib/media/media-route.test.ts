import { describe, expect, it, vi } from "vitest";

import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError } from "@/utils/errors";

import {
  createMediaRouteWith,
  parseMediaPageNumber,
  parseMediaRef,
  serveMedia,
} from "./media-route-core";
import { MEDIA_POLICIES, mediaPolicy } from "./policies";
import type { MediaKind, MediaRouteDependencies, MediaTransport } from "./types";

function request(path = "/api/media/test") {
  return new Request(`http://localhost${path}`, {
    headers: { "if-none-match": '"v1"' },
  });
}

function dependencies(
  transport: MediaTransport,
  userId: number | null = 1
): MediaRouteDependencies {
  return {
    getCurrentUserId: async () => userId,
    getTransport: () => transport,
  };
}

const IMAGE_KINDS: MediaKind[] = [
  "book-page",
  "book-page-thumbnail",
  "book-cover",
  "series-cover",
];

describe("mediaPolicy", () => {
  it("serves every image kind privately and immutably by default", () => {
    for (const kind of IMAGE_KINDS) {
      expect(mediaPolicy("stripstream", kind).response.cacheControl).toBe(
        "private, max-age=2592000, immutable"
      );
    }
  });

  it("gives the same book-page policy to both providers", () => {
    expect(mediaPolicy("komga", "book-page")).toEqual(
      mediaPolicy("stripstream", "book-page")
    );
  });

  it("revalidates the Komga covers that depend on the thumbnail preference", () => {
    for (const kind of ["book-cover", "series-cover"] as const) {
      const policy = mediaPolicy("komga", kind);
      expect(policy.response.cacheControl).toBe("private, max-age=3600");
      expect(policy.response.copyHeaders).toContain("etag");
      expect(policy.errors).toEqual(MEDIA_POLICIES[kind].errors);
    }
  });

  it("never caches a source file", () => {
    expect(mediaPolicy("komga", "book-file").response.cacheControl).toBe(
      "private, no-store"
    );
    expect(mediaPolicy("stripstream", "book-file").response.cacheControl).toBe(
      "private, no-store"
    );
  });

  it("never marks a response as cacheable by a shared cache", () => {
    for (const provider of ["komga", "stripstream"] as const) {
      for (const kind of Object.keys(MEDIA_POLICIES) as MediaKind[]) {
        expect(mediaPolicy(provider, kind).response.cacheControl).toMatch(/^private,/);
      }
    }
  });
});

describe("parseMediaRef", () => {
  const url = new URL("http://localhost/api/x?format=webp");

  it("keeps the raw query only for a book page", () => {
    expect(parseMediaRef("book-page", { bookId: "b", pageNumber: "3" }, url)).toEqual({
      kind: "book-page",
      bookId: "b",
      pageNumber: 3,
      query: "format=webp",
    });
    expect(
      parseMediaRef("book-page-thumbnail", { bookId: "b", pageNumber: "3" }, url)
    ).toEqual({ kind: "book-page-thumbnail", bookId: "b", pageNumber: 3 });
  });

  it("rejects an invalid page number with the kind's error code", () => {
    expect(
      parseMediaRef("book-page", { bookId: "b", pageNumber: "x" }, url)
    ).toMatchObject({ error: { status: 400, code: ERROR_CODES.IMAGE.FETCH_ERROR } });
    expect(
      parseMediaRef("book-page-thumbnail", { bookId: "b", pageNumber: "-1" }, url)
    ).toMatchObject({
      error: { status: 400, code: ERROR_CODES.BOOK.PAGES_FETCH_ERROR },
    });
  });

  it.each(["0", "00", "3abc", "1.5", " 2", "+2", "1e3", "99999999999999999999"])(
    "rejects the non 1-based page number %j with a 400",
    (pageNumber) => {
      expect(
        parseMediaRef("book-page", { bookId: "b", pageNumber }, url)
      ).toMatchObject({ error: { status: 400, code: ERROR_CODES.IMAGE.FETCH_ERROR } });
      expect(
        parseMediaRef("book-page-thumbnail", { bookId: "b", pageNumber }, url)
      ).toMatchObject({ error: { status: 400, code: ERROR_CODES.BOOK.PAGES_FETCH_ERROR } });
    }
  );

  it("accepts the first page and leading zeros of a valid page", () => {
    expect(parseMediaPageNumber("1")).toBe(1);
    expect(parseMediaPageNumber("012")).toBe(12);
  });
});

describe("createMediaRouteWith", () => {
  it("builds the ref from the route params and applies the kind policy", async () => {
    const fetch = vi.fn(async () => new Response(new Uint8Array([1])));
    const GET = createMediaRouteWith(
      { provider: "stripstream", kind: "book-page" },
      dependencies({ fetch })
    );

    const response = await GET(
      request("/api/stripstream/images/books/book-1/pages/2?width=300"),
      { params: Promise.resolve({ bookId: "book-1", pageNumber: "2" }) }
    );

    expect(fetch).toHaveBeenCalledWith(
      { kind: "book-page", bookId: "book-1", pageNumber: 2, query: "width=300" },
      expect.anything()
    );
    expect(response.headers.get("cache-control")).toBe(
      "private, max-age=2592000, immutable"
    );
  });

  it("answers 400 before touching the transport for an invalid page", async () => {
    const fetch = vi.fn(async () => new Response("never"));
    const GET = createMediaRouteWith(
      { provider: "komga", kind: "book-page-thumbnail" },
      dependencies({ fetch })
    );

    const response = await GET(request(), {
      params: Promise.resolve({ bookId: "book-1", pageNumber: "nope" }),
    });

    expect(response.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
});

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
      mediaPolicy("komga", "book-cover"),
      dependencies(transport)
    );

    expect(response.status).toBe(304);
    expect(response.headers.get("cache-control")).toBe("private, max-age=3600");
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
      mediaPolicy("komga", "book-cover"),
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
      mediaPolicy("stripstream", "book-file"),
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
      mediaPolicy("stripstream", "book-page"),
      dependencies(transport)
    );

    expect(response.headers.get("content-type")).toBe("image/jpeg");
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
      mediaPolicy("stripstream", "book-page"),
      dependencies(transport)
    );

    expect(response.status).toBe(304);
    expect(response.headers.get("etag")).toBe('"page-v1"');
    expect(response.headers.get("content-type")).toBeNull();
  });

  it("returns the same JSON error shape for every image kind and provider", async () => {
    const transport: MediaTransport = {
      fetch: async () => {
        throw new Error("boom");
      },
    };

    for (const provider of ["komga", "stripstream"] as const) {
      const response = await serveMedia(
        request(),
        provider,
        { kind: "book-cover", bookId: "book-1" },
        mediaPolicy(provider, "book-cover"),
        dependencies(transport)
      );

      expect(response.status).toBe(500);
      await expect(response.json()).resolves.toEqual({
        error: {
          code: ERROR_CODES.IMAGE.FETCH_ERROR,
          name: "Image fetch error",
          message: "Image fetch error",
        },
      });
    }
  });

  it("answers 404 when a provider does not serve the requested kind", async () => {
    const transport: MediaTransport = {
      fetch: async () => {
        throw new AppError(ERROR_CODES.IMAGE.FETCH_ERROR, { status: 404 });
      },
    };

    const response = await serveMedia(
      request(),
      "stripstream",
      { kind: "series-cover", seriesId: "series-1" },
      mediaPolicy("stripstream", "series-cover"),
      dependencies(transport)
    );

    expect(response.status).toBe(404);
  });

  it("hands the authenticated user to the transport", async () => {
    const fetch = vi.fn(async () => new Response("cover", { status: 200 }));

    await serveMedia(
      request(),
      "komga",
      { kind: "book-cover", bookId: "book-1" },
      mediaPolicy("komga", "book-cover"),
      dependencies({ fetch }, 42)
    );

    expect(fetch).toHaveBeenCalledWith(
      { kind: "book-cover", bookId: "book-1" },
      expect.objectContaining({ userId: 42 })
    );
  });

  it("rejects an unauthenticated request before touching the transport", async () => {
    const fetch = vi.fn(async () => new Response("never"));
    const transport: MediaTransport = { fetch };

    const response = await serveMedia(
      request(),
      "komga",
      { kind: "book-cover", bookId: "book-1" },
      mediaPolicy("komga", "book-cover"),
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
      mediaPolicy("stripstream", "book-file"),
      dependencies(transport)
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: ERROR_CODES.STRIPSTREAM.NOT_FOUND },
    });
  });

  it("falls back to the serving provider's HTTP error code for a file", async () => {
    const transport: MediaTransport = {
      fetch: async () => {
        throw new Error("socket closed");
      },
    };

    for (const [provider, code] of [
      ["komga", ERROR_CODES.KOMGA.HTTP_ERROR],
      ["stripstream", ERROR_CODES.STRIPSTREAM.HTTP_ERROR],
    ] as const) {
      const response = await serveMedia(
        request(),
        provider,
        { kind: "book-file", bookId: "book-1" },
        mediaPolicy(provider, "book-file"),
        dependencies(transport)
      );
      expect(response.status).toBe(500);
      await expect(response.json()).resolves.toMatchObject({
        error: { code, message: "File download error" },
      });
    }
  });
});
