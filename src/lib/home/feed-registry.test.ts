import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/services/favorite.service", () => ({
  FavoriteService: { listFavorites: vi.fn() },
}));

import { FavoriteService } from "@/lib/services/favorite.service";
import type { IMediaProvider } from "@/lib/providers/provider.interface";
import type {
  NormalizedBook,
  NormalizedReadingList,
  NormalizedSeries,
} from "@/lib/providers/types";
import { loadHomeFeedPage } from "./feed-registry";

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

function makeProvider(overrides: Partial<IMediaProvider> = {}): IMediaProvider {
  return {
    getHomeOngoingSeries: vi.fn(async () => []),
    getHomeLatestSeries: vi.fn(async () => []),
    getHomeRecentlyRead: vi.fn(async () => []),
    getRecommendations: vi.fn(async () => []),
    getReadingLists: vi.fn(async () => []),
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
    const provider = makeProvider({
      getHomeOngoingSeries: vi.fn(async () => seriesList(9)),
      getHomeLatestSeries: vi.fn(async () => seriesList(9)),
      getHomeRecentlyRead: vi.fn(async () => bookList(9)),
      getRecommendations: vi.fn(async () => seriesList(9)),
    });

    await loadHomeFeedPage(provider, "ongoing", 0);
    await loadHomeFeedPage(provider, "latest-series", 0);
    await loadHomeFeedPage(provider, "recently-read", 0);
    await loadHomeFeedPage(provider, "recommendations", 0);

    expect(provider.getHomeOngoingSeries).toHaveBeenCalledWith(9);
    expect(provider.getHomeLatestSeries).toHaveBeenCalledWith(9);
    expect(provider.getHomeRecentlyRead).toHaveBeenCalledWith(9);
    expect(provider.getRecommendations).toHaveBeenCalledWith(9);
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
    const provider = makeProvider({
      getReadingLists: vi.fn(async () => listList(10)),
    });

    const page = await loadHomeFeedPage(provider, "reading-lists", 0);

    expect(provider.getReadingLists).toHaveBeenCalledWith();
    expect(page.items).toHaveLength(8);
    expect(page.hasMore).toBe(true);
  });
});
