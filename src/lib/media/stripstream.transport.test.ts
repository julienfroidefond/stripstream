import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ERROR_CODES } from "@/constants/errorCodes";

const { requireConnectionMock } = vi.hoisted(() => ({
  requireConnectionMock: vi.fn(),
}));

vi.mock("@/lib/connections", () => ({
  requireConnectionForProvider: requireConnectionMock,
}));

import { stripstreamMediaTransport } from "./stripstream.transport";

const STRIPSTREAM = {
  provider: "stripstream" as const,
  configId: 7,
  url: "http://stream.test",
  token: "secret",
  source: "db" as const,
};

const USER_ID = 42;

function context(headers: Record<string, string> = {}) {
  return { headers: new Headers(headers), userId: USER_ID };
}

function lastFetchCall() {
  const fetchMock = vi.mocked(fetch);
  const call = fetchMock.mock.calls.at(-1);
  if (!call) throw new Error("fetch was not called");
  return {
    url: call[0] as string,
    init: call[1] as RequestInit,
  };
}

beforeEach(() => {
  requireConnectionMock.mockReset();
  requireConnectionMock.mockResolvedValue(STRIPSTREAM);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("stripstreamMediaTransport", () => {
  it("keeps the raw page query and relays validators", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(null, {
          status: 304,
          headers: { etag: '"page-2"' },
        })
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await stripstreamMediaTransport.fetch(
      {
        kind: "book-page",
        bookId: "book-1",
        pageNumber: 2,
        query: "width=1200&format=webp",
      },
      context({ "if-none-match": '"page-2"', "x-ignored": "yes" })
    );

    expect(response.status).toBe(304);
    expect(response.headers.get("etag")).toBe('"page-2"');
    const { url, init } = lastFetchCall();
    expect(url).toBe(
      "http://stream.test/books/book-1/pages/2?width=1200&format=webp"
    );
    const headers = new Headers(init.headers);
    expect(headers.get("authorization")).toBe("Bearer secret");
    expect(headers.get("accept")).toBe("image/webp, image/jpeg, image/png, */*");
    expect(headers.get("if-none-match")).toBe('"page-2"');
    expect(headers.get("x-ignored")).toBeNull();
  });

  it("coalesces identical thumbnails and rebuilds a body per caller", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response("thumbnail", {
          status: 200,
          headers: { "content-type": "image/jpeg", etag: '"v1"' },
        })
    );
    vi.stubGlobal("fetch", fetchMock);
    const ref = { kind: "book-cover" as const, bookId: "book-1" };

    const [first, second] = await Promise.all([
      stripstreamMediaTransport.fetch(ref, context()),
      stripstreamMediaTransport.fetch(ref, context()),
    ]);

    expect(await first.text()).toBe("thumbnail");
    expect(await second.text()).toBe("thumbnail");
    expect(first.headers.get("content-type")).toBe("image/jpeg");
    expect(second.headers.get("etag")).toBe('"v1"');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("streams source files without HTTP caching", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("file", { status: 200 }))
    );

    await stripstreamMediaTransport.fetch(
      { kind: "book-file", bookId: "book-1" },
      context()
    );

    const { url, init } = lastFetchCall();
    expect(url).toBe("http://stream.test/books/book-1/file");
    expect(init.cache).toBe("no-store");
    expect(new Headers(init.headers).get("accept")).toBe(
      "application/octet-stream, */*"
    );
  });

  it("maps a missing file to the Stripstream error code", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response("missing", {
            status: 404,
            statusText: "Not Found",
          })
      )
    );

    await expect(
      stripstreamMediaTransport.fetch(
        { kind: "book-file", bookId: "book-1" },
        context()
      )
    ).rejects.toMatchObject({
      name: "AppError",
      code: ERROR_CODES.STRIPSTREAM.NOT_FOUND,
      params: { status: 404, statusText: "Not Found" },
    });
  });

  it("rejects unsupported references without resolving a connection", async () => {
    await expect(
      stripstreamMediaTransport.fetch(
        { kind: "series-cover", seriesId: "series-1" },
        context()
      )
    ).rejects.toMatchObject({
      code: ERROR_CODES.IMAGE.FETCH_ERROR,
      params: { status: 404 },
    });
    expect(requireConnectionMock).not.toHaveBeenCalled();
  });
});
