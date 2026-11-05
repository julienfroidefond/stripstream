import { describe, expect, it, vi } from "vitest";

import type { IMediaProvider } from "@/lib/providers/provider.interface";
import type { NormalizedSeries, NormalizedSeriesPage } from "@/lib/providers/types";
import {
  countReadSeries,
  filterReadSeries,
  getReadSeries,
  normalizeSeriesSearch,
  paginateReadSeries,
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
    nextCursor: null,
    totalPages: 1,
    totalElements: ids.length,
    ...overrides,
  };
}

function providerWith(pages: NormalizedSeriesPage[]): IMediaProvider {
  const getReadSeriesMock = vi.fn(async (pageNumber = 1) => {
    return pages[pageNumber - 1] ?? page([]);
  });

  return { getReadSeries: getReadSeriesMock } as unknown as IMediaProvider;
}

describe("getReadSeries", () => {
  it("returns the first page without extra requests when it is the only one", async () => {
    const provider = providerWith([page(["a", "b"])]);

    await expect(getReadSeries(provider)).resolves.toEqual([series("a"), series("b")]);
    expect(provider.getReadSeries).toHaveBeenCalledTimes(1);
  });

  it("follows pagination and keeps the backend order", async () => {
    const provider = providerWith([
      page(["a", "b"], { nextCursor: "2", totalPages: 2, totalElements: 3 }),
      page(["c"], { nextCursor: null, totalPages: 2, totalElements: 3 }),
    ]);

    const result = await getReadSeries(provider);

    expect(result.map((item) => item.id)).toEqual(["a", "b", "c"]);
    expect(provider.getReadSeries).toHaveBeenNthCalledWith(1, 1, 200);
    expect(provider.getReadSeries).toHaveBeenNthCalledWith(2, 2, 200);
  });

  it("deduplicates series that appear on several pages", async () => {
    const provider = providerWith([
      page(["a", "b"], { nextCursor: "2", totalPages: 2 }),
      page(["b", "c"], { totalPages: 2 }),
    ]);

    const result = await getReadSeries(provider);

    expect(result.map((item) => item.id)).toEqual(["a", "b", "c"]);
  });

  it("caps how many pages are fetched", async () => {
    const provider = providerWith(
      Array.from({ length: 8 }, (_, index) =>
        page([`s${index}`], { nextCursor: String(index + 2), totalPages: 8 })
      )
    );

    const result = await getReadSeries(provider);

    expect(result).toHaveLength(5);
    expect(provider.getReadSeries).toHaveBeenCalledTimes(5);
  });

  it("does not paginate when the backend reports a single page without cursor", async () => {
    const provider = providerWith([page(["a"], { totalPages: 1 })]);

    await getReadSeries(provider);

    expect(provider.getReadSeries).toHaveBeenCalledTimes(1);
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

  it("does not mutate the input", () => {
    const items = [series("a", { userRating: 2 }), series("b", { userRating: null })];

    sortReadSeries(items);

    expect(items.map((item) => item.id)).toEqual(["a", "b"]);
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
