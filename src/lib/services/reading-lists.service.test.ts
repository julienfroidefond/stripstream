import { describe, expect, it } from "vitest";

import type { NormalizedReadingList } from "@/lib/providers/types";
import {
  DEFAULT_READING_LIST_SORT,
  getReadingListStatus,
  getReadingListTotals,
  sortReadingLists,
  type ReadingListSort,
} from "./reading-lists.service";

function list(
  id: string,
  overrides: Partial<NormalizedReadingList> = {}
): NormalizedReadingList {
  return {
    id,
    name: `Liste ${id}`,
    description: null,
    seriesCount: 1,
    bookCount: 10,
    booksReadCount: 0,
    previewCovers: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const lists = [
  list("alpha", {
    name: "Alpha",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-03-01T00:00:00.000Z",
    booksReadCount: 2,
  }),
  list("beta", {
    name: "Bêta",
    createdAt: "2026-02-01T00:00:00.000Z",
    updatedAt: "2026-02-01T00:00:00.000Z",
    booksReadCount: 10,
  }),
  list("gamma", {
    name: "Gamma",
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    bookCount: 0,
    booksReadCount: 0,
  }),
];

function ids(items: NormalizedReadingList[]): string[] {
  return items.map((item) => item.id);
}

describe("getReadingListStatus", () => {
  it.each([
    [{ bookCount: 10, booksReadCount: 10 }, "read"],
    [{ bookCount: 10, booksReadCount: 2 }, "reading"],
    [{ bookCount: 10, booksReadCount: 0 }, "unread"],
    [{ bookCount: 0, booksReadCount: 0 }, "unread"],
  ] as const)("maps %j to %s", (totals, expected) => {
    expect(getReadingListStatus(totals)).toBe(expected);
  });
});

describe("getReadingListTotals", () => {
  it("sums books and read books across series", () => {
    expect(
      getReadingListTotals([
        { bookCount: 3, booksReadCount: 1 },
        { bookCount: 5, booksReadCount: 5 },
        { bookCount: 0, booksReadCount: 0 },
      ])
    ).toEqual({ bookCount: 8, booksReadCount: 6 });
  });

  it("returns zero totals for an empty list", () => {
    expect(getReadingListTotals([])).toEqual({ bookCount: 0, booksReadCount: 0 });
  });
});

describe("sortReadingLists", () => {
  const cases: Array<[ReadingListSort, string[]]> = [
    ["updated", ["alpha", "beta", "gamma"]],
    ["created", ["gamma", "beta", "alpha"]],
    ["name", ["alpha", "beta", "gamma"]],
    ["progress", ["gamma", "alpha", "beta"]],
  ];

  it.each(cases)("sorts by %s", (sort, expected) => {
    expect(ids(sortReadingLists(lists, sort))).toEqual(expected);
  });

  it("defaults to recently updated", () => {
    expect(ids(sortReadingLists(lists))).toEqual(ids(sortReadingLists(lists, DEFAULT_READING_LIST_SORT)));
  });

  it("breaks ties by name", () => {
    const items = [
      list("b", { name: "B", updatedAt: "2026-01-01T00:00:00.000Z" }),
      list("a", { name: "A", updatedAt: "2026-01-01T00:00:00.000Z" }),
    ];

    expect(ids(sortReadingLists(items, "updated"))).toEqual(["a", "b"]);
  });

  it("does not mutate the input", () => {
    const items = [...lists];

    sortReadingLists(items, "name");

    expect(items).toEqual(lists);
  });
});
