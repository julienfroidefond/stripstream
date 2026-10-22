import { describe, expect, it } from "vitest";

import type { WallItem } from "@/types/wall";
import {
  filterWallItems,
  isWallItemComplete,
  parseStoredHideRead,
  parseStoredWallLibraries,
} from "./wall-filter";

function item(overrides: Partial<WallItem> = {}): WallItem {
  return {
    id: "series-1",
    name: "Les Naufragés",
    thumbnailUrl: "/cover",
    summary: null,
    authors: [],
    genres: [],
    libraryName: "Bacs à sable",
    bookCount: 3,
    booksReadCount: 0,
    startYear: null,
    seriesStatus: null,
    missingCount: null,
    communityScore: null,
    ...overrides,
  };
}

describe("isWallItemComplete", () => {
  it("treats a series as finished when every book is read", () => {
    expect(isWallItemComplete(item({ bookCount: 3, booksReadCount: 3 }))).toBe(true);
    expect(isWallItemComplete(item({ bookCount: 3, booksReadCount: 4 }))).toBe(true);
  });

  it("keeps unread, partially read and empty series visible", () => {
    expect(isWallItemComplete(item({ bookCount: 3, booksReadCount: 0 }))).toBe(false);
    expect(isWallItemComplete(item({ bookCount: 3, booksReadCount: 2 }))).toBe(false);
    expect(isWallItemComplete(item({ bookCount: 0, booksReadCount: 0 }))).toBe(false);
  });

  it("tolerates a provider that omits the read count", () => {
    const sparse = item({ bookCount: 2, booksReadCount: undefined as unknown as number });
    expect(isWallItemComplete(sparse)).toBe(false);
  });
});

describe("filterWallItems", () => {
  const sandbox = item({ id: "in-sandbox", libraryName: "Bacs à sable" });
  const archive = item({ id: "in-archive", libraryName: "Archives" });
  const finished = item({
    id: "finished",
    libraryName: "Bacs à sable",
    bookCount: 2,
    booksReadCount: 2,
  });
  const all = [sandbox, archive, finished];

  it("returns every item when no filter is active", () => {
    expect(filterWallItems(all, new Set(), false)).toEqual(all);
  });

  it("keeps only the selected libraries", () => {
    expect(filterWallItems(all, new Set(["Bacs à sable"]), false)).toEqual([
      sandbox,
      finished,
    ]);
  });

  it("hides finished series while keeping the others", () => {
    expect(filterWallItems(all, new Set(), true)).toEqual([sandbox, archive]);
  });

  it("composes library and finished filters", () => {
    expect(filterWallItems(all, new Set(["Bacs à sable"]), true)).toEqual([sandbox]);
    expect(filterWallItems(all, new Set(["Archives"]), true)).toEqual([archive]);
  });

  it("returns an empty list when everything is filtered out", () => {
    expect(filterWallItems([finished], new Set(), true)).toEqual([]);
    expect(filterWallItems([finished], new Set(["Bacs à sable"]), true)).toEqual([]);
    expect(filterWallItems([], new Set(["Bacs à sable"]), true)).toEqual([]);
  });
});

describe("parseStoredHideRead", () => {
  it("only enables the preference for the stored true value", () => {
    expect(parseStoredHideRead("true")).toBe(true);
    expect(parseStoredHideRead("false")).toBe(false);
    expect(parseStoredHideRead(null)).toBe(false);
    expect(parseStoredHideRead("1")).toBe(false);
  });
});

describe("parseStoredWallLibraries", () => {
  const available = new Set(["Bacs à sable", "Archives"]);

  it("keeps known libraries and drops duplicates", () => {
    expect(
      parseStoredWallLibraries(
        JSON.stringify(["Bacs à sable", "Inconnue", "Archives", "Bacs à sable"]),
        available
      )
    ).toEqual(["Bacs à sable", "Archives"]);
  });

  it("returns an empty selection for missing or non-array values", () => {
    expect(parseStoredWallLibraries(null, available)).toEqual([]);
    expect(parseStoredWallLibraries("", available)).toEqual([]);
    expect(parseStoredWallLibraries(JSON.stringify({}), available)).toEqual([]);
    expect(parseStoredWallLibraries(JSON.stringify([42, null]), available)).toEqual([]);
  });

  it("tolerates malformed JSON without losing the other filter", () => {
    expect(parseStoredWallLibraries("[Bacs à sable", available)).toEqual([]);
  });
});
