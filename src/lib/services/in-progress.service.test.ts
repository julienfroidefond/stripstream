import { describe, expect, it, vi } from "vitest";

import {
  createProviderCapabilities,
  type IMediaProvider,
} from "@/lib/providers/provider.interface";
import type { NormalizedBook, NormalizedSeries } from "@/lib/providers/types";
import {
  buildInProgressItems,
  DEFAULT_IN_PROGRESS_SORT,
  filterInProgressItems,
  getInProgressItems,
  getInProgressStats,
  isPaused,
  sortInProgressItems,
  type InProgressItem,
} from "./in-progress.service";

const NOW = Date.parse("2026-06-15T12:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;

function series(
  id: string,
  overrides: Partial<NormalizedSeries> = {}
): NormalizedSeries {
  return {
    id,
    name: `Série ${id}`,
    bookCount: 6,
    booksReadCount: 2,
    thumbnailUrl: "",
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
    thumbnailUrl: "",
    media: { pageUrlTemplate: "/pages/{page}", thumbnailUrlTemplate: "/pages/{page}" },
    readProgress: null,
    ...overrides,
  };
}

function inProgressItem(
  id: string,
  overrides: Partial<InProgressItem> = {},
  seriesOverrides: Partial<NormalizedSeries> = {}
): InProgressItem {
  return {
    series: series(id, seriesOverrides),
    currentBook: null,
    nextBook: null,
    resumeBook: null,
    remainingBooks: 3,
    progressPercent: 50,
    lastReadAt: null,
    ...overrides,
  };
}

describe("buildInProgressItems", () => {
  it("merges the current book and the next book, preferring the current one to resume", () => {
    const ongoing = book("current", {
      seriesId: "s1",
      readProgress: { page: 12, completed: false, lastReadAt: "2026-06-14T10:00:00.000Z" },
    });
    const next = book("next", { seriesId: "s1" });

    const [item] = buildInProgressItems([series("s1")], {
      ongoingBooks: [ongoing],
      onDeck: [next],
    });

    expect(item.currentBook).toEqual(ongoing);
    expect(item.nextBook).toEqual(next);
    expect(item.resumeBook).toEqual(ongoing);
  });

  it("falls back to the next book when no book is in progress", () => {
    const next = book("next", { seriesId: "s1" });

    const [item] = buildInProgressItems([series("s1")], {
      ongoingBooks: [],
      onDeck: [next],
    });

    expect(item.currentBook).toBeNull();
    expect(item.resumeBook).toEqual(next);
  });

  it("treats an opened on-deck book as the current book", () => {
    const current = book("on-deck", {
      seriesId: "s1",
      readProgress: {
        page: 8,
        completed: false,
        lastReadAt: "2026-06-14T10:00:00.000Z",
      },
    });

    const [item] = buildInProgressItems([series("s1")], {
      ongoingBooks: [],
      onDeck: [current],
    });

    expect(item.currentBook).toEqual(current);
    expect(item.nextBook).toBeNull();
    expect(item.resumeBook).toEqual(current);
  });

  it("keeps the most recently read book when a series has several in progress", () => {
    const older = book("older", {
      seriesId: "s1",
      readProgress: { page: 4, completed: false, lastReadAt: "2026-06-10T10:00:00.000Z" },
    });
    const newer = book("newer", {
      seriesId: "s1",
      readProgress: { page: 8, completed: false, lastReadAt: "2026-06-14T10:00:00.000Z" },
    });

    const [item] = buildInProgressItems([series("s1")], {
      ongoingBooks: [older, newer],
      onDeck: [],
    });

    expect(item.currentBook?.id).toBe("newer");
  });

  it("matches a book by series name when the provider only exposes the name", () => {
    const [item] = buildInProgressItems([series("s1", { name: "Été" })], {
      ongoingBooks: [book("b1", { seriesId: null, seriesName: "ete" })],
      onDeck: [],
    });

    expect(item.currentBook?.id).toBe("b1");
  });

  it("uses the library to disambiguate same-name series", () => {
    const items = buildInProgressItems(
      [
        series("a", { name: "Same", libraryId: "lib-a" }),
        series("b", { name: "Same", libraryId: "lib-b" }),
      ],
      {
        ongoingBooks: [book("b1", { seriesId: null, seriesName: "same", libraryId: "lib-b" })],
        onDeck: [],
      }
    );

    expect(items.find((item) => item.series.id === "b")?.currentBook?.id).toBe("b1");
    expect(items.find((item) => item.series.id === "a")?.currentBook).toBeNull();
  });

  it("prefers an exact library match over a candidate without a library", () => {
    const items = buildInProgressItems(
      [
        series("unknown", { name: "Same", libraryId: undefined }),
        series("known", { name: "Same", libraryId: "lib-b" }),
      ],
      {
        ongoingBooks: [book("b1", { seriesId: null, seriesName: "same", libraryId: "lib-b" })],
        onDeck: [],
      }
    );

    expect(items.find((item) => item.series.id === "known")?.currentBook?.id).toBe(
      "b1"
    );
    expect(
      items.find((item) => item.series.id === "unknown")?.currentBook
    ).toBeNull();
  });

  it("keeps series the reader has put aside so they can be shown as paused", () => {
    const items = buildInProgressItems(
      [
        series("shelved", { shelvedAt: "2026-06-01T10:00:00.000Z" }),
        series("active"),
      ],
      { ongoingBooks: [], onDeck: [] }
    );

    expect(items.map((item) => item.series.id)).toEqual(["shelved", "active"]);
    expect(isPaused(items[0])).toBe(true);
    expect(isPaused(items[1])).toBe(false);
  });

  it("excludes fully read and empty series", () => {
    const items = buildInProgressItems(
      [
        series("done", { bookCount: 3, booksReadCount: 3 }),
        series("over", { bookCount: 3, booksReadCount: 5 }),
        series("empty", { bookCount: 0, booksReadCount: 0 }),
        series("active", { bookCount: 5, booksReadCount: 1 }),
      ],
      { ongoingBooks: [], onDeck: [] }
    );

    expect(items.map((item) => item.series.id)).toEqual(["active"]);
  });

  it("computes remaining books and progress", () => {
    const [item] = buildInProgressItems(
      [series("s1", { bookCount: 8, booksReadCount: 3 })],
      { ongoingBooks: [], onDeck: [] }
    );

    expect(item.remainingBooks).toBe(5);
    expect(item.progressPercent).toBe(38);
  });

  it("deduplicates series and falls back to the current book's last read date", () => {
    const current = book("current", {
      seriesId: "s1",
      readProgress: { page: 2, completed: false, lastReadAt: "2026-06-12T10:00:00.000Z" },
    });

    const items = buildInProgressItems([series("s1"), series("s1")], {
      ongoingBooks: [current],
      onDeck: [],
    });

    expect(items).toHaveLength(1);
    expect(items[0].lastReadAt).toBe("2026-06-12T10:00:00.000Z");
  });
});

function makeProvider(options: {
  ongoing?: () => Promise<NormalizedSeries[]>;
  shelved?: () => Promise<NormalizedSeries[]>;
  continueReading?: () => Promise<{
    ongoingBooks: NormalizedBook[];
    onDeck: NormalizedBook[];
  }>;
  shelf?: boolean;
} = {}) {
  const getShelvedSeries = vi.fn(options.shelved ?? (async () => []));
  const provider = {
    getHomeOngoingSeries: vi.fn(options.ongoing ?? (async () => [])),
    getHomeContinueReadingData: vi.fn(
      options.continueReading ?? (async () => ({ ongoingBooks: [], onDeck: [] }))
    ),
    capabilities: createProviderCapabilities({
      shelf:
        options.shelf === false
          ? null
          : {
              getShelvedSeries,
              isShelved: vi.fn(async () => false),
              shelveSeries: vi.fn(async () => undefined),
              unshelveSeries: vi.fn(async () => undefined),
            },
    }),
  } as unknown as IMediaProvider;

  return { provider, getShelvedSeries };
}

describe("getInProgressItems", () => {
  it("loads ongoing, shelved and continue-reading feeds with the maximum limit", async () => {
    const { provider, getShelvedSeries } = makeProvider({
      ongoing: async () => [
        series("old", { lastReadAt: "2026-01-01T10:00:00.000Z" }),
        series("recent", { lastReadAt: "2026-06-01T10:00:00.000Z" }),
      ],
    });

    const items = await getInProgressItems(provider);

    expect(items.map((item) => item.series.id)).toEqual(["recent", "old"]);
    expect(provider.getHomeOngoingSeries).toHaveBeenCalledWith(50);
    expect(getShelvedSeries).toHaveBeenCalledWith(50);
    expect(provider.getHomeContinueReadingData).toHaveBeenCalledWith(50);
  });

  it("merges shelved series into the list without duplicating ongoing ones", async () => {
    const { provider } = makeProvider({
      ongoing: async () => [series("ongoing")],
      shelved: async () => [
        series("shelved", { shelvedAt: "2026-06-01T10:00:00.000Z" }),
        series("ongoing"),
      ],
    });

    const items = await getInProgressItems(provider);

    expect(items.map((item) => item.series.id).sort()).toEqual([
      "ongoing",
      "shelved",
    ]);
    expect(isPaused(items.find((item) => item.series.id === "shelved")!)).toBe(
      true
    );
    expect(isPaused(items.find((item) => item.series.id === "ongoing")!)).toBe(
      false
    );
  });

  it("still returns series when the continue-reading feed fails", async () => {
    const { provider } = makeProvider({
      ongoing: async () => [series("s1")],
      continueReading: async () => {
        throw new Error("feed down");
      },
    });

    const items = await getInProgressItems(provider);

    expect(items).toHaveLength(1);
    expect(items[0].resumeBook).toBeNull();
  });

  it("still returns series when the shelved feed fails", async () => {
    const { provider } = makeProvider({
      ongoing: async () => [series("s1")],
      shelved: async () => {
        throw new Error("shelves down");
      },
    });

    const items = await getInProgressItems(provider);

    expect(items.map((item) => item.series.id)).toEqual(["s1"]);
  });

  it("ignores the shelved feed when the provider has no shelf capability", async () => {
    const { provider, getShelvedSeries } = makeProvider({
      ongoing: async () => [series("s1")],
      shelf: false,
    });

    const items = await getInProgressItems(provider);

    expect(items.map((item) => item.series.id)).toEqual(["s1"]);
    expect(getShelvedSeries).not.toHaveBeenCalled();
  });

  it("surfaces a failure of the ongoing series feed", async () => {
    const { provider } = makeProvider({
      ongoing: async () => {
        throw new Error("series down");
      },
    });

    await expect(getInProgressItems(provider)).rejects.toThrow("series down");
  });
});

describe("isPaused", () => {
  it("relies on the reader's shelf instead of the last read date", () => {
    const paused = inProgressItem(
      "a",
      { lastReadAt: "2026-06-14T10:00:00.000Z" },
      { shelvedAt: "2026-06-01T10:00:00.000Z" }
    );
    const active = inProgressItem("b", {
      lastReadAt: "2026-01-01T10:00:00.000Z",
    });
    const undated = inProgressItem("c");

    expect(isPaused(paused)).toBe(true);
    expect(isPaused(active)).toBe(false);
    expect(isPaused(undated)).toBe(false);
  });
});

describe("filterInProgressItems", () => {
  const items = [
    inProgressItem("ete", { remainingBooks: 1 }, { name: "Été" }),
    inProgressItem("hiver", { remainingBooks: 5 }, { name: "Hiver" }),
    inProgressItem(
      "pause",
      { remainingBooks: 2 },
      { shelvedAt: "2026-06-01T10:00:00.000Z" }
    ),
  ];

  it("matches an accent-insensitive query", () => {
    expect(
      filterInProgressItems(items, "ete", "all", []).map((item) => item.series.id)
    ).toEqual(["ete"]);
  });

  it("filters favorites", () => {
    expect(
      filterInProgressItems(items, "", "favorites", ["hiver"]).map(
        (item) => item.series.id
      )
    ).toEqual(["hiver"]);
  });

  it("filters almost-done series", () => {
    expect(
      filterInProgressItems(items, "", "almost-done", []).map(
        (item) => item.series.id
      )
    ).toEqual(["ete", "pause"]);
  });

  it("filters paused series", () => {
    expect(
      filterInProgressItems(items, "", "paused", []).map((item) => item.series.id)
    ).toEqual(["pause"]);
  });

  it("combines the query with a filter", () => {
    expect(filterInProgressItems(items, "hiver", "paused", [])).toEqual([]);
  });
});

describe("sortInProgressItems", () => {
  const items = [
    inProgressItem("b", {
      remainingBooks: 2,
      progressPercent: 40,
      lastReadAt: "2026-06-10T10:00:00.000Z",
    }, { name: "Bravo" }),
    inProgressItem("a", {
      remainingBooks: 5,
      progressPercent: 80,
      lastReadAt: "2026-06-14T10:00:00.000Z",
    }, { name: "Alpha" }),
    inProgressItem("c", {
      remainingBooks: 1,
      progressPercent: 60,
      lastReadAt: null,
    }, { name: "Charlie" }),
  ];

  it("sorts by most recent reading and leaves undated series last", () => {
    expect(sortInProgressItems(items, "recent").map((item) => item.series.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("sorts by progress", () => {
    expect(sortInProgressItems(items, "progress").map((item) => item.series.id)).toEqual([
      "a",
      "c",
      "b",
    ]);
  });

  it("sorts by fewest remaining books", () => {
    expect(sortInProgressItems(items, "remaining").map((item) => item.series.id)).toEqual([
      "c",
      "b",
      "a",
    ]);
  });

  it("sorts by title", () => {
    expect(sortInProgressItems(items, "title").map((item) => item.series.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("defaults to recent and does not mutate the input", () => {
    expect(DEFAULT_IN_PROGRESS_SORT).toBe("recent");
    expect(sortInProgressItems(items).map((item) => item.series.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
    expect(items.map((item) => item.series.id)).toEqual(["b", "a", "c"]);
  });
});

describe("getInProgressStats", () => {
  it("counts series, remaining books, almost-done, paused and favorites", () => {
    const items = [
      inProgressItem(
        "a",
        { remainingBooks: 1 },
        { shelvedAt: "2026-06-01T10:00:00.000Z" }
      ),
      inProgressItem("b", { remainingBooks: 4 }),
      inProgressItem("c", {
        remainingBooks: 2,
        lastReadAt: new Date(NOW - 2 * DAY).toISOString(),
      }),
    ];

    expect(getInProgressStats(items, ["a", "c"])).toEqual({
      total: 3,
      remaining: 7,
      almostDone: 2,
      paused: 1,
      favorites: 2,
    });
  });
});
