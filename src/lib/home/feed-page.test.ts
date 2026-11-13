import { describe, expect, it } from "vitest";

import { MAX_HOME_FEED_OFFSET, paginateFeed, probeLimit } from "./feed-page";

const ITEMS = ["a", "b", "c", "d", "e"] as const;

describe("paginateFeed", () => {
  it("returns the first page and reports the remaining items", () => {
    expect(paginateFeed(ITEMS, 0, 2)).toEqual({
      items: ["a", "b"],
      hasMore: true,
    });
  });

  it("returns the next page from the requested offset", () => {
    expect(paginateFeed(ITEMS, 2, 2)).toEqual({
      items: ["c", "d"],
      hasMore: true,
    });
  });

  it("returns a short last page without more items", () => {
    expect(paginateFeed(ITEMS, 4, 2)).toEqual({
      items: ["e"],
      hasMore: false,
    });
  });

  it("returns an empty page past the end", () => {
    expect(paginateFeed(ITEMS, 25, 2)).toEqual({
      items: [],
      hasMore: false,
    });
  });

  it("clamps a negative offset to the first page", () => {
    expect(paginateFeed(ITEMS, -3, 2)).toEqual({
      items: ["a", "b"],
      hasMore: true,
    });
  });
});

describe("probeLimit", () => {
  it("asks for offset + pageSize + 1 items", () => {
    expect(probeLimit(8, 8)).toBe(17);
  });

  it("never sends an unbounded or NaN limit to the provider", () => {
    expect(probeLimit(1e9, 8)).toBe(MAX_HOME_FEED_OFFSET + 9);
    expect(probeLimit(Number.NaN, 8)).toBe(9);
    expect(probeLimit(-5, 8)).toBe(9);
  });
});
