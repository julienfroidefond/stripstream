import { afterEach, describe, expect, it, vi } from "vitest";

import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError } from "@/utils/errors";

vi.mock("@/lib/logger", () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { StripstreamClient } from "./stripstream.client";
import {
  findSeriesById,
  resolveSeriesId,
  resolveSeriesIdByName,
  resolveSeriesIdFromBookId,
} from "./series-identity";

const SERIES = { series_id: "series-1", name: "Saga" };
const BOOK = { id: "book-1", library_id: "lib-1", series: "Saga" };

function client(): StripstreamClient {
  return new StripstreamClient("http://stream.local", "token");
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** Route les requêtes par fragment d'URL ; toute autre URL fait échouer le test. */
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

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("findSeriesById", () => {
  it("returns the series on success", async () => {
    stubFetch([["/series/series-1/details", () => jsonResponse(SERIES)]]);

    await expect(findSeriesById(client(), "series-1")).resolves.toEqual(SERIES);
  });

  it("returns null only on a confirmed 404", async () => {
    stubFetch([["/series/missing/details", () => jsonResponse({}, 404)]]);

    await expect(findSeriesById(client(), "missing")).resolves.toBeNull();
  });

  it("rethrows a server failure so callers can tell it from an absence", async () => {
    stubFetch([["/series/boom/details", () => jsonResponse({}, 500)]]);

    await expect(findSeriesById(client(), "boom")).rejects.toMatchObject({
      code: ERROR_CODES.STRIPSTREAM.SERVER_ERROR,
    });
  });
});

describe("resolveSeriesIdByName", () => {
  it("encodes the name and returns the series id", async () => {
    const fetchMock = stubFetch([
      ["/libraries/lib-1/series/by-name/Saga%20%26%20Co", () => jsonResponse({ id: "series-7" })],
    ]);

    await expect(resolveSeriesIdByName(client(), "lib-1", "Saga & Co")).resolves.toBe(
      "series-7"
    );
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      "/libraries/lib-1/series/by-name/Saga%20%26%20Co"
    );
  });

  it("returns null on a confirmed 404", async () => {
    stubFetch([["/series/by-name/Unknown", () => jsonResponse({}, 404)]]);

    await expect(resolveSeriesIdByName(client(), "lib-1", "Unknown")).resolves.toBeNull();
  });

  it("rethrows a server failure instead of pretending the series is absent", async () => {
    stubFetch([["/series/by-name/Boom", () => jsonResponse({}, 500)]]);

    await expect(resolveSeriesIdByName(client(), "lib-1", "Boom")).rejects.toMatchObject({
      code: ERROR_CODES.STRIPSTREAM.SERVER_ERROR,
    });
  });
});

describe("resolveSeriesIdFromBookId", () => {
  it("reads the series name from the book, then resolves it in the book's library", async () => {
    const fetchMock = stubFetch([
      ["/books/book-1", () => jsonResponse(BOOK)],
      ["/libraries/lib-1/series/by-name/Saga", () => jsonResponse({ id: "series-1" })],
    ]);

    await expect(resolveSeriesIdFromBookId(client(), "book-1")).resolves.toBe("series-1");
    expect(String(fetchMock.mock.calls[1][0])).toContain("/libraries/lib-1/series/by-name/Saga");
  });

  it("returns null without a by-name lookup when the book declares no series", async () => {
    const fetchMock = stubFetch([
      ["/books/book-1", () => jsonResponse({ ...BOOK, series: null })],
    ]);

    await expect(resolveSeriesIdFromBookId(client(), "book-1")).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns null when the book itself is a confirmed 404", async () => {
    stubFetch([["/books/missing", () => jsonResponse({}, 404)]]);

    await expect(resolveSeriesIdFromBookId(client(), "missing")).resolves.toBeNull();
  });

  it("rethrows a by-name server failure", async () => {
    stubFetch([
      ["/books/book-1", () => jsonResponse(BOOK)],
      ["/series/by-name/Saga", () => jsonResponse({}, 500)],
    ]);

    await expect(resolveSeriesIdFromBookId(client(), "book-1")).rejects.toMatchObject({
      code: ERROR_CODES.STRIPSTREAM.SERVER_ERROR,
    });
  });
});

describe("resolveSeriesId", () => {
  it("prefers the series id and does not probe the book endpoint", async () => {
    const fetchMock = stubFetch([["/series/series-1/details", () => jsonResponse(SERIES)]]);

    await expect(resolveSeriesId(client(), "series-1")).resolves.toBe("series-1");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to the first-book id for legacy links", async () => {
    stubFetch([
      ["/series/book-1/details", () => jsonResponse({}, 404)],
      ["/books/book-1", () => jsonResponse(BOOK)],
      ["/series/by-name/Saga", () => jsonResponse({ id: "series-1" })],
    ]);

    await expect(resolveSeriesId(client(), "book-1")).resolves.toBe("series-1");
  });

  it("returns null when both readings are confirmed absent", async () => {
    stubFetch([
      ["/series/nope/details", () => jsonResponse({}, 404)],
      ["/books/nope", () => jsonResponse({}, 404)],
    ]);

    await expect(resolveSeriesId(client(), "nope")).resolves.toBeNull();
  });

  it("propagates a book lookup failure instead of listing an unresolved id", async () => {
    stubFetch([
      ["/series/book-1/details", () => jsonResponse({}, 404)],
      ["/books/book-1", () => jsonResponse({}, 502)],
    ]);

    const error = await resolveSeriesId(client(), "book-1").catch((caught) => caught);

    expect(error).toBeInstanceOf(AppError);
    expect(error.code).toBe(ERROR_CODES.STRIPSTREAM.SERVER_ERROR);
  });
});
