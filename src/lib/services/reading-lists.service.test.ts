import { describe, expect, it } from "vitest";

import type { StripstreamReadingList } from "@/types/stripstream";
import {
  DEFAULT_READING_LIST_SORT,
  sortReadingLists,
  type ReadingListSort,
} from "./reading-lists.service";

function list(
  id: string,
  overrides: Partial<StripstreamReadingList> = {}
): StripstreamReadingList {
  return {
    id,
    name: `Liste ${id}`,
    description: null,
    series_count: 1,
    book_count: 10,
    books_read_count: 0,
    preview_covers: [],
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const lists = [
  list("alpha", {
    name: "Alpha",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-03-01T00:00:00.000Z",
    books_read_count: 2,
  }),
  list("beta", {
    name: "Bêta",
    created_at: "2026-02-01T00:00:00.000Z",
    updated_at: "2026-02-01T00:00:00.000Z",
    books_read_count: 10,
  }),
  list("gamma", {
    name: "Gamma",
    created_at: "2026-03-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    book_count: 0,
    books_read_count: 0,
  }),
];

function ids(items: StripstreamReadingList[]): string[] {
  return items.map((item) => item.id);
}

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
      list("b", { name: "B", updated_at: "2026-01-01T00:00:00.000Z" }),
      list("a", { name: "A", updated_at: "2026-01-01T00:00:00.000Z" }),
    ];

    expect(ids(sortReadingLists(items, "updated"))).toEqual(["a", "b"]);
  });

  it("does not mutate the input", () => {
    const items = [...lists];

    sortReadingLists(items, "name");

    expect(items).toEqual(lists);
  });
});
