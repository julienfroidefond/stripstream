import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ERROR_CODES } from "@/constants/errorCodes";

const { requireConnectionMock, limiterRunMock, loggerMock } = vi.hoisted(() => ({
  requireConnectionMock: vi.fn(),
  limiterRunMock: vi.fn(),
  loggerMock: {
    error: vi.fn(),
  },
}));

vi.mock("@/lib/connections", () => ({
  requireConnectionForProvider: requireConnectionMock,
}));

vi.mock("@/lib/services/image-request-limiter", () => ({
  imageRequestLimiter: { run: limiterRunMock },
}));

vi.mock("@/lib/logger", () => ({ default: loggerMock }));

import { KomgaImageService } from "./image.service";

function lastFetchCall() {
  const fetchMock = vi.mocked(fetch);
  const call = fetchMock.mock.calls.at(-1);
  if (!call) throw new Error("fetch was not called");

  return {
    url: call[0] as string,
    init: call[1] as RequestInit,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

beforeEach(() => {
  requireConnectionMock.mockReset();
  requireConnectionMock.mockResolvedValue({
    provider: "komga",
    configId: 1,
    url: "http://komga.local",
    authHeader: "base64-credentials",
  });
  limiterRunMock.mockReset();
  limiterRunMock.mockImplementation(async (task: () => Promise<Response>) => task());
  loggerMock.error.mockReset();
});

describe("KomgaImageService.streamImage", () => {
  it("streams the upstream image with Komga auth and cache headers", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response("image-bytes", {
          status: 200,
          headers: {
            "content-type": "image/jpeg",
            "content-length": "11",
            etag: '"etag-1"',
            "last-modified": "Wed, 01 Jan 2026 00:00:00 GMT",
            "x-upstream-only": "drop-me",
          },
        })
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await KomgaImageService.streamImage(
      "books/book-1/thumbnail",
      120
    );

    const { url, init } = lastFetchCall();
    expect(url).toBe("http://komga.local/api/v1/books/book-1/thumbnail");
    const headers = new Headers(init.headers);
    expect(headers.get("authorization")).toBe("Basic base64-credentials");
    expect(headers.get("accept")).toContain("image/jpeg");

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("image-bytes");
    expect(response.headers.get("cache-control")).toBe(
      "public, max-age=120, immutable"
    );
    expect(response.headers.get("content-type")).toBe("image/jpeg");
    expect(response.headers.get("content-length")).toBe("11");
    expect(response.headers.get("etag")).toBe('"etag-1"');
    expect(response.headers.get("last-modified")).toBe(
      "Wed, 01 Jan 2026 00:00:00 GMT"
    );
    expect(response.headers.get("x-upstream-only")).toBeNull();
  });

  it("forwards only conditional headers and accepts a 304", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(null, {
          status: 304,
          headers: { etag: '"etag-1"' },
        })
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await KomgaImageService.streamImage(
      "books/book-1/pages/2",
      60,
      new Headers({
        "if-none-match": '"etag-1"',
        "if-modified-since": "Wed, 01 Jan 2026 00:00:00 GMT",
        "x-ignored": "yes",
      })
    );

    expect(response.status).toBe(304);
    const { init } = lastFetchCall();
    const headers = new Headers(init.headers);
    expect(headers.get("if-none-match")).toBe('"etag-1"');
    expect(headers.get("if-modified-since")).toBe(
      "Wed, 01 Jan 2026 00:00:00 GMT"
    );
    expect(headers.get("x-ignored")).toBeNull();
    expect(response.headers.get("cache-control")).toBe(
      "public, max-age=60, immutable"
    );
  });

  it("maps an upstream HTTP failure to IMAGE_FETCH_ERROR", async () => {
    const fetchMock = vi.fn(async () => new Response("missing", { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      KomgaImageService.streamImage("books/book-1/thumbnail")
    ).rejects.toMatchObject({
      name: "AppError",
      code: ERROR_CODES.IMAGE.FETCH_ERROR,
      params: { status: 404 },
    });
  });

  it("wraps network failures so the route always returns a controlled error", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("connect ECONNREFUSED");
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      KomgaImageService.streamImage("books/book-1/thumbnail")
    ).rejects.toMatchObject({
      name: "AppError",
      code: ERROR_CODES.IMAGE.FETCH_ERROR,
    });
    expect(loggerMock.error).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(Error) }),
      "Erreur lors du streaming de l'image"
    );
  });

  it("aborts an upstream request that exceeds its timeout", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("The operation was aborted.", "AbortError"));
          });
        })
    );
    vi.stubGlobal("fetch", fetchMock);

    const expectation = expect(
      KomgaImageService.streamImage("books/book-1/thumbnail")
    ).rejects.toMatchObject({
      name: "AppError",
      code: ERROR_CODES.IMAGE.FETCH_ERROR,
    });

    await vi.advanceTimersByTimeAsync(20_000);
    await expectation;
  });
});
