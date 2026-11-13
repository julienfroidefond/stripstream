import { describe, expect, it, vi } from "vitest";

import type { RatingsCapability } from "@/lib/providers/provider.interface";
import type { NormalizedSeries, NormalizedSeriesPage } from "@/lib/providers/types";
import {
  countReadSeries,
  DEFAULT_READ_SERIES_SORT,
  filterReadSeries,
  getReadSeries,
  normalizeSeriesSearch,
  paginateReadSeries,
  parseReadSeriesSort,
  sortReadSeries,
} from "./read-series.service";

function series(id: string, overrides: Partial<NormalizedSeries> = {}): NormalizedSeries {
  return {
    id,
    name: `Série ${id}`,
    bookCount: 3,
    booksReadCount: 3,
    thumbnailUrl: "",
    summary: null,
    authors: [],
    genres: [],
    startYear: null,
    ...overrides,
  };
}

function page(ids: string[], overrides: Partial<NormalizedSeriesPage> = {}): NormalizedSeriesPage {
  return {
    items: ids.map((id) => series(id)),
    page: 1,
    totalPages: 1,
    totalElements: ids.length,
    ...overrides,
  };
}

function ratingsWith(pages: NormalizedSeriesPage[]): RatingsCapability {
  const getReadSeriesMock = vi.fn(async (pageNumber = 1) => {
    return pages[pageNumber - 1] ?? page([]);
  });

  return { getReadSeries: getReadSeriesMock } as unknown as RatingsCapability;
}

describe("getReadSeries", () => {
  it("returns the first page without extra requests when it is the only one", async () => {
    const ratings = ratingsWith([page(["a", "b"])]);

    await expect(getReadSeries(ratings)).resolves.toEqual([series("a"), series("b")]);
    expect(ratings.getReadSeries).toHaveBeenCalledTimes(1);
  });

  it("follows pagination and keeps the backend order", async () => {
    const ratings = ratingsWith([
      page(["a", "b"], { totalPages: 2, totalElements: 3 }),
      page(["c"], { page: 2, totalPages: 2, totalElements: 3 }),
    ]);

    const result = await getReadSeries(ratings);

    expect(result.map((item) => item.id)).toEqual(["a", "b", "c"]);
    expect(ratings.getReadSeries).toHaveBeenNthCalledWith(1, 1, 200);
    expect(ratings.getReadSeries).toHaveBeenNthCalledWith(2, 2, 200);
  });

  it("deduplicates series that appear on several pages", async () => {
    const ratings = ratingsWith([
      page(["a", "b"], { totalPages: 2 }),
      page(["b", "c"], { page: 2, totalPages: 2 }),
    ]);

    const result = await getReadSeries(ratings);

    expect(result.map((item) => item.id)).toEqual(["a", "b", "c"]);
  });

  it("caps how many pages are fetched", async () => {
    const ratings = ratingsWith(
      Array.from({ length: 8 }, (_, index) =>
        page([`s${index}`], { page: index + 1, totalPages: 8 })
      )
    );

    const result = await getReadSeries(ratings);

    expect(result).toHaveLength(5);
    expect(ratings.getReadSeries).toHaveBeenCalledTimes(5);
  });

  it("does not paginate when the backend reports a single page", async () => {
    const ratings = ratingsWith([page(["a"], { totalPages: 1 })]);

    await getReadSeries(ratings);

    expect(ratings.getReadSeries).toHaveBeenCalledTimes(1);
  });
});

describe("normalizeSeriesSearch", () => {
  it("ignores case and accents", () => {
    expect(normalizeSeriesSearch("Été")).toBe("ete");
  });
});

describe("filterReadSeries", () => {
  const items = [
    series("ete", { name: "Été", userRating: null }),
    series("hiver", { name: "Hiver", userRating: 8 }),
  ];

  it("matches an accent-insensitive query", () => {
    expect(filterReadSeries(items, "ete", "all").map((item) => item.id)).toEqual(["ete"]);
  });

  it("filters unrated and rated series", () => {
    expect(filterReadSeries(items, "", "unrated").map((item) => item.id)).toEqual(["ete"]);
    expect(filterReadSeries(items, "", "rated").map((item) => item.id)).toEqual(["hiver"]);
  });

  it("combines the query with the filter", () => {
    expect(filterReadSeries(items, "hiver", "unrated")).toEqual([]);
  });
});

describe("sortReadSeries", () => {
  it("puts unrated series first, then the best ratings, then titles", () => {
    const items = [
      series("rated-low", { name: "B", userRating: 4 }),
      series("unrated-b", { name: "B", userRating: null }),
      series("rated-high", { name: "C", userRating: 10 }),
      series("unrated-a", { name: "A", userRating: null }),
    ];

    expect(sortReadSeries(items).map((item) => item.id)).toEqual([
      "unrated-a",
      "unrated-b",
      "rated-high",
      "rated-low",
    ]);
  });

  it("sorts by title", () => {
    const items = [
      series("c", { name: "C" }),
      series("a", { name: "Á" }),
      series("b", { name: "B" }),
    ];

    expect(sortReadSeries(items, "title").map((item) => item.id)).toEqual(["a", "b", "c"]);
  });

  it("sorts by most recent reading and leaves undated series last", () => {
    const items = [
      series("old", { name: "B", lastReadAt: "2026-01-01T10:00:00.000Z" }),
      series("undated", { name: "A", lastReadAt: null }),
      series("recent", { name: "C", lastReadAt: "2026-03-01T10:00:00.000Z" }),
      series("missing", { name: "B" }),
      series("invalid", { name: "C", lastReadAt: "not-a-date" }),
    ];

    expect(sortReadSeries(items, "recent").map((item) => item.id)).toEqual([
      "recent",
      "old",
      "undated",
      "missing",
      "invalid",
    ]);
  });

  it("sorts rated series from best to worst and leaves unrated last", () => {
    const items = [
      series("unrated-b", { name: "B", userRating: null }),
      series("rated-low", { name: "A", userRating: 4 }),
      series("unrated-a", { name: "A", userRating: null }),
      series("rated-high", { name: "C", userRating: 10 }),
    ];

    expect(sortReadSeries(items, "rating-desc").map((item) => item.id)).toEqual([
      "rated-high",
      "rated-low",
      "unrated-a",
      "unrated-b",
    ]);
  });

  it("sorts rated series from worst to best and leaves unrated last", () => {
    const items = [
      series("unrated", { name: "A", userRating: null }),
      series("rated-high", { name: "C", userRating: 10 }),
      series("rated-low", { name: "B", userRating: 4 }),
    ];

    expect(sortReadSeries(items, "rating-asc").map((item) => item.id)).toEqual([
      "rated-low",
      "rated-high",
      "unrated",
    ]);
  });

  it("does not mutate the input", () => {
    const items = [series("a", { userRating: 2 }), series("b", { userRating: null })];

    sortReadSeries(items);

    expect(items.map((item) => item.id)).toEqual(["a", "b"]);
  });
});

describe("parseReadSeriesSort", () => {
  it("keeps supported sorts and falls back to the default", () => {
    expect(parseReadSeriesSort("recent")).toBe("recent");
    expect(parseReadSeriesSort("title")).toBe("title");
    expect(parseReadSeriesSort("rating-desc")).toBe("rating-desc");
    expect(parseReadSeriesSort("rating-asc")).toBe("rating-asc");
    expect(parseReadSeriesSort("unknown")).toBe(DEFAULT_READ_SERIES_SORT);
    expect(parseReadSeriesSort(undefined)).toBe(DEFAULT_READ_SERIES_SORT);
  });
});

describe("countReadSeries", () => {
  it("separates rated and unrated series", () => {
    expect(
      countReadSeries([
        series("a", { userRating: null }),
        series("b", { userRating: 6 }),
        series("c", { userRating: undefined }),
      ])
    ).toEqual({ total: 3, unrated: 2, rated: 1 });
  });
});

describe("paginateReadSeries", () => {
  const items = ["a", "b", "c"].map((id) => series(id));

  it("returns the requested page", () => {
    expect(paginateReadSeries(items, 2, 2)).toEqual({
      items: [items[2]],
      page: 2,
      totalPages: 2,
    });
  });

  it("clamps an out-of-range page", () => {
    expect(paginateReadSeries(items, 9, 2).page).toBe(2);
  });

  it("returns an empty first page when there is nothing to paginate", () => {
    expect(paginateReadSeries([], 1, 2)).toEqual({ items: [], page: 1, totalPages: 1 });
  });
});
