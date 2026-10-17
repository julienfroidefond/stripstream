import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { findFirstMock } = vi.hoisted(() => ({ findFirstMock: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  default: {
    stripstreamConfig: {
      findFirst: findFirstMock,
    },
  },
}));

import { getResolvedStripstreamConfig } from "./stripstream-config-resolver";
import { encryptSecret } from "@/lib/credentials";

const ACTIVE_QUERY = {
  where: { id: 42, userId: 7 },
  select: { url: true, token: true },
};

const FALLBACK_QUERY = {
  where: { userId: 7 },
  orderBy: { createdAt: "asc" as const },
  select: { url: true, token: true },
};

describe("getResolvedStripstreamConfig", () => {
  beforeEach(() => {
    findFirstMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses the active config when it belongs to the user", async () => {
    findFirstMock.mockResolvedValueOnce({ url: "http://active", token: "tok" });

    expect(await getResolvedStripstreamConfig(7, 42)).toEqual({
      url: "http://active",
      token: "tok",
      source: "db",
    });

    expect(findFirstMock).toHaveBeenCalledTimes(1);
    expect(findFirstMock).toHaveBeenCalledWith(ACTIVE_QUERY);
  });

  it("falls back to the first config when the active id is unknown", async () => {
    findFirstMock
      .mockResolvedValueOnce(null) // activeId query misses
      .mockResolvedValueOnce({ url: "http://fallback", token: "tok2" });

    expect(await getResolvedStripstreamConfig(7, 42)).toEqual({
      url: "http://fallback",
      token: "tok2",
      source: "db",
    });

    expect(findFirstMock).toHaveBeenCalledTimes(2);
    expect(findFirstMock).toHaveBeenNthCalledWith(1, ACTIVE_QUERY);
    expect(findFirstMock).toHaveBeenNthCalledWith(2, FALLBACK_QUERY);
  });

  it("queries the first config directly when no active id is given", async () => {
    findFirstMock.mockResolvedValueOnce({ url: "http://only", token: "tok" });

    expect(await getResolvedStripstreamConfig(7)).toEqual({
      url: "http://only",
      token: "tok",
      source: "db",
    });

    expect(findFirstMock).toHaveBeenCalledTimes(1);
    expect(findFirstMock).toHaveBeenCalledWith(FALLBACK_QUERY);
  });

  it("decrypts tokens stored at rest", async () => {
    vi.stubEnv("CREDENTIALS_ENCRYPTION_KEY", Buffer.alloc(32, 5).toString("base64"));
    findFirstMock.mockResolvedValueOnce({
      url: "http://active",
      token: encryptSecret("tok-secret"),
    });

    expect(await getResolvedStripstreamConfig(7, 42)).toEqual({
      url: "http://active",
      token: "tok-secret",
      source: "db",
    });
  });

  it("falls back to the environment when the user has no config", async () => {
    findFirstMock.mockResolvedValue(null);
    vi.stubEnv("STRIPSTREAM_URL", "http://env");
    vi.stubEnv("STRIPSTREAM_TOKEN", "envtok");

    expect(await getResolvedStripstreamConfig(7)).toEqual({
      url: "http://env",
      token: "envtok",
      source: "env",
    });
  });

  it("trims the environment values", async () => {
    findFirstMock.mockResolvedValue(null);
    vi.stubEnv("STRIPSTREAM_URL", "  http://env  ");
    vi.stubEnv("STRIPSTREAM_TOKEN", "  envtok  ");

    expect(await getResolvedStripstreamConfig(7)).toEqual({
      url: "http://env",
      token: "envtok",
      source: "env",
    });
  });

  it("returns null when there is neither a config nor a complete environment", async () => {
    findFirstMock.mockResolvedValue(null);
    vi.stubEnv("STRIPSTREAM_URL", "http://env");
    vi.stubEnv("STRIPSTREAM_TOKEN", "");

    expect(await getResolvedStripstreamConfig(7)).toBeNull();
  });

  it("returns null when nothing is configured at all", async () => {
    findFirstMock.mockResolvedValue(null);
    vi.stubEnv("STRIPSTREAM_URL", "");
    vi.stubEnv("STRIPSTREAM_TOKEN", "");

    expect(await getResolvedStripstreamConfig(7)).toBeNull();
    expect(findFirstMock).toHaveBeenCalledTimes(1);
  });
});
