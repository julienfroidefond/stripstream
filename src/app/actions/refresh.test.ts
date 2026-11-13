import { beforeEach, describe, expect, it, vi } from "vitest";
import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError } from "@/utils/errors";

const { requireUserId, invalidateForRefresh } = vi.hoisted(() => ({
  requireUserId: vi.fn(),
  invalidateForRefresh: vi.fn(),
}));

vi.mock("@/lib/auth-utils", () => ({ requireUserId, requireAdmin: vi.fn() }));
vi.mock("@/lib/cache/invalidation", () => ({ invalidateForRefresh }));
vi.mock("@/lib/prisma", () => ({ default: {} }));
vi.mock("@/lib/providers/provider.factory", () => ({ getProvider: vi.fn() }));
vi.mock("@/lib/services/preferences.service", () => ({
  PreferencesService: { getPreferences: vi.fn() },
}));
vi.mock("@/lib/logger", () => ({
  default: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const { revalidateForRefresh } = await import("./refresh");
const { REFRESH_RATE_LIMIT } = await import("@/lib/cache/refresh-target");

let nextUserId = 100;

beforeEach(() => {
  vi.clearAllMocks();
  requireUserId.mockResolvedValue(nextUserId++);
});

describe("revalidateForRefresh", () => {
  it("requires a session before invalidating anything", async () => {
    requireUserId.mockRejectedValue(new AppError(ERROR_CODES.AUTH.UNAUTHENTICATED));

    await expect(revalidateForRefresh("series", "s-1")).resolves.toMatchObject({
      success: false,
      code: ERROR_CODES.AUTH.UNAUTHENTICATED,
    });
    expect(invalidateForRefresh).not.toHaveBeenCalled();
  });

  it("invalidates a valid target", async () => {
    await expect(revalidateForRefresh("series", "0F8ZK1")).resolves.toMatchObject({
      success: true,
    });
    expect(invalidateForRefresh).toHaveBeenCalledWith("series", "0F8ZK1");
  });

  it.each([
    ["unknown scope", "everything", "x"],
    ["path traversal", "library", "../admin"],
    ["nested segment", "series", "a/b"],
    ["empty id", "book", ""],
    ["non-string id", "book", 42],
  ])("rejects an invalid target (%s)", async (_label, scope, id) => {
    await expect(
      revalidateForRefresh(scope as "series", id as string)
    ).resolves.toMatchObject({ success: false, code: ERROR_CODES.REFRESH.INVALID_TARGET });
    expect(invalidateForRefresh).not.toHaveBeenCalled();
  });

  it("accepts the home scope whatever its id", async () => {
    await expect(revalidateForRefresh("home", "home")).resolves.toMatchObject({ success: true });
  });

  it("rate-limits refreshes per user", async () => {
    requireUserId.mockResolvedValue(9_999);
    const codes: string[] = [];
    for (let i = 0; i <= REFRESH_RATE_LIMIT.limit; i++) {
      codes.push((await revalidateForRefresh("home", "home")).code);
    }

    expect(codes.slice(0, REFRESH_RATE_LIMIT.limit).every((code) => code === "OK")).toBe(true);
    expect(codes[REFRESH_RATE_LIMIT.limit]).toBe(ERROR_CODES.AUTH.RATE_LIMITED);
  });
});
