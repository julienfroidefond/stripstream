import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/services/favorite.service", () => ({
  FavoriteService: { listFavorites: vi.fn() },
}));
vi.mock("@/lib/logger", () => ({ default: { warn: vi.fn(), error: vi.fn() } }));

import { FavoriteService } from "@/lib/services/favorite.service";
import {
  createProviderCapabilities,
  type IMediaProvider,
  type ProviderCapabilities,
} from "@/lib/providers/provider.interface";
import type {
  NormalizedBook,
  NormalizedReadingList,
  NormalizedSeries,
} from "@/lib/providers/types";
import { HOME_FEEDS, homeFeedPolicy, loadHomeFeedPage } from "./feed-registry";
import { loadHomeFeeds, loadNextHomeFeedPage } from "./home-feeds";

function series(id: string): NormalizedSeries {
  return {
    id,
    name: `Série ${id}`,
    bookCount: 3,
    booksReadCount: 1,
    thumbnailUrl: `/series/${id}.jpg`,
  };
}

function book(id: string): NormalizedBook {
  return {
    id,
    libraryId: "library",
    title: `Tome ${id}`,
    number: "1",
    seriesId: null,
    seriesName: null,
    volume: 1,
    pageCount: 10,
    thumbnailUrl: `/books/${id}.jpg`,
    media: {
      pageUrlTemplate: `/books/${id}/pages/{page}`,
      thumbnailUrlTemplate: `/books/${id}/pages/{page}/thumbnail`,
    },
    readProgress: null,
  };
}

function readingList(id: string): NormalizedReadingList {
  return {
    id,
    name: `Liste ${id}`,
    description: null,
    seriesCount: 1,
    bookCount: 1,
    booksReadCount: 0,
    previewCovers: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function seriesList(count: number): NormalizedSeries[] {
  return Array.from({ length: count }, (_, index) => series(String(index)));
}

function bookList(count: number): NormalizedBook[] {
  return Array.from({ length: count }, (_, index) => book(String(index)));
}

function listList(count: number): NormalizedReadingList[] {
  return Array.from({ length: count }, (_, index) => readingList(String(index)));
}

function makeProvider(
  overrides: Partial<IMediaProvider> = {},
  capabilities: Partial<ProviderCapabilities> = {}
): IMediaProvider {
  return {
    getHomeOngoingSeries: vi.fn(async () => []),
    getHomeLatestSeries: vi.fn(async () => []),
    getHomeRecentlyRead: vi.fn(async () => []),
    getHomeContinueReadingData: vi.fn(async () => ({ onDeck: [], ongoingBooks: [] })),
    getSeriesById: vi.fn(async (id: string) => series(id)),
    capabilities: createProviderCapabilities(capabilities),
    ...overrides,
  } as unknown as IMediaProvider;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(FavoriteService.listFavorites).mockResolvedValue([]);
});

describe("loadHomeFeedPage — offset feeds", () => {
  it("asks for one probe item and returns the first page", async () => {
    const provider = makeProvider({
      getHomeOngoingSeries: vi.fn(async () => seriesList(9)),
    });

    const page = await loadHomeFeedPage(provider, "ongoing", 0);

    expect(provider.getHomeOngoingSeries).toHaveBeenCalledWith(9);
    expect(page.items.map((item) => item.id)).toEqual([
      "0",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
    ]);
    expect(page.hasMore).toBe(true);
  });

  it("pages from the requested offset", async () => {
    const provider = makeProvider({
      getHomeLatestSeries: vi.fn(async () => seriesList(17)),
    });

    const page = await loadHomeFeedPage(provider, "latest-series", 8);

    expect(provider.getHomeLatestSeries).toHaveBeenCalledWith(17);
    expect(page.items.map((item) => item.id)).toEqual([
      "8",
      "9",
      "10",
      "11",
      "12",
      "13",
      "14",
      "15",
    ]);
    expect(page.hasMore).toBe(true);
  });

  it("returns a short last page without hasMore", async () => {
    const provider = makeProvider({
      getHomeRecentlyRead: vi.fn(async () => bookList(9)),
    });

    const page = await loadHomeFeedPage(provider, "recently-read", 8);

    expect(provider.getHomeRecentlyRead).toHaveBeenCalledWith(17);
    expect(page.items.map((item) => item.id)).toEqual(["8"]);
    expect(page.hasMore).toBe(false);
  });

  it("clamps a negative offset to the first page", async () => {
    const provider = makeProvider({
      getHomeOngoingSeries: vi.fn(async () => seriesList(9)),
    });

    const page = await loadHomeFeedPage(provider, "ongoing", -3);

    expect(provider.getHomeOngoingSeries).toHaveBeenCalledWith(9);
    expect(page.items[0]?.id).toBe("0");
  });

  it("routes each offset feed to its own provider loader", async () => {
    const recommendations = vi.fn(async () => seriesList(9));
    const provider = makeProvider(
      {
        getHomeOngoingSeries: vi.fn(async () => seriesList(9)),
        getHomeLatestSeries: vi.fn(async () => seriesList(9)),
        getHomeRecentlyRead: vi.fn(async () => bookList(9)),
      },
      {
        discovery: {
          getRelatedSeries: vi.fn(async () => []),
          getRecommendations: recommendations,
        },
      }
    );

    await loadHomeFeedPage(provider, "ongoing", 0);
    await loadHomeFeedPage(provider, "latest-series", 0);
    await loadHomeFeedPage(provider, "recently-read", 0);
    await loadHomeFeedPage(provider, "recommendations", 0);

    expect(provider.getHomeOngoingSeries).toHaveBeenCalledWith(9);
    expect(provider.getHomeLatestSeries).toHaveBeenCalledWith(9);
    expect(provider.getHomeRecentlyRead).toHaveBeenCalledWith(9);
    expect(recommendations).toHaveBeenCalledWith(9);
  });
});

describe("loadHomeFeedPage — bounded collection feeds", () => {
  it("bounds favorites to the requested page", async () => {
    vi.mocked(FavoriteService.listFavorites).mockResolvedValue(seriesList(10));
    const provider = makeProvider();

    const page = await loadHomeFeedPage(provider, "favorites", 0);

    expect(FavoriteService.listFavorites).toHaveBeenCalledWith();
    expect(page.items).toHaveLength(8);
    expect(page.hasMore).toBe(true);
  });

  it("returns the next favorites page", async () => {
    vi.mocked(FavoriteService.listFavorites).mockResolvedValue(seriesList(10));

    const page = await loadHomeFeedPage(makeProvider(), "favorites", 8);

    expect(page.items.map((item) => item.id)).toEqual(["8", "9"]);
    expect(page.hasMore).toBe(false);
  });

  it("bounds reading lists without asking the provider for a limit", async () => {
    const getReadingLists = vi.fn(async () => listList(10));
    const provider = makeProvider(
      {},
      {
        readingLists: {
          getReadingLists,
          getReadingListDetail: vi.fn(async () => null),
        },
      }
    );

    const page = await loadHomeFeedPage(provider, "reading-lists", 0);

    expect(getReadingLists).toHaveBeenCalledWith();
    expect(page.items).toHaveLength(8);
    expect(page.hasMore).toBe(true);
  });
});

describe("registry policy", () => {
  it("declares a policy for every row feed", () => {
    for (const feed of HOME_FEEDS) {
      expect(homeFeedPolicy(feed).onFailure).toBe("empty");
    }
    expect(homeFeedPolicy("ongoing").anonymous).toBe("hide");
    expect(homeFeedPolicy("favorites")).toMatchObject({
      anonymous: "load",
      countsTowardOutage: false,
    });
    expect(homeFeedPolicy("recommendations").initial).toBe("deferred");
  });
});

function failing(): () => Promise<never> {
  return vi.fn(async () => {
    throw new Error("provider down");
  });
}

describe("loadHomeFeeds — anonymous mode", () => {
  it("does not query hidden feeds and settles them as hidden", async () => {
    const provider = makeProvider({
      getHomeLatestSeries: vi.fn(async () => seriesList(2)),
    });

    const { feeds, outage } = loadHomeFeeds(provider, { isAnonymous: true });

    expect(provider.getHomeOngoingSeries).not.toHaveBeenCalled();
    expect(provider.getHomeContinueReadingData).not.toHaveBeenCalled();
    await expect(feeds.ongoing).resolves.toEqual({
      status: "hidden",
      page: { items: [], hasMore: false },
    });
    await expect(feeds["continue-reading"]).resolves.toMatchObject({
      status: "hidden",
    });
    await expect(feeds.recommendations).resolves.toMatchObject({
      status: "hidden",
    });
    await expect(feeds["latest-series"]).resolves.toMatchObject({
      status: "loaded",
      page: { items: seriesList(2), hasMore: false },
    });
    await expect(outage).resolves.toBe(false);
  });

  it("returns an empty next page for a hidden feed without a request", async () => {
    const provider = makeProvider();

    await expect(
      loadNextHomeFeedPage(provider, "continue-reading", 8, { isAnonymous: true })
    ).resolves.toEqual({ items: [], hasMore: false });
    expect(provider.getHomeContinueReadingData).not.toHaveBeenCalled();
  });

  it("loads the next page of a visible feed", async () => {
    const provider = makeProvider({
      getHomeLatestSeries: vi.fn(async () => seriesList(10)),
    });

    const page = await loadNextHomeFeedPage(provider, "latest-series", 8, {
      isAnonymous: true,
    });

    expect(page.items.map((item) => item.id)).toEqual(["8", "9"]);
  });
});

describe("loadHomeFeeds — failures", () => {
  it("renders a failing feed empty and keeps the others", async () => {
    const provider = makeProvider({
      getHomeOngoingSeries: vi.fn(async () => [series("s1")]),
      getHomeLatestSeries: failing(),
      getHomeContinueReadingData: vi.fn(async () => ({
        onDeck: [{ ...book("b1"), seriesId: "s1" }],
        ongoingBooks: [],
      })),
    });

    const { feeds, outage } = loadHomeFeeds(provider, { isAnonymous: false });

    await expect(feeds["latest-series"]).resolves.toEqual({
      status: "failed",
      page: { items: [], hasMore: false },
    });
    const hero = await feeds["continue-reading"];
    expect(hero.status).toBe("loaded");
    expect(hero.page.items[0]?.series?.id).toBe("s1");
    // Le hero réutilise le pool « ongoing » déjà chargé.
    expect(provider.getHomeOngoingSeries).toHaveBeenCalledTimes(1);
    await expect(feeds.recommendations).resolves.toMatchObject({
      status: "deferred",
    });
    await expect(outage).resolves.toBe(false);
  });

  it("reports an outage when every counted feed failed", async () => {
    vi.mocked(FavoriteService.listFavorites).mockResolvedValue(seriesList(2));
    const provider = makeProvider({
      getHomeOngoingSeries: failing(),
      getHomeLatestSeries: failing(),
      getHomeRecentlyRead: failing(),
      getHomeContinueReadingData: failing(),
    }, {
      readingLists: {
        getReadingLists: failing(),
        getReadingListDetail: vi.fn(async () => null),
      },
    });

    const { feeds, outage } = loadHomeFeeds(provider, { isAnonymous: false });

    await expect(outage).resolves.toBe(true);
    // Les favoris ne masquent pas la panne du provider, mais restent rendus.
    await expect(feeds.favorites).resolves.toMatchObject({
      status: "loaded",
      page: { items: seriesList(2) },
    });
  });

  it("does not report an outage when only favorites failed", async () => {
    vi.mocked(FavoriteService.listFavorites).mockRejectedValue(new Error("db"));
    const provider = makeProvider();

    const { feeds, outage } = loadHomeFeeds(provider, { isAnonymous: false });

    await expect(feeds.favorites).resolves.toMatchObject({ status: "failed" });
    await expect(outage).resolves.toBe(false);
  });

  it("counts only visible feeds in anonymous mode", async () => {
    const provider = makeProvider({
      getHomeLatestSeries: failing(),
      getHomeRecentlyRead: failing(),
    });

    const { outage } = loadHomeFeeds(provider, { isAnonymous: true });

    // Sans capacité de listes, la rangée se charge vide : pas de panne totale.
    await expect(outage).resolves.toBe(false);

    const allDown = makeProvider(
      { getHomeLatestSeries: failing(), getHomeRecentlyRead: failing() },
      {
        readingLists: {
          getReadingLists: failing(),
          getReadingListDetail: vi.fn(async () => null),
        },
      }
    );
    await expect(
      loadHomeFeeds(allDown, { isAnonymous: true }).outage
    ).resolves.toBe(true);
  });
});
