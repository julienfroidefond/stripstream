import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ERROR_CODES } from "@/constants/errorCodes";

const { requireConnectionMock, getPreferencesMock } = vi.hoisted(() => ({
  requireConnectionMock: vi.fn(),
  getPreferencesMock: vi.fn(),
}));

vi.mock("@/lib/connections", () => ({
  requireConnectionForProvider: requireConnectionMock,
}));


vi.mock("@/lib/services/preferences.service", () => ({
  PreferencesService: { getPreferences: getPreferencesMock },
}));

import { komgaMediaTransport } from "./komga.transport";

const KOMGA = {
  provider: "komga" as const,
  configId: 1,
  url: "http://komga.test",
  authHeader: "secret",
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
  requireConnectionMock.mockResolvedValue(KOMGA);
  getPreferencesMock.mockReset();
  getPreferencesMock.mockResolvedValue({ showThumbnails: false });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("komgaMediaTransport", () => {
  it("sends the 1-based page as-is to Komga and relays validators", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(null, {
          status: 304,
          headers: { etag: '"v1"' },
        })
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await komgaMediaTransport.fetch(
      { kind: "book-page", bookId: "book-1", pageNumber: 3 },
      context({
        "if-none-match": '"v1"',
        cookie: "stripstream-active-komga-config=2",
      })
    );

    expect(response.status).toBe(304);
    expect(response.headers.get("etag")).toBe('"v1"');
    const { url, init } = lastFetchCall();
    expect(url).toBe(
      "http://komga.test/api/v1/books/book-1/pages/3"
    );
    const headers = new Headers(init.headers);
    expect(headers.get("authorization")).toBe("Basic secret");
    expect(headers.get("if-none-match")).toBe('"v1"');
    expect(headers.get("cookie")).toBeNull();
  });

  it("asks Komga for the same 1-based page thumbnail (no zero_based there)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("thumb", { status: 200 }))
    );

    await komgaMediaTransport.fetch(
      { kind: "book-page-thumbnail", bookId: "book-1", pageNumber: 1 },
      context()
    );

    expect(lastFetchCall().url).toBe(
      "http://komga.test/api/v1/books/book-1/pages/1/thumbnail"
    );
  });

  it("never lets a decoded id climb out of the API prefix", async () => {
    const fetchMock = vi.fn(async () => new Response("x", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      komgaMediaTransport.fetch(
        { kind: "book-file", bookId: "../../../actuator?" },
        context()
      )
    ).rejects.toMatchObject({ code: ERROR_CODES.KOMGA.NOT_FOUND });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("coalesces identical pages only for the same connection", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response("page", {
          status: 200,
          headers: { "content-type": "image/jpeg" },
        })
    );
    vi.stubGlobal("fetch", fetchMock);
    const ref = { kind: "book-page" as const, bookId: "book-1", pageNumber: 1 };

    const [first, second] = await Promise.all([
      komgaMediaTransport.fetch(ref, context()),
      komgaMediaTransport.fetch(ref, context()),
    ]);

    expect(await first.text()).toBe("page");
    expect(await second.text()).toBe("page");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    requireConnectionMock
      .mockResolvedValueOnce({ ...KOMGA, configId: 2 })
      .mockResolvedValueOnce({ ...KOMGA, configId: 3 });
    await Promise.all([
      komgaMediaTransport.fetch(ref, context()),
      komgaMediaTransport.fetch(ref, context()),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("uses the preference to choose the book cover source", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("cover", { status: 200 }))
    );

    await komgaMediaTransport.fetch(
      { kind: "book-cover", bookId: "book-1" },
      context()
    );
    expect(lastFetchCall().url).toBe(
      "http://komga.test/api/v1/books/book-1/pages/1"
    );

    getPreferencesMock.mockResolvedValue({ showThumbnails: true });
    await komgaMediaTransport.fetch(
      { kind: "book-cover", bookId: "book-1" },
      context()
    );
    expect(lastFetchCall().url).toBe(
      "http://komga.test/api/v1/books/book-1/thumbnail"
    );
    // L'identité vient de la route, pas de la session.
    expect(getPreferencesMock).toHaveBeenCalledWith(USER_ID);
    expect(requireConnectionMock).toHaveBeenCalledWith("komga", USER_ID);
  });

  it("resolves the first book before serving a series cover", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ content: [{ id: "book-1" }] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
      )
      .mockResolvedValueOnce(new Response("cover", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await komgaMediaTransport.fetch(
      { kind: "series-cover", seriesId: "series-1" },
      context()
    );

    expect(fetchMock.mock.calls[0][0]).toBe(
      "http://komga.test/api/v1/series/series-1/books?page=0&size=1"
    );
    expect(fetchMock.mock.calls[1][0]).toBe(
      "http://komga.test/api/v1/books/book-1/pages/1"
    );
  });

  it("streams source files without HTTP caching", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("file", { status: 200 }))
    );

    await komgaMediaTransport.fetch(
      { kind: "book-file", bookId: "book-1" },
      context()
    );

    const { url, init } = lastFetchCall();
    expect(url).toBe("http://komga.test/api/v1/books/book-1/file");
    expect(init.cache).toBe("no-store");
  });
});
