import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  komgaFindFirst,
  stripstreamFindFirst,
  getActiveConnectionMock,
  requireUserIdMock,
} = vi.hoisted(() => ({
  komgaFindFirst: vi.fn(),
  stripstreamFindFirst: vi.fn(),
  getActiveConnectionMock: vi.fn(),
  requireUserIdMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    komgaConfig: { findFirst: komgaFindFirst },
    stripstreamConfig: { findFirst: stripstreamFindFirst },
  },
}));

vi.mock("./active", () => ({ getActiveConnection: getActiveConnectionMock }));
vi.mock("@/lib/auth-utils", () => ({ requireUserId: requireUserIdMock }));

import {
  connectionFromDraft,
  getStoredConnection,
  requireConnectionForProvider,
  resolveActiveConnection,
  resolveConnectionForProvider,
} from "./resolve";
import { encryptSecret } from "@/lib/credentials";
import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError } from "@/utils/errors";

const KOMGA_ACTIVE_QUERY = {
  where: { id: 42, userId: 7 },
  select: { id: true, url: true, authHeader: true },
};

const KOMGA_FALLBACK_QUERY = {
  where: { userId: 7 },
  orderBy: { createdAt: "asc" as const },
  select: { id: true, url: true, authHeader: true },
};

const STRIPSTREAM_ACTIVE_QUERY = {
  where: { id: 42, userId: 7 },
  select: { id: true, url: true, token: true },
};

const STRIPSTREAM_FALLBACK_QUERY = {
  where: { userId: 7 },
  orderBy: { createdAt: "asc" as const },
  select: { id: true, url: true, token: true },
};

beforeEach(() => {
  vi.clearAllMocks();
  getActiveConnectionMock.mockResolvedValue({ provider: "komga", configId: 42 });
  requireUserIdMock.mockResolvedValue(7);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("resolveActiveConnection", () => {
  it("uses the selected Komga config and decrypts its auth header", async () => {
    vi.stubEnv("CREDENTIALS_ENCRYPTION_KEY", Buffer.alloc(32, 5).toString("base64"));
    komgaFindFirst.mockResolvedValueOnce({
      id: 42,
      url: "http://komga-active",
      authHeader: encryptSecret("alice:secret"),
    });

    expect(await resolveActiveConnection(7)).toEqual({
      provider: "komga",
      configId: 42,
      url: "http://komga-active",
      authHeader: "alice:secret",
    });
    expect(komgaFindFirst).toHaveBeenCalledTimes(1);
    expect(komgaFindFirst).toHaveBeenCalledWith(KOMGA_ACTIVE_QUERY);
  });

  it("falls back to the first Komga config when the selected id is unknown", async () => {
    komgaFindFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 9, url: "http://komga-first", authHeader: "plain" });

    expect(await resolveActiveConnection(7)).toEqual({
      provider: "komga",
      configId: 9,
      url: "http://komga-first",
      authHeader: "plain",
    });
    expect(komgaFindFirst).toHaveBeenNthCalledWith(1, KOMGA_ACTIVE_QUERY);
    expect(komgaFindFirst).toHaveBeenNthCalledWith(2, KOMGA_FALLBACK_QUERY);
  });

  it("uses the selected Stripstream config and decrypts its token", async () => {
    vi.stubEnv("CREDENTIALS_ENCRYPTION_KEY", Buffer.alloc(32, 6).toString("base64"));
    getActiveConnectionMock.mockResolvedValue({ provider: "stripstream", configId: 42 });
    stripstreamFindFirst.mockResolvedValueOnce({
      id: 42,
      url: "http://stream-active",
      token: encryptSecret("stream-token"),
    });

    expect(await resolveActiveConnection(7)).toEqual({
      provider: "stripstream",
      configId: 42,
      url: "http://stream-active",
      token: "stream-token",
      source: "db",
    });
    expect(stripstreamFindFirst).toHaveBeenCalledWith(STRIPSTREAM_ACTIVE_QUERY);
  });

  it("falls back to the environment for Stripstream", async () => {
    getActiveConnectionMock.mockResolvedValue({ provider: "stripstream", configId: 42 });
    stripstreamFindFirst.mockResolvedValue(null);
    vi.stubEnv("STRIPSTREAM_URL", "  http://env  ");
    vi.stubEnv("STRIPSTREAM_TOKEN", "  env-token  ");

    expect(await resolveActiveConnection(7)).toEqual({
      provider: "stripstream",
      configId: null,
      url: "http://env",
      token: "env-token",
      source: "env",
    });
  });

  it("returns null when neither a config nor a complete environment exists", async () => {
    getActiveConnectionMock.mockResolvedValue({ provider: "stripstream", configId: null });
    stripstreamFindFirst.mockResolvedValue(null);
    vi.stubEnv("STRIPSTREAM_URL", "http://env");
    vi.stubEnv("STRIPSTREAM_TOKEN", "");

    expect(await resolveActiveConnection(7)).toBeNull();
  });
});

describe("resolveConnectionForProvider", () => {
  it("uses the first config of the requested provider when another provider is active", async () => {
    stripstreamFindFirst.mockResolvedValueOnce({
      id: 12,
      url: "http://stream-first",
      token: "plain-token",
    });

    expect(await resolveConnectionForProvider("stripstream", 7)).toEqual({
      provider: "stripstream",
      configId: 12,
      url: "http://stream-first",
      token: "plain-token",
      source: "db",
    });
    expect(stripstreamFindFirst).toHaveBeenCalledTimes(1);
    expect(stripstreamFindFirst).toHaveBeenCalledWith(STRIPSTREAM_FALLBACK_QUERY);
  });
});

describe("getStoredConnection", () => {
  it("queries the exact id without falling back to the environment", async () => {
    stripstreamFindFirst.mockResolvedValue(null);
    vi.stubEnv("STRIPSTREAM_URL", "http://env");
    vi.stubEnv("STRIPSTREAM_TOKEN", "env-token");

    expect(await getStoredConnection("stripstream", 42, 7)).toBeNull();
    expect(stripstreamFindFirst).toHaveBeenCalledTimes(1);
    expect(stripstreamFindFirst).toHaveBeenCalledWith(STRIPSTREAM_ACTIVE_QUERY);
  });
});

describe("requireConnectionForProvider", () => {
  it("throws AUTH_UNAUTHENTICATED when there is no session", async () => {
    requireUserIdMock.mockRejectedValue(new AppError(ERROR_CODES.AUTH.UNAUTHENTICATED));

    await expect(requireConnectionForProvider("komga")).rejects.toMatchObject({
      code: ERROR_CODES.AUTH.UNAUTHENTICATED,
    });
  });

  it("throws the provider-specific missing-config error", async () => {
    komgaFindFirst.mockResolvedValue(null);

    try {
      await requireConnectionForProvider("komga");
      expect.unreachable("expected requireConnectionForProvider to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe(ERROR_CODES.KOMGA.MISSING_CONFIG);
    }
  });
});

describe("ad-hoc connections", () => {
  it("normalizes the Komga URL and builds the Basic auth value", () => {
    expect(connectionFromDraft({
        provider: "komga",
        url: " http://komga.local/// ",
        username: "alice",
        password: "secret",
      })).toEqual({
      provider: "komga",
      configId: null,
      url: "http://komga.local",
      authHeader: Buffer.from("alice:secret").toString("base64"),
    });
  });

  it("normalizes the Stripstream URL and trims the token", () => {
    expect(connectionFromDraft({
        provider: "stripstream",
        url: " http://stream.local/ ",
        token: "  token  ",
      })).toEqual({
      provider: "stripstream",
      configId: null,
      url: "http://stream.local",
      token: "token",
      source: "provided",
    });
  });
});
