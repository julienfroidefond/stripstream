import { afterEach, describe, expect, it, vi } from "vitest";

import { ERROR_CODES } from "@/constants/errorCodes";

vi.mock("@/lib/logger", () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { StripstreamProvider } from "./stripstream.provider";

const BOOK = { id: "book-1", library_id: "lib-1", series: "Saga" };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function stubFetch(routes: Array<[fragment: string, respond: () => Response]>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const route = routes.find(([fragment]) => url.includes(fragment));
    if (!route) throw new Error(`Unexpected request: ${url}`);
    return route[1]();
  });
  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

function provider(): StripstreamProvider {
  return new StripstreamProvider("http://stream.local", "token");
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("StripstreamProvider.getBooks series id resolution", () => {
  it("queries the books API with the series id resolved from a legacy book link", async () => {
    const fetchMock = stubFetch([
      ["/series/book-1/details", () => jsonResponse({}, 404)],
      ["/books/book-1", () => jsonResponse(BOOK)],
      ["/series/by-name/Saga", () => jsonResponse({ id: "series-1" })],
      ["series=series-1", () => jsonResponse({ items: [], total: 0 })],
    ]);

    await provider().getBooks({ seriesId: "book-1" });

    const booksUrl = String(fetchMock.mock.calls.at(-1)?.[0]);
    expect(booksUrl).toContain("series=series-1");
    expect(booksUrl).not.toContain("series=book-1");
  });

  it("propagates a by-name failure instead of listing books for the raw book id", async () => {
    stubFetch([
      ["/series/book-1/details", () => jsonResponse({}, 404)],
      ["/books/book-1", () => jsonResponse(BOOK)],
      ["/series/by-name/Saga", () => jsonResponse({}, 500)],
    ]);

    const error = await provider()
      .getBooks({ seriesId: "book-1" })
      .catch((caught) => caught);

    expect(error).toHaveProperty("code", ERROR_CODES.STRIPSTREAM.SERVER_ERROR);
  });

  it("keeps the raw id when the series is confirmed absent (existing fallback)", async () => {
    const fetchMock = stubFetch([
      ["/series/book-1/details", () => jsonResponse({}, 404)],
      ["/books/book-1", () => jsonResponse({}, 404)],
      ["series=book-1", () => jsonResponse({ items: [], total: 0 })],
    ]);

    await provider().getBooks({ seriesId: "book-1" });

    expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain("series=book-1");
  });
});
