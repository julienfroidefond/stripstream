import { describe, expect, it } from "vitest";

import type { WallItem } from "@/types/wall";
import { wallItemToSeries, wallPreloadUrls } from "./wall-cover";

function item(index: number): WallItem {
  return {
    id: `series-${index}`,
    name: `Série ${index}`,
    thumbnailUrl: `/api/komga/images/series/series-${index}/thumbnail`,
    summary: null,
    authors: [],
    genres: [],
    libraryName: "Bibliothèque",
    bookCount: 3,
    booksReadCount: 0,
    startYear: null,
    seriesStatus: null,
    missingCount: null,
    communityScore: null,
  };
}

const items = Array.from({ length: 60 }, (_, index) => item(index));

describe("wallItemToSeries", () => {
  it("keeps the fields the cover and the plaque need", () => {
    const series = wallItemToSeries({
      ...items[0],
      summary: "<p>Résumé</p>",
      authors: ["Alice", "Bob"],
      genres: ["BD"],
    });

    expect(series.id).toBe("series-0");
    expect(series.name).toBe("Série 0");
    expect(series.thumbnailUrl).toBe(items[0].thumbnailUrl);
    expect(series.authors).toEqual([
      { name: "Alice", role: "" },
      { name: "Bob", role: "" },
    ]);
    expect(series.genres).toEqual(["BD"]);
  });
});

describe("wallPreloadUrls", () => {
  it("returns a stable, unique subset of the items", () => {
    const first = wallPreloadUrls(items);
    const second = wallPreloadUrls(items);

    expect(first).toEqual(second);
    expect(first.length).toBeGreaterThan(0);
    expect(first.length).toBeLessThanOrEqual(16);
    expect(new Set(first).size).toBe(first.length);
    const available = new Set(items.map((entry) => entry.thumbnailUrl));
    for (const url of first) expect(available.has(url)).toBe(true);
  });

  it("respects the limit and handles an empty wall", () => {
    expect(wallPreloadUrls(items, 4)).toHaveLength(4);
    expect(wallPreloadUrls([])).toEqual([]);
    expect(wallPreloadUrls(items, 0)).toEqual([]);
  });
});
