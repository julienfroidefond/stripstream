import { describe, expect, it } from "vitest";

import { cacheTags } from "./cacheConstants";
import { CACHE_TTL, cacheProfile } from "./cacheProfiles";

describe("CACHE_TTL", () => {
  it("keeps the historical provider durations", () => {
    expect(CACHE_TTL).toEqual({ long: 300, medium: 120, short: 30 });
  });
});

describe("cacheProfile.books", () => {
  it("always carries the global book-list tag", () => {
    expect(cacheProfile.books()).toEqual({
      revalidate: CACHE_TTL.medium,
      tags: [cacheTags.allSeriesBooks],
    });
  });

  it("adds the series tag when the filter names a series", () => {
    expect(cacheProfile.books({ seriesId: "s1" }).tags).toEqual([
      cacheTags.allSeriesBooks,
      cacheTags.seriesBooks("s1"),
    ]);
  });

  it("adds the library tag when the filter names a library", () => {
    expect(cacheProfile.books({ libraryId: "lib1" }).tags).toEqual([
      cacheTags.allSeriesBooks,
      cacheTags.libraryBooks("lib1"),
    ]);
  });

  it("orders series before library when both are set", () => {
    expect(cacheProfile.books({ seriesId: "s1", libraryId: "lib1" }).tags).toEqual([
      cacheTags.allSeriesBooks,
      cacheTags.seriesBooks("s1"),
      cacheTags.libraryBooks("lib1"),
    ]);
  });

  it("ignores empty identifiers", () => {
    expect(cacheProfile.books({ seriesId: null, libraryId: "" }).tags).toEqual([
      cacheTags.allSeriesBooks,
    ]);
  });
});

describe("cacheProfile — per-read profiles", () => {
  it.each([
    ["libraries", cacheProfile.libraries(), { revalidate: 300 }],
    [
      "librarySeries",
      cacheProfile.librarySeries("lib1"),
      { revalidate: 120, tags: ["library-series", "library-series:lib1"] },
    ],
    ["readerBook", cacheProfile.readerBook(), { cache: "no-store" }],
    ["bookPages", cacheProfile.bookPages(), { revalidate: 30 }],
    ["readProgress", cacheProfile.readProgress(), { revalidate: 30 }],
    ["nextBook", cacheProfile.nextBook(), { revalidate: 30 }],
    ["search", cacheProfile.search(), { revalidate: 30 }],
    ["series", cacheProfile.series(), { revalidate: 120 }],
    ["home", cacheProfile.home(), { revalidate: 120, tags: ["home-data"] }],
    ["readingLists", cacheProfile.readingLists(), { revalidate: 120, tags: ["home-data"] }],
    ["readingListDetail", cacheProfile.readingListDetail(), { revalidate: 120 }],
    [
      "shelvedSeries",
      cacheProfile.shelvedSeries(),
      { revalidate: 120, tags: ["home-data", "library-series"] },
    ],
    [
      "seriesShelf",
      cacheProfile.seriesShelf("s1"),
      { revalidate: 30, tags: ["series-shelf", "series-shelf:s1"] },
    ],
    ["readSeries", cacheProfile.readSeries(), { revalidate: 120, tags: ["ratings-list"] }],
    [
      "seriesRating",
      cacheProfile.seriesRating("s1"),
      { revalidate: 30, tags: ["series-rating", "series-rating:s1"] },
    ],
    ["favorites", cacheProfile.favorites(), { revalidate: 120, tags: ["favorites"] }],
    [
      "recommendations",
      cacheProfile.recommendations(),
      { revalidate: 120, tags: ["series-recommendations"] },
    ],
    [
      "relatedSeries",
      cacheProfile.relatedSeries("s1"),
      { revalidate: 120, tags: ["series-related:s1"] },
    ],
    ["stats", cacheProfile.stats(), { revalidate: 120, tags: ["reading-stats"] }],
  ])("%s", (_name, profile, expected) => {
    expect(profile).toEqual(expected);
  });

  it("returns a fresh object on every call", () => {
    const first = cacheProfile.home();
    first.tags?.push("mutated");

    expect(cacheProfile.home().tags).toEqual([cacheTags.home]);
  });
});
