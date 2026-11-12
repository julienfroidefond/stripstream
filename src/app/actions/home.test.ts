import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/providers/provider.factory", () => ({ getProvider: vi.fn() }));
vi.mock("@/lib/home/feed-registry", () => ({ loadHomeFeedPage: vi.fn() }));

import { getProvider } from "@/lib/providers/provider.factory";
import { loadHomeFeedPage } from "@/lib/home/feed-registry";
import type { IMediaProvider } from "@/lib/providers/provider.interface";
import { loadHomeFeed } from "./home";

const provider = { id: "provider" } as unknown as IMediaProvider;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("loadHomeFeed", () => {
  it("returns an empty page when no provider is active", async () => {
    vi.mocked(getProvider).mockResolvedValue(null);

    await expect(loadHomeFeed("ongoing", 0)).resolves.toEqual({
      items: [],
      hasMore: false,
    });
    expect(loadHomeFeedPage).not.toHaveBeenCalled();
  });

  it("delegates to the feed registry with the resolved provider", async () => {
    const page = { items: [{ id: "series-1" }], hasMore: true };
    vi.mocked(getProvider).mockResolvedValue(provider);
    vi.mocked(loadHomeFeedPage).mockResolvedValue(
      page as Awaited<ReturnType<typeof loadHomeFeedPage>>
    );

    await expect(loadHomeFeed("favorites", 8)).resolves.toBe(page);
    expect(loadHomeFeedPage).toHaveBeenCalledWith(provider, "favorites", 8);
  });
});
