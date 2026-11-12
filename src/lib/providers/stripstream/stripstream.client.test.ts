import { afterEach, describe, expect, it, vi } from "vitest";

import { ERROR_CODES } from "@/constants/errorCodes";

const { loggerMock } = vi.hoisted(() => ({
  loggerMock: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/logger", () => ({ default: loggerMock }));

import { StripstreamClient } from "./stripstream.client";

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
    init: call[1] as RequestInit & { next?: { tags?: string[]; revalidate?: number } },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  loggerMock.info.mockReset();
  loggerMock.warn.mockReset();
  loggerMock.error.mockReset();
});

describe("StripstreamClient.buildUrl", () => {
  it("normalizes the base URL and omits undefined params", () => {
    const client = new StripstreamClient("http://stream.local///", "token");

    expect(
      client.buildUrl("books", {
        limit: "10",
        offset: undefined,
        q: "hello world",
      })
    ).toBe("http://stream.local/books?limit=10&q=hello+world");
  });
});

describe("StripstreamClient.fetch", () => {
  it("sends auth headers and forwards cache tags", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ items: [] }));
    vi.stubGlobal("fetch", fetchMock);
    const client = new StripstreamClient("http://stream.local", "secret");

    await expect(
      client.fetch("books", { limit: "10" }, { method: "GET", tags: ["books", "list"] })
    ).resolves.toEqual({ items: [] });

    const { url, init } = lastFetchCall();
    expect(url).toBe("http://stream.local/books?limit=10");
    expect(init.method).toBe("GET");
    expect(init.next).toEqual({ tags: ["books", "list"] });
    const headers = new Headers(init.headers);
    expect(headers.get("authorization")).toBe("Bearer secret");
    expect(headers.get("accept")).toBe("application/json");
    expect(headers.get("content-type")).toBeNull();
  });

  it("adds a JSON content type for writes and forwards revalidation", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    const client = new StripstreamClient("http://stream.local", "secret");

    await client.fetch("ratings/book-1", undefined, {
      method: "PUT",
      body: JSON.stringify({ rating: 5 }),
      revalidate: 60,
    });

    const { init } = lastFetchCall();
    expect(init.next).toEqual({ revalidate: 60 });
    expect(new Headers(init.headers).get("content-type")).toBe("application/json");
  });

  it("returns null for a 204 without a body", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    const client = new StripstreamClient("http://stream.local", "secret");

    await expect(client.fetch("ratings/book-1")).resolves.toBeNull();
  });

  it("maps provider HTTP failures to the matching error code", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response("unauthorized", {
          status: 401,
          statusText: "Unauthorized",
        })
    );
    vi.stubGlobal("fetch", fetchMock);
    const client = new StripstreamClient("http://stream.local", "secret");

    await expect(client.fetch("books")).rejects.toMatchObject({
      name: "AppError",
      code: ERROR_CODES.STRIPSTREAM.UNAUTHORIZED,
      params: { status: 401, statusText: "Unauthorized" },
    });
  });

  it("retries once on a transient network failure", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error("socket closed"), { code: "ECONNRESET" }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    const client = new StripstreamClient("http://stream.local", "secret");

    const request = client.fetch("health");
    await vi.advanceTimersByTimeAsync(500);

    await expect(request).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(loggerMock.warn).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(Error) }),
      "Transient network error, retrying..."
    );
  });

  it("wraps connection errors in a provider AppError", async () => {
    const fetchMock = vi.fn(async () => {
      throw Object.assign(new Error("connection refused"), { code: "ECONNREFUSED" });
    });
    vi.stubGlobal("fetch", fetchMock);
    const client = new StripstreamClient("http://stream.local", "secret");

    await expect(client.fetch("books")).rejects.toMatchObject({
      name: "AppError",
      code: ERROR_CODES.STRIPSTREAM.CONNECTION_ERROR,
    });
    expect(loggerMock.warn).toHaveBeenCalled();
  });
});
