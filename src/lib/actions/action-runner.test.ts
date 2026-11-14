import { beforeEach, describe, expect, it, vi } from "vitest";
import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError } from "@/utils/errors";
import {
  ACTION_OK,
  ActionError,
  runAction,
  runProviderAction,
} from "./action-runner";
import type { IMediaProvider } from "@/lib/providers/provider.interface";
import type { UserPreferences } from "@/types/preferences";

vi.mock("@/lib/providers/provider.factory", () => ({
  getProvider: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  requireUserId: vi.fn(),
  requireAdmin: vi.fn(),
}));

vi.mock("@/lib/services/preferences.service", () => ({
  PreferencesService: {
    getPreferences: vi.fn(),
  },
}));

vi.mock("@/lib/logger", () => ({
  default: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const { getProvider } = await import("@/lib/providers/provider.factory");
const { PreferencesService } = await import("@/lib/services/preferences.service");
const { requireAdmin, requireUserId } = await import("@/lib/auth/session");

const provider = {} as IMediaProvider;
const preferences = {
  anonymousMode: false,
} as UserPreferences;

beforeEach(() => {
  vi.mocked(getProvider).mockReset();
  vi.mocked(PreferencesService.getPreferences).mockReset();
  vi.mocked(getProvider).mockResolvedValue(provider);
  vi.mocked(PreferencesService.getPreferences).mockResolvedValue(preferences);
});

describe("runProviderAction", () => {
  it("resolves the provider, runs the mutation and invalidates once", async () => {
    const execute = vi.fn(async () => ({ message: "ok" }));
    const invalidate = vi.fn();

    const result = await runProviderAction({
      name: "test",
      fallbackCode: ERROR_CODES.SERIES.FETCH_ERROR,
      execute,
      invalidate,
    });

    expect(execute).toHaveBeenCalledWith({
      userId: null,
      preferences: null,
      provider,
    });
    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      success: true,
      code: ACTION_OK,
      message: "ok",
    });
  });

  it("returns flat success fields instead of nesting them under data", async () => {
    const result = await runProviderAction<{ updated: number; total: number }>({
      name: "test",
      fallbackCode: ERROR_CODES.BOOK.PROGRESS_UPDATE_ERROR,
      execute: async () => ({ message: "partial", updated: 2, total: 3 }),
    });

    expect(result).toMatchObject({
      success: true,
      message: "partial",
      updated: 2,
      total: 3,
    });
  });

  it("fails with a stable code when no provider is configured", async () => {
    vi.mocked(getProvider).mockResolvedValue(null);
    const execute = vi.fn();

    const result = await runProviderAction({
      name: "test",
      fallbackCode: ERROR_CODES.SERIES.FETCH_ERROR,
      execute,
    });

    expect(result).toMatchObject({
      success: false,
      code: ERROR_CODES.PROVIDER.NOT_CONFIGURED,
    });
    expect(execute).not.toHaveBeenCalled();
  });

  it("skips the mutation in anonymous mode without resolving the provider", async () => {
    vi.mocked(PreferencesService.getPreferences).mockResolvedValue({
      ...preferences,
      anonymousMode: true,
    });
    const execute = vi.fn();

    const result = await runProviderAction({
      name: "test",
      fallbackCode: ERROR_CODES.BOOK.PROGRESS_UPDATE_ERROR,
      skipAnonymous: { message: "ignored", data: { updated: 0, total: 0 } },
      execute,
    });

    expect(getProvider).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      success: true,
      message: "ignored",
      updated: 0,
      total: 0,
    });
  });

  it("maps AppError to its code and skips invalidation", async () => {
    const invalidate = vi.fn();

    const result = await runProviderAction({
      name: "test",
      fallbackCode: ERROR_CODES.SERIES.FETCH_ERROR,
      execute: async () => {
        throw new AppError(ERROR_CODES.SERIES.RATING_ERROR);
      },
      invalidate,
    });

    expect(result).toMatchObject({
      success: false,
      code: ERROR_CODES.SERIES.RATING_ERROR,
    });
    expect(invalidate).not.toHaveBeenCalled();
  });

  it("keeps partial progress from an ActionError", async () => {
    const result = await runProviderAction<{ updated: number; total: number }>({
      name: "test",
      fallbackCode: ERROR_CODES.BOOK.PROGRESS_UPDATE_ERROR,
      execute: async () => {
        throw new ActionError(
          ERROR_CODES.BOOK.PROGRESS_UPDATE_ERROR,
          { updated: 1, total: 3 },
          "Mise à jour partielle"
        );
      },
    });

    expect(result).toMatchObject({
      success: false,
      code: ERROR_CODES.BOOK.PROGRESS_UPDATE_ERROR,
      message: "Mise à jour partielle",
      updated: 1,
      total: 3,
    });
  });

  it("uses the fallback code and failure data for an unexpected error", async () => {
    const result = await runProviderAction<{ jobId: string | null; forbidden?: boolean }>({
      name: "test",
      fallbackCode: ERROR_CODES.LIBRARY.SCAN_ERROR,
      execute: async () => {
        throw new Error("boom");
      },
      failureData: () => ({ jobId: null }),
    });

    expect(result).toMatchObject({
      success: false,
      code: ERROR_CODES.LIBRARY.SCAN_ERROR,
      jobId: null,
    });
  });
});

describe("runAction", () => {
  it("does not resolve a provider and still maps errors", async () => {
    const result = await runAction({
      name: "test",
      fallbackCode: ERROR_CODES.FAVORITE.ADD_ERROR,
      execute: async () => {
        throw new AppError(ERROR_CODES.AUTH.UNAUTHENTICATED);
      },
    });

    expect(getProvider).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      success: false,
      code: ERROR_CODES.AUTH.UNAUTHENTICATED,
    });
  });

  it("requires a session and applies the rate-limit gate before executing", async () => {
    vi.mocked(requireUserId).mockResolvedValue(7);
    const key = `test-rate-${Date.now()}-${Math.random()}`;
    const execute = vi.fn(async () => ({ message: "ok" }));
    const options = {
      name: "test",
      fallbackCode: ERROR_CODES.CONFIG.TEST_ERROR,
      requireUser: true,
      rateLimit: {
        key: () => key,
        limit: 1,
        windowMs: 60_000,
        message: (seconds: number) => `retry in ${seconds}s`,
      },
      execute,
    };

    const first = await runAction(options);
    const second = await runAction(options);

    expect(first).toMatchObject({ success: true });
    expect(second).toMatchObject({
      success: false,
      code: ERROR_CODES.AUTH.RATE_LIMITED,
      message: expect.stringMatching(/^retry in /),
    });
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("uses a custom fallback message for unexpected errors", async () => {
    const result = await runAction({
      name: "test",
      fallbackCode: ERROR_CODES.CONFIG.SAVE_ERROR,
      fallbackMessage: "Erreur personnalisée",
      execute: async () => {
        throw new Error("boom");
      },
    });

    expect(result).toMatchObject({
      success: false,
      code: ERROR_CODES.CONFIG.SAVE_ERROR,
      message: "Erreur personnalisée",
    });
  });
});

describe("runAction admin gate", () => {
  const admin = { id: "3", email: "admin@example.com", roles: ["ROLE_ADMIN"], authenticated: true };

  beforeEach(() => {
    vi.mocked(requireAdmin).mockReset();
    vi.mocked(requireUserId).mockReset();
  });

  it("runs the action with the admin id when the caller is an admin", async () => {
    vi.mocked(requireAdmin).mockResolvedValue(admin);
    const execute = vi.fn(async () => ({ message: "ok" }));

    const result = await runAction({
      name: "test",
      fallbackCode: ERROR_CODES.ADMIN.UPDATE_USER_ERROR,
      requireRole: "admin",
      execute,
    });

    expect(result).toMatchObject({ success: true, code: ACTION_OK });
    expect(requireUserId).not.toHaveBeenCalled();
    expect(execute).toHaveBeenCalledWith({ userId: 3, preferences: null, provider: null });
  });

  it.each([
    ["an anonymous caller", ERROR_CODES.AUTH.UNAUTHENTICATED],
    ["a non-admin user", ERROR_CODES.AUTH.FORBIDDEN],
  ])("refuses %s before the rate limit, the guard and the mutation", async (_who, code) => {
    vi.mocked(requireAdmin).mockRejectedValue(new AppError(code));
    const execute = vi.fn(async () => ({ message: "ok" }));
    const guard = vi.fn();
    const key = vi.fn(() => `admin-gate-${Date.now()}-${Math.random()}`);

    const result = await runAction({
      name: "test",
      fallbackCode: ERROR_CODES.ADMIN.UPDATE_USER_ERROR,
      requireRole: "admin",
      rateLimit: { key, limit: 1, windowMs: 60_000 },
      guard,
      execute,
    });

    expect(result).toMatchObject({ success: false, code });
    expect(key).not.toHaveBeenCalled();
    expect(guard).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
  });

  it("keys the rate limit on the admin id", async () => {
    vi.mocked(requireAdmin).mockResolvedValue(admin);
    const key = vi.fn(({ userId }: { userId: number }) => `admin-rate-${userId}-${Math.random()}`);

    await runAction({
      name: "test",
      fallbackCode: ERROR_CODES.ADMIN.RESET_PASSWORD_ERROR,
      requireRole: "admin",
      rateLimit: { key, limit: 1, windowMs: 60_000 },
      execute: async () => ({ message: "ok" }),
    });

    expect(key).toHaveBeenCalledWith({ userId: 3 });
  });
});

describe("runAction identity", () => {
  beforeEach(() => {
    vi.mocked(requireUserId).mockReset();
    vi.mocked(requireAdmin).mockReset();
  });

  it("hands the gated user id to execute", async () => {
    vi.mocked(requireUserId).mockResolvedValue(11);
    const seen: number[] = [];

    const result = await runAction({
      name: "test",
      fallbackCode: ERROR_CODES.PREFERENCES.UPDATE_ERROR,
      requireUser: true,
      // `userId` est typé `number` : aucune assertion n'est nécessaire.
      execute: async ({ userId }) => {
        seen.push(userId);
        return { message: "ok" };
      },
    });

    expect(result.success).toBe(true);
    expect(seen).toEqual([11]);
  });

  it("refuses before execute when the gate finds no session", async () => {
    vi.mocked(requireUserId).mockRejectedValue(new AppError(ERROR_CODES.AUTH.UNAUTHENTICATED));
    const execute = vi.fn();

    const result = await runAction({
      name: "test",
      fallbackCode: ERROR_CODES.FAVORITE.ADD_ERROR,
      requireUser: true,
      execute,
    });

    expect(result).toMatchObject({ success: false, code: ERROR_CODES.AUTH.UNAUTHENTICATED });
    expect(execute).not.toHaveBeenCalled();
  });

  it("resolves the user itself to read the anonymous preference", async () => {
    vi.mocked(requireUserId).mockResolvedValue(5);

    await runProviderAction({
      name: "test",
      fallbackCode: ERROR_CODES.BOOK.PROGRESS_UPDATE_ERROR,
      skipAnonymous: { message: "ignored" },
      execute: async () => ({ message: "ok" }),
    });

    expect(PreferencesService.getPreferences).toHaveBeenCalledWith(5);
  });
});
