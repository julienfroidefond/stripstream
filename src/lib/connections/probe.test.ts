import { beforeEach, describe, expect, it, vi } from "vitest";

const { createProviderMock, getStoredConnectionMock } = vi.hoisted(() => ({
  createProviderMock: vi.fn(),
  getStoredConnectionMock: vi.fn(),
}));

vi.mock("@/lib/providers/provider.factory", () => ({
  createProvider: createProviderMock,
}));

vi.mock("./resolve", () => ({
  getStoredConnection: getStoredConnectionMock,
}));

import {
  checkConnectionTestRateLimit,
  testConnection,
  testStoredConnection,
} from "./probe";
import type { KomgaConnection, StripstreamConnection } from "./types";

const KOMGA_CONNECTION: KomgaConnection = {
  provider: "komga",
  configId: 5,
  url: "http://komga.local",
  authHeader: "alice:secret",
};

const STRIPSTREAM_CONNECTION: StripstreamConnection = {
  provider: "stripstream",
  configId: 5,
  url: "http://stream.local",
  token: "token",
  source: "db",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("checkConnectionTestRateLimit", () => {
  it("allows five attempts per provider and user, then blocks the sixth", async () => {
    const userId = 900000 + Math.floor(Math.random() * 1000);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect(await checkConnectionTestRateLimit("komga", userId)).toMatchObject({
        allowed: true,
      });
    }

    expect(await checkConnectionTestRateLimit("komga", userId)).toMatchObject({
      allowed: false,
      retryAfterSeconds: expect.any(Number),
    });
  });

  it("keeps separate budgets for each provider", async () => {
    const userId = 910000 + Math.floor(Math.random() * 1000);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await checkConnectionTestRateLimit("komga", userId);
    }

    expect((await checkConnectionTestRateLimit("komga", userId)).allowed).toBe(false);
    expect((await checkConnectionTestRateLimit("stripstream", userId)).allowed).toBe(true);
  });
});

describe("testConnection", () => {
  it("delegates to the provider built by the factory", async () => {
    const testConnectionMock = vi.fn().mockResolvedValue({
      ok: true,
      libraryCount: 3,
    });
    createProviderMock.mockResolvedValue({ testConnection: testConnectionMock });

    await expect(testConnection(KOMGA_CONNECTION)).resolves.toEqual({
      ok: true,
      libraryCount: 3,
    });
    expect(createProviderMock).toHaveBeenCalledWith(KOMGA_CONNECTION);
    expect(testConnectionMock).toHaveBeenCalledTimes(1);
  });
});

describe("testStoredConnection", () => {
  it("returns null without building a provider when the exact config is missing", async () => {
    getStoredConnectionMock.mockResolvedValue(null);

    await expect(testStoredConnection("komga", 5, 7)).resolves.toBeNull();
    expect(getStoredConnectionMock).toHaveBeenCalledWith("komga", 5, 7);
    expect(createProviderMock).not.toHaveBeenCalled();
  });

  it("tests the resolved Stripstream connection", async () => {
    const testConnectionMock = vi.fn().mockResolvedValue({ ok: true });
    getStoredConnectionMock.mockResolvedValue(STRIPSTREAM_CONNECTION);
    createProviderMock.mockResolvedValue({ testConnection: testConnectionMock });

    await expect(testStoredConnection("stripstream", 5, 7)).resolves.toEqual({
      ok: true,
    });
    expect(getStoredConnectionMock).toHaveBeenCalledWith("stripstream", 5, 7);
    expect(createProviderMock).toHaveBeenCalledWith(STRIPSTREAM_CONNECTION);
  });
});
