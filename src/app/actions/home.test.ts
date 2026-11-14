import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/providers/provider.factory", () => ({ getProvider: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ requireUserId: vi.fn(async () => 7) }));
vi.mock("@/lib/services/preferences.service", () => ({
  PreferencesService: { getPreferences: vi.fn() },
}));
vi.mock("@/lib/logger", () => ({ default: { warn: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/home/home-feeds", () => ({ loadNextHomeFeedPage: vi.fn() }));

import { ERROR_CODES } from "@/constants/errorCodes";
import { getProvider } from "@/lib/providers/provider.factory";
import { requireUserId } from "@/lib/auth/session";
import { PreferencesService } from "@/lib/services/preferences.service";
import { loadNextHomeFeedPage } from "@/lib/home/home-feeds";
import type { IMediaProvider } from "@/lib/providers/provider.interface";
import type { UserPreferences } from "@/types/preferences";
import { loadContinueReading, loadHomeFeed } from "./home";

const provider = { id: "provider" } as unknown as IMediaProvider;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireUserId).mockResolvedValue(7);
  vi.mocked(PreferencesService.getPreferences).mockResolvedValue({
    anonymousMode: false,
  } as UserPreferences);
});

describe("loadHomeFeed", () => {
  it("fails with a stable code when no provider is active", async () => {
    vi.mocked(getProvider).mockResolvedValue(null);

    const result = await loadHomeFeed("ongoing", 0);

    expect(result).toMatchObject({
      success: false,
      code: ERROR_CODES.PROVIDER.NOT_CONFIGURED,
    });
    expect(loadNextHomeFeedPage).not.toHaveBeenCalled();
  });

  it("delegates to the home policy with the viewer context", async () => {
    vi.mocked(getProvider).mockResolvedValue(provider);
    vi.mocked(PreferencesService.getPreferences).mockResolvedValue({
      anonymousMode: true,
    } as UserPreferences);
    vi.mocked(loadNextHomeFeedPage).mockResolvedValue({
      items: [{ id: "series-1" }],
      hasMore: true,
    } as Awaited<ReturnType<typeof loadNextHomeFeedPage>>);

    const result = await loadHomeFeed("favorites", 8);

    expect(result).toMatchObject({
      success: true,
      items: [{ id: "series-1" }],
      hasMore: true,
    });
    expect(loadNextHomeFeedPage).toHaveBeenCalledWith(provider, "favorites", 8, {
      isAnonymous: true,
      userId: 7,
    });
    expect(PreferencesService.getPreferences).toHaveBeenCalledWith(7);
  });

  it("maps a provider failure to an ActionResult instead of throwing", async () => {
    vi.mocked(getProvider).mockResolvedValue(provider);
    vi.mocked(loadNextHomeFeedPage).mockRejectedValue(new Error("provider down"));

    const result = await loadHomeFeed("latest-series", 8);

    expect(result).toMatchObject({
      success: false,
      code: ERROR_CODES.HOME.FETCH_ERROR,
    });
  });
});

describe("home offset validation", () => {
  it.each([1e9, Number.NaN, -1, 1.5, 1001, Number.POSITIVE_INFINITY])(
    "rejects the offset %s without querying the provider",
    async (offset) => {
      vi.mocked(getProvider).mockResolvedValue(provider);

      const [feed, hero] = await Promise.all([
        loadHomeFeed("latest-series", offset),
        loadContinueReading(offset),
      ]);

      for (const result of [feed, hero]) {
        expect(result).toMatchObject({ success: false, code: ERROR_CODES.HOME.INVALID_OFFSET });
      }
      expect(loadNextHomeFeedPage).not.toHaveBeenCalled();
    }
  );

  it("accepts the documented ceiling", async () => {
    vi.mocked(getProvider).mockResolvedValue(provider);
    vi.mocked(loadNextHomeFeedPage).mockResolvedValue({ items: [], hasMore: false });

    await expect(loadHomeFeed("latest-series", 1000)).resolves.toMatchObject({ success: true });
  });
});

describe("loadContinueReading", () => {
  it("routes the hero through the same policy", async () => {
    vi.mocked(getProvider).mockResolvedValue(provider);
    vi.mocked(loadNextHomeFeedPage).mockResolvedValue({ items: [], hasMore: false });

    const result = await loadContinueReading(8);

    expect(result).toMatchObject({ success: true, items: [], hasMore: false });
    expect(loadNextHomeFeedPage).toHaveBeenCalledWith(
      provider,
      "continue-reading",
      8,
      { isAnonymous: false, userId: 7 }
    );
  });
});
