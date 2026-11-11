import { afterEach, describe, expect, it, vi } from "vitest";
import { KomgaProvider } from "./komga.provider";
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
