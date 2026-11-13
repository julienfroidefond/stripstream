import { describe, expect, it, vi } from "vitest";

import {
  bookCollectionFilter,
  fetchSeriesCollectionPage,
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
      nextCursor: null,
      totalPages: 1,
      totalElements: 0,
    };
    const getSeries = vi.fn().mockResolvedValue(page);
    const query = parseSeriesCollectionQuery(
      { page: "3", size: "90", unread: "true", search: "akira", sort: "latest", missing: "true" },
      context
    );

    await expect(fetchSeriesCollectionPage({ getSeries }, "lib-1", query)).resolves.toBe(
      page
    );
    expect(getSeries).toHaveBeenCalledWith("lib-1", "3", 90, true, "akira", "latest", true);
  });
});

describe("bookCollectionFilter", () => {
  it("translates the collection query into a provider filter", () => {
    expect(
      bookCollectionFilter("serie-1", { page: 2, pageSize: 48, unreadOnly: true })
    ).toEqual({
      seriesId: "serie-1",
      cursor: "2",
      limit: 48,
      unreadOnly: true,
    });
  });
});
