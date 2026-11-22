import { beforeEach, describe, expect, it, vi } from "vitest";
import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError } from "@/utils/errors";
import { defaultPreferences } from "@/types/preferences";

const { requireUserId, invalidatePreferences, updatePreferencesService } = vi.hoisted(() => ({
  requireUserId: vi.fn(),
  invalidatePreferences: vi.fn(),
  updatePreferencesService: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ requireUserId, requireAdmin: vi.fn() }));
vi.mock("@/lib/cache/invalidation", () => ({ invalidatePreferences }));
vi.mock("@/lib/prisma", () => ({ default: {} }));
vi.mock("@/lib/providers/provider.factory", () => ({ getProvider: vi.fn() }));
vi.mock("@/lib/services/preferences.service", () => ({
  PreferencesService: {
    getPreferences: vi.fn(),
    updatePreferences: updatePreferencesService,
  },
}));
vi.mock("@/lib/logger", () => ({
  default: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const { updatePreferences } = await import("./preferences");

let nextUserId = 600;

beforeEach(() => {
  vi.clearAllMocks();
  requireUserId.mockResolvedValue(nextUserId++);
  updatePreferencesService.mockResolvedValue(defaultPreferences);
});

describe("updatePreferences", () => {
  it("hands the written patch to the invalidation recipe", async () => {
    const patch = { displayMode: { itemsPerPage: 60 } };

    await expect(updatePreferences(patch)).resolves.toMatchObject({ success: true });

    expect(invalidatePreferences).toHaveBeenCalledWith(patch);
    expect(updatePreferencesService).toHaveBeenCalledWith(
      expect.any(Number),
      expect.objectContaining({ displayMode: { itemsPerPage: 60 } })
    );
  });

  it("does not invalidate an anonymous-mode-only write", async () => {
    await expect(updatePreferences({ anonymousMode: true })).resolves.toMatchObject({
      success: true,
    });

    expect(invalidatePreferences).not.toHaveBeenCalled();
  });

  it("does not invalidate when the session gate refuses", async () => {
    requireUserId.mockRejectedValue(new AppError(ERROR_CODES.AUTH.UNAUTHENTICATED));

    await expect(updatePreferences({ showOnlyUnread: true })).resolves.toMatchObject({
      success: false,
      code: ERROR_CODES.AUTH.UNAUTHENTICATED,
    });

    expect(invalidatePreferences).not.toHaveBeenCalled();
    expect(updatePreferencesService).not.toHaveBeenCalled();
  });

  it("does not invalidate when the write fails", async () => {
    updatePreferencesService.mockRejectedValue(
      new AppError(ERROR_CODES.PREFERENCES.UPDATE_ERROR)
    );

    await expect(updatePreferences({ showOnlyUnread: true })).resolves.toMatchObject({
      success: false,
    });

    expect(invalidatePreferences).not.toHaveBeenCalled();
  });
});
