import { beforeEach, describe, expect, it, vi } from "vitest";

// Le module s'amorce via le registre, qui importe le service de favoris : le
// mock coupe la chaîne Next/Auth sans rapport avec ce test.
vi.mock("@/lib/services/favorite.service", () => ({
  FavoriteService: { listFavorites: vi.fn() },
}));

import type { IMediaProvider } from "@/lib/providers/provider.interface";
import type { NormalizedBook, NormalizedSeries } from "@/lib/providers/types";
import type { HomePrimaryData } from "@/types/home";
import { loadContinueReadingPage } from "./continue-reading-feed";

type ContinueReadingData = Pick<HomePrimaryData, "ongoingBooks" | "onDeck">;

function series(
  id: string,
  overrides: Partial<NormalizedSeries> = {}
): NormalizedSeries {
  return {
    id,
    name: `Série ${id}`,
    bookCount: 5,
    booksReadCount: 1,
    thumbnailUrl: `/series/${id}.jpg`,
    ...overrides,
  };
}

function book(
  id: string,
  overrides: Partial<NormalizedBook> = {}
): NormalizedBook {
  return {
    id,
    libraryId: "lib-1",
    title: `Tome ${id}`,
    number: id,
    seriesId: "s1",
    seriesName: null,
    volume: null,
    pageCount: 100,
    thumbnailUrl: `/books/${id}.jpg`,
    media: {
      pageUrlTemplate: `/books/${id}/pages/{page}`,
      thumbnailUrlTemplate: `/books/${id}/pages/{page}/thumbnail`,
    },
    readProgress: null,
    ...overrides,
  };
}

function books(count: number, prefix = "book"): NormalizedBook[] {
  return Array.from({ length: count }, (_, index) =>
    book(`${prefix}-${index}`)
  );
}

function source(
  onDeck: NormalizedBook[] = [],
  ongoingBooks: NormalizedBook[] = []
): ContinueReadingData {
  return { onDeck, ongoingBooks };
}

function makeProvider(
  data: ContinueReadingData,
  overrides: Partial<IMediaProvider> = {}
) {
  return {
    getHomeContinueReadingData: vi.fn(async () => data),
    getHomeOngoingSeries: vi.fn(async () => [] as NormalizedSeries[]),
    getSeriesById: vi.fn(async (id: string) => series(id)),
    getSeries: vi.fn(async () => ({ items: [], nextCursor: null })),
    ...overrides,
  } as unknown as IMediaProvider;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("loadContinueReadingPage — pagination policy", () => {
  it("probes one item past the first page", async () => {
    const provider = makeProvider(source([], books(20)));

    const page = await loadContinueReadingPage(provider, 0, {
      knownSeries: [],
    });

    expect(provider.getHomeContinueReadingData).toHaveBeenCalledWith(9);
    expect(page.items).toHaveLength(8);
    expect(page.hasMore).toBe(true);
  });

  it("probes from the requested offset", async () => {
    const provider = makeProvider(source([], books(30)));

    const page = await loadContinueReadingPage(provider, 8, {
      knownSeries: [],
    });

    expect(provider.getHomeContinueReadingData).toHaveBeenCalledWith(17);
    expect(page.items.map((item) => item.book.id)).toEqual([
      "book-8",
      "book-9",
      "book-10",
      "book-11",
      "book-12",
      "book-13",
      "book-14",
      "book-15",
    ]);
    expect(page.hasMore).toBe(true);
  });

  it("reports the last page when the probe finds no extra item", async () => {
    const provider = makeProvider(source([], books(16)));

    const page = await loadContinueReadingPage(provider, 8, {
      knownSeries: [],
    });

    expect(page.items).toHaveLength(8);
    expect(page.hasMore).toBe(false);
  });

  it("merges on-deck before ongoing books without duplicates", async () => {
    const provider = makeProvider(
      source([book("a"), book("b")], [book("b"), book("c")])
    );

    const page = await loadContinueReadingPage(provider, 0, {
      knownSeries: [series("s1")],
    });

    expect(page.items.map((item) => item.book.id)).toEqual(["a", "b", "c"]);
  });

  it("accepts a smaller page size", async () => {
    const provider = makeProvider(source([], books(10)));

    const page = await loadContinueReadingPage(provider, 0, {
      knownSeries: [series("s1")],
      pageSize: 2,
    });

    expect(provider.getHomeContinueReadingData).toHaveBeenCalledWith(3);
    expect(page.items).toHaveLength(2);
    expect(page.hasMore).toBe(true);
  });

  it("returns an empty page without resolving any series", async () => {
    const provider = makeProvider(source());

    const page = await loadContinueReadingPage(provider, 0, {
      knownSeries: [],
    });

    expect(page).toEqual({ items: [], hasMore: false });
    expect(provider.getSeriesById).not.toHaveBeenCalled();
  });
});

describe("loadContinueReadingPage — series pool", () => {
  it("reuses a known series without asking the provider", async () => {
    const provider = makeProvider(
      source([book("a", { seriesId: "s1" })], [])
    );

    const page = await loadContinueReadingPage(provider, 0, {
      knownSeries: [series("s1")],
    });

    expect(provider.getSeriesById).not.toHaveBeenCalled();
    expect(page.items[0]?.series?.name).toBe("Série s1");
    expect(page.items[0]?.progressPercent).toBeNull();
  });

  it("resolves a series missing from the known pool", async () => {
    const provider = makeProvider(
      source([book("a", { seriesId: "s2" })], [])
    );

    const page = await loadContinueReadingPage(provider, 0, {
      knownSeries: [series("s1")],
    });

    expect(provider.getSeriesById).toHaveBeenCalledWith("s2");
    expect(page.items[0]?.series?.id).toBe("s2");
  });

  it("keeps the book when its series cannot be resolved", async () => {
    const provider = makeProvider(source([book("a", { seriesId: "s2" })], []), {
      getSeriesById: vi.fn(async () => {
        throw new Error("provider down");
      }),
    });

    const page = await loadContinueReadingPage(provider, 0, {
      knownSeries: [series("s1")],
    });

    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.book.id).toBe("a");
    expect(page.items[0]?.series).toBeNull();
  });

  it("accepts the pool as a promise and awaits it before matching", async () => {
    const provider = makeProvider(
      source([book("a", { seriesId: "s1" })], [])
    );

    const page = await loadContinueReadingPage(provider, 0, {
      knownSeries: Promise.resolve([series("s1")]),
    });

    expect(provider.getSeriesById).not.toHaveBeenCalled();
    expect(page.items[0]?.series?.id).toBe("s1");
  });

  it("seeds the pool with the first ongoing page when none is given", async () => {
    const provider = makeProvider(source([book("a", { seriesId: "s1" })], []), {
      getHomeOngoingSeries: vi.fn(async () => [series("s1")]),
    });

    const page = await loadContinueReadingPage(provider, 0);

    expect(provider.getHomeOngoingSeries).toHaveBeenCalledWith(9);
    expect(provider.getSeriesById).not.toHaveBeenCalled();
    expect(page.items[0]?.series?.id).toBe("s1");
  });
});

describe("loadContinueReadingPage — progress", () => {
  it("computes the book progress from the read page", async () => {
    const provider = makeProvider(
      source(
        [
          book("a", {
            pageCount: 200,
            readProgress: { page: 50, completed: false, lastReadAt: null },
          }),
        ],
        []
      )
    );

    const page = await loadContinueReadingPage(provider, 0, {
      knownSeries: [series("s1")],
    });

    expect(page.items[0]?.progressPercent).toBe(25);
  });
});
