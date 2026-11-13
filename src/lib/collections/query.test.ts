import { describe, expect, it, vi } from "vitest";

import {
  bookCollectionFilter,
  fetchBookCollectionPage,
  fetchSeriesCollectionPage,
  loadClampedPage,
  normalizeSortOrder,
  parseCollectionQuery,
  parsePage,
  parseSeriesCollectionQuery,
  type CollectionQueryDefaults,
  type SeriesCollectionContext,
} from "./query";
import type { NormalizedSeriesPage } from "@/lib/providers/types";

const defaults: CollectionQueryDefaults = {
  itemsPerPage: 60,
  compact: false,
  unreadOnly: false,
};

const context: SeriesCollectionContext = {
  ...defaults,
  defaultSortOrder: "latest",
  showMissingBooks: true,
  canSortByRating: true,
};

describe("parsePage", () => {
  it("defaults to the first page", () => {
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage("")).toBe(1);
  });

  it("keeps a positive integer", () => {
    expect(parsePage("3")).toBe(3);
    expect(parsePage("3.9")).toBe(3);
  });

  it("rejects zero, negatives and non-numeric values", () => {
    expect(parsePage("0")).toBe(1);
    expect(parsePage("-2")).toBe(1);
    expect(parsePage("abc")).toBe(1);
  });
});

describe("normalizeSortOrder", () => {
  it("keeps the known sorts", () => {
    expect(normalizeSortOrder("title")).toBe("title");
    expect(normalizeSortOrder("latest")).toBe("latest");
    expect(normalizeSortOrder("community_score")).toBe("community_score");
  });

  it("falls back to the title sort", () => {
    expect(normalizeSortOrder(undefined)).toBe("title");
    expect(normalizeSortOrder("recent")).toBe("title");
  });
});

describe("parseCollectionQuery", () => {
  it("uses the preferences when the URL carries nothing", () => {
    expect(parseCollectionQuery({}, defaults)).toEqual({
      page: 1,
      pageSize: 60,
      unreadOnly: false,
    });
  });

  it("lets the URL win over the preferences", () => {
    expect(
      parseCollectionQuery({ page: "2", size: "90", unread: "true" }, defaults)
    ).toEqual({ page: 2, pageSize: 90, unreadOnly: true });
  });

  it("clamps a page size to the compact or comfortable options", () => {
    expect(parseCollectionQuery({ size: "70" }, defaults).pageSize).toBe(60);
    expect(
      parseCollectionQuery({ size: "70" }, { ...defaults, compact: true }).pageSize
    ).toBe(48);
  });

  it("falls back to the first option for an unparsable size", () => {
    expect(parseCollectionQuery({ size: "abc" }, defaults).pageSize).toBe(30);
    expect(
      parseCollectionQuery({ size: "abc" }, { ...defaults, compact: true }).pageSize
    ).toBe(24);
  });

  it("follows the unread preference only when the param is absent", () => {
    expect(
      parseCollectionQuery({}, { ...defaults, unreadOnly: true }).unreadOnly
    ).toBe(true);
    expect(
      parseCollectionQuery({ unread: "false" }, { ...defaults, unreadOnly: true }).unreadOnly
    ).toBe(false);
    expect(
      parseCollectionQuery({ unread: "" }, { ...defaults, unreadOnly: true }).unreadOnly
    ).toBe(false);
  });
});

describe("parseSeriesCollectionQuery", () => {
  it("defaults the sort to the user preference", () => {
    expect(parseSeriesCollectionQuery({}, context).sort).toBe("latest");
  });

  it("lets the URL sort win over the preference", () => {
    expect(parseSeriesCollectionQuery({ sort: "title" }, context).sort).toBe("title");
  });

  it("downgrades community_score when the provider has no ratings", () => {
    const query = parseSeriesCollectionQuery(
      { sort: "community_score" },
      { ...context, canSortByRating: false }
    );

    expect(query.sort).toBe("title");
  });

  it("falls back to the title sort for an unknown value", () => {
    expect(parseSeriesCollectionQuery({ sort: "nope" }, context).sort).toBe("title");
  });

  it("follows the missing preference only when the param is absent", () => {
    expect(parseSeriesCollectionQuery({}, context).missing).toBe(false);
    expect(
      parseSeriesCollectionQuery({}, { ...context, showMissingBooks: false }).missing
    ).toBe(true);
    expect(parseSeriesCollectionQuery({ missing: "true" }, context).missing).toBe(true);
    expect(
      parseSeriesCollectionQuery(
        { missing: "false" },
        { ...context, showMissingBooks: false }
      ).missing
    ).toBe(false);
  });

  it("passes the search term through untouched", () => {
    expect(parseSeriesCollectionQuery({ search: "  Akira " }, context).search).toBe(
      "  Akira "
    );
  });
});

describe("fetchSeriesCollectionPage", () => {
  it("sends the normalised query to the provider", async () => {
    const page: NormalizedSeriesPage = {
      items: [],
      page: 3,
      totalPages: 4,
      totalElements: 0,
    };
    const getSeries = vi.fn().mockResolvedValue(page);
    const query = parseSeriesCollectionQuery(
      { page: "3", size: "90", unread: "true", search: "akira", sort: "latest", missing: "true" },
      context
    );

    const result = await fetchSeriesCollectionPage({ getSeries }, "lib-1", query);
    expect(result.seriesPage).toBe(page);
    expect(result.query).toEqual(query);
    expect(getSeries).toHaveBeenCalledWith("lib-1", 3, 90, true, "akira", "latest", true);
  });

  it("serves the last page when the URL points past it", async () => {
    const getSeries = vi.fn(async (_lib: string, page: number) => ({
      items: [],
      page,
      totalPages: 2,
      totalElements: 50,
    }));
    const query = parseSeriesCollectionQuery({ page: "3" }, context);

    const result = await fetchSeriesCollectionPage({ getSeries }, "lib-1", query);

    expect(result.query.page).toBe(2);
    expect(result.seriesPage.page).toBe(2);
    expect(getSeries).toHaveBeenLastCalledWith("lib-1", 2, 60, false, undefined, "latest", false);
  });
});

describe("loadClampedPage", () => {
  it("does not reload a page inside the range", async () => {
    const load = vi.fn(async () => ({ totalPages: 5 }));
    await expect(loadClampedPage(5, load)).resolves.toEqual({
      page: 5,
      result: { totalPages: 5 },
    });
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("keeps page 1 for an empty collection", async () => {
    const load = vi.fn(async () => ({ totalPages: 0 }));
    await expect(loadClampedPage(4, load)).resolves.toMatchObject({ page: 1 });
    expect(load).toHaveBeenLastCalledWith(1);
  });
});

describe("fetchBookCollectionPage", () => {
  it("clamps the series book grid to its last page", async () => {
    const getBooks = vi.fn(async (filter: { page: number }) => ({
      items: [],
      page: filter.page,
      totalPages: 2,
      totalElements: 40,
    }));

    const result = await fetchBookCollectionPage({ getBooks }, "serie-1", {
      page: 9,
      pageSize: 30,
      unreadOnly: false,
    });

    expect(result.query.page).toBe(2);
    expect(getBooks).toHaveBeenLastCalledWith({
      seriesId: "serie-1",
      page: 2,
      limit: 30,
      unreadOnly: false,
    });
  });
});

describe("bookCollectionFilter", () => {
  it("translates the collection query into a provider filter", () => {
    expect(
      bookCollectionFilter("serie-1", { page: 2, pageSize: 48, unreadOnly: true })
    ).toEqual({
      seriesId: "serie-1",
      page: 2,
      limit: 48,
      unreadOnly: true,
    });
  });
});
