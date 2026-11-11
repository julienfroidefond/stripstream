import { afterEach, describe, expect, it, vi } from "vitest";
import { KomgaProvider } from "./komga.provider";
import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError } from "@/utils/errors";

function response(status: number): Response {
  return {
    ok: false,
    status,
    statusText: `HTTP ${status}`,
    json: async () => ({}),
  } as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

function lastFetchCall() {
  const fetchMock = vi.mocked(fetch);
  const call = fetchMock.mock.calls.at(-1);
  if (!call) throw new Error("fetch was not called");

  return {
    url: call[0] as string,
    init: call[1] as RequestInit,
  };
}

describe("KomgaProvider.getSeriesById", () => {
  it("returns null on a confirmed 404", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => response(404)));
    const provider = new KomgaProvider("http://komga.test", "auth");

    await expect(provider.getSeriesById("missing")).resolves.toBeNull();
  });

  it("rethrows a server failure so callers can tell it from an absence", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => response(500)));
    const provider = new KomgaProvider("http://komga.test", "auth");

    await expect(provider.getSeriesById("boom")).rejects.toBeInstanceOf(AppError);
  });
});

describe("KomgaProvider mutations", () => {
  it("routes read-progress writes through the shared transport", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    const provider = new KomgaProvider("http://komga.test///", "secret");

    await provider.saveReadProgress("book-1", 3, false);

    const { url, init } = lastFetchCall();
    expect(url).toBe("http://komga.test/api/v1/books/book-1/read-progress");
    expect(init.method).toBe("PATCH");
    expect(init.body).toBe(JSON.stringify({ page: 3, completed: false }));
    const headers = new Headers(init.headers);
    expect(headers.get("authorization")).toBe("Basic secret");
    expect(headers.get("content-type")).toBe("application/json");
  });

  it("accepts an empty scan response", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 202 }));
    vi.stubGlobal("fetch", fetchMock);
    const provider = new KomgaProvider("http://komga.test", "secret");

    await expect(provider.scanLibrary("library-1")).resolves.toEqual({
      jobId: null,
      progressSupported: false,
    });

    const { url, init } = lastFetchCall();
    expect(url).toBe("http://komga.test/api/v1/libraries/library-1/scan");
    expect(init.method).toBe("POST");
  });

  it("routes read-progress resets through the shared transport", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    const provider = new KomgaProvider("http://komga.test", "secret");

    await provider.resetReadProgress("book-1");

    const { url, init } = lastFetchCall();
    expect(url).toBe("http://komga.test/api/v1/books/book-1/read-progress");
    expect(init.method).toBe("DELETE");
    expect(new Headers(init.headers).get("content-type")).toBeNull();
  });

  it("keeps the read-progress error code when the write fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => response(500)));
    const provider = new KomgaProvider("http://komga.test", "secret");

    await expect(provider.saveReadProgress("book-1", 2, false)).rejects.toMatchObject({
      name: "AppError",
      code: ERROR_CODES.BOOK.PROGRESS_UPDATE_ERROR,
    });
  });
});
