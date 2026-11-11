import { afterEach, describe, expect, it, vi } from "vitest";

import { ERROR_CODES } from "@/constants/errorCodes";

const { loggerMock, unstableCacheMock } = vi.hoisted(() => ({
  loggerMock: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  unstableCacheMock: vi.fn((fn: () => unknown) => fn),
}));

vi.mock("@/lib/logger", () => ({ default: loggerMock }));
vi.mock("next/cache", () => ({ unstable_cache: unstableCacheMock }));

import { ProviderTransport, type ProviderTransportPolicy } from "./provider-transport";
import { createKomgaTransportPolicy } from "./komga/komga.transport-policy";
import { createStripstreamTransportPolicy } from "./stripstream/stripstream.transport-policy";

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

function lastFetchCall() {
  const fetchMock = vi.mocked(fetch);
  const call = fetchMock.mock.calls.at(-1);
  if (!call) throw new Error("fetch was not called");

  return {
    url: call[0] as string,
    init: call[1] as RequestInit & {
      next?: { tags?: string[]; revalidate?: number };
    },
  };
}

function testPolicy(
  overrides: Partial<ProviderTransportPolicy> = {}
): ProviderTransportPolicy {
  return {
    label: "Test",
    origin: "http://provider.test",
    pathPrefix: "/api",
    headers: {
      Authorization: "Bearer test",
      Accept: "application/json",
    },
    httpCodes: {
      UNAUTHORIZED: ERROR_CODES.KOMGA.UNAUTHORIZED,
      FORBIDDEN: ERROR_CODES.KOMGA.FORBIDDEN,
      NOT_FOUND: ERROR_CODES.KOMGA.NOT_FOUND,
      SERVER_ERROR: ERROR_CODES.KOMGA.SERVER_ERROR,
      HTTP_ERROR: ERROR_CODES.KOMGA.HTTP_ERROR,
    },
    timeoutMs: 1000,
    fallbackErrorCode: ERROR_CODES.KOMGA.CONNECTION_ERROR,
    ...overrides,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  loggerMock.info.mockReset();
  loggerMock.warn.mockReset();
  loggerMock.error.mockReset();
  unstableCacheMock.mockClear();
});

describe("ProviderTransport", () => {
  it("builds the provider URL with arrays and skips undefined params", () => {
    const transport = new ProviderTransport(
      testPolicy({ origin: "http://provider.test///", pathPrefix: "/api/" })
    );

    expect(
      transport.buildUrl("books", {
        limit: "10",
        tag: ["a", "b"],
        skip: undefined,
      })
    ).toBe("http://provider.test/api/books?limit=10&tag=a&tag=b");
  });

  it("sends the policy headers and forwards cache and body options", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    const transport = new ProviderTransport(testPolicy());

    await expect(
      transport.request("books", { limit: "10" }, {
        method: "PUT",
        body: JSON.stringify({ rating: 5 }),
        tags: ["books", "list"],
      })
    ).resolves.toEqual({ ok: true });

    const { url, init } = lastFetchCall();
    expect(url).toBe("http://provider.test/api/books?limit=10");
    expect(init.method).toBe("PUT");
    expect(init.body).toBe(JSON.stringify({ rating: 5 }));
    expect(init.next).toEqual({ tags: ["books", "list"] });
    const headers = new Headers(init.headers);
    expect(headers.get("authorization")).toBe("Bearer test");
    expect(headers.get("accept")).toBe("application/json");
    expect(headers.get("content-type")).toBe("application/json");
  });

  it("treats an empty success body as null", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 204 })));
    const transport = new ProviderTransport(testPolicy());

    await expect(transport.request("books/book-1/rating")).resolves.toBeNull();
  });

  it("maps HTTP failures through the policy error codes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response("unauthorized", {
            status: 401,
            statusText: "Unauthorized",
          })
      )
    );
    const transport = new ProviderTransport(testPolicy());

    await expect(transport.request("books")).rejects.toMatchObject({
      name: "AppError",
      code: ERROR_CODES.KOMGA.UNAUTHORIZED,
      params: { status: 401, statusText: "Unauthorized" },
    });
  });

  it("retries once through the policy before returning the response", async () => {
    const beforeRetry = vi.fn();
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error("dns"), { code: "EAI_AGAIN" }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    const transport = new ProviderTransport(
      testPolicy({
        retry: {
          shouldRetry: (error) =>
            error instanceof Error && error.message === "dns",
          beforeRetry,
        },
      })
    );

    await expect(transport.request("health")).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(beforeRetry).toHaveBeenCalledTimes(1);
  });

  it("does not retry an unmatched failure and wraps it in the fallback code", async () => {
    const fetchMock = vi.fn(async () => {
      throw Object.assign(new Error("connection refused"), { code: "ECONNREFUSED" });
    });
    vi.stubGlobal("fetch", fetchMock);
    const transport = new ProviderTransport(
      testPolicy({
        retry: {
          shouldRetry: () => false,
        },
      })
    );

    await expect(transport.request("books")).rejects.toMatchObject({
      name: "AppError",
      code: ERROR_CODES.KOMGA.CONNECTION_ERROR,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(loggerMock.warn).toHaveBeenCalled();
  });

  it("wraps a cached POST through unstable_cache", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ totalElements: 1 }));
    vi.stubGlobal("fetch", fetchMock);
    const transport = new ProviderTransport(
      testPolicy({
        cachePostWithUnstableCache: true,
        cacheKey: (url, body) => ["test", url, String(body ?? "")],
      })
    );
    const body = JSON.stringify({ condition: {} });

    await expect(
      transport.request("books/list", { page: "0" }, {
        method: "POST",
        body,
        revalidate: 60,
      })
    ).resolves.toEqual({ totalElements: 1 });

    expect(unstableCacheMock).toHaveBeenCalledWith(
      expect.any(Function),
      ["test", "http://provider.test/api/books/list?page=0", body],
      { revalidate: 60 }
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("Komga transport policy", () => {
  it("uses the Komga base path and basic auth", async () => {
    const fetchMock = vi.fn(async () => jsonResponse([]));
    vi.stubGlobal("fetch", fetchMock);
    const transport = new ProviderTransport(
      createKomgaTransportPolicy("http://komga.test///", "secret")
    );

    await transport.request("libraries");

    const { url, init } = lastFetchCall();
    expect(url).toBe("http://komga.test/api/v1/libraries");
    expect(new Headers(init.headers).get("authorization")).toBe("Basic secret");
    expect(new Headers(init.headers).get("accept")).toBe("application/json");
  });

  it("retries only the Komga DNS and cold-start codes, without delay", () => {
    const policy = createKomgaTransportPolicy("http://komga.test", "secret");

    expect(policy.retry?.shouldRetry({ cause: { code: "EAI_AGAIN" } })).toBe(true);
    expect(policy.retry?.shouldRetry({ code: "UND_ERR_CONNECT_TIMEOUT" })).toBe(true);
    expect(policy.retry?.shouldRetry({ code: "ECONNRESET" })).toBe(false);
    expect(policy.retry?.delayMs).toBeUndefined();
    expect(policy.cachePostWithUnstableCache).toBe(true);
    expect(
      policy.cacheKey?.("http://komga.test/api/v1/books/list?page=0", "{}")
    ).toEqual([
      "komga",
      "secret",
      "http://komga.test/api/v1/books/list?page=0",
      "{}",
    ]);
  });

  it("maps a network failure to the Komga connection error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw Object.assign(new Error("connection refused"), { code: "ECONNREFUSED" });
      })
    );
    const transport = new ProviderTransport(
      createKomgaTransportPolicy("http://komga.test", "secret")
    );

    await expect(transport.request("libraries")).rejects.toMatchObject({
      name: "AppError",
      code: ERROR_CODES.KOMGA.CONNECTION_ERROR,
    });
  });
});

describe("Stripstream transport policy", () => {
  it("uses the root path and bearer auth", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    const transport = new ProviderTransport(
      createStripstreamTransportPolicy("http://stream.test///", "token")
    );

    await transport.request("books");

    const { url, init } = lastFetchCall();
    expect(url).toBe("http://stream.test/books");
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer token");
    expect(new Headers(init.headers).get("accept")).toBe("application/json");
  });

  it("retries socket failures after the shared delay", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error("socket"), { code: "ECONNRESET" }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    const transport = new ProviderTransport(
      createStripstreamTransportPolicy("http://stream.test", "token")
    );

    const request = transport.request("health");
    await vi.advanceTimersByTimeAsync(500);

    await expect(request).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(loggerMock.warn).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(Error) }),
      "Transient network error, retrying..."
    );
  });
});
