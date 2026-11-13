import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  updateTag: vi.fn(),
  revalidatePath: vi.fn(),
}));

import { revalidatePath, updateTag } from "next/cache";
import {
  cacheTags,
  SERIES_RECOMMENDATIONS_CACHE_TAG,
  SERIES_RELATED_CACHE_TAG,
} from "@/constants/cacheConstants";
import {
  invalidateConnectionChange,
  invalidateFavorites,
  invalidateForRefresh,
  invalidateLibraryScan,
  invalidatePreferences,
  invalidateReadProgress,
  invalidateSeriesRating,
  invalidateSeriesShelf,
} from "./invalidation";

const updatedTags = () => vi.mocked(updateTag).mock.calls.map(([tag]) => tag);
const revalidatedPaths = () => vi.mocked(revalidatePath).mock.calls.map(([path]) => path);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("cacheTags — vocabulaire", () => {
  it("builds per-id tags from the shared constants", () => {
    expect(cacheTags.seriesBooks("s1")).toBe("series-books:s1");
    expect(cacheTags.seriesRating("s1")).toBe("series-rating:s1");
    expect(cacheTags.seriesShelf("s1")).toBe("series-shelf:s1");
    expect(cacheTags.seriesRelated("s1")).toBe(`${SERIES_RELATED_CACHE_TAG}:s1`);
    expect(cacheTags.seriesRecommendations).toBe(SERIES_RECOMMENDATIONS_CACHE_TAG);
  });
});

describe("invalidateReadProgress", () => {
  it("targets the series' book list instead of the global one", () => {
    invalidateReadProgress("s1");

    expect(updatedTags()).toEqual([
      cacheTags.home,
      cacheTags.allLibrarySeries,
      cacheTags.ratingsList,
      cacheTags.stats,
      cacheTags.seriesBooks("s1"),
    ]);
    expect(updatedTags()).not.toContain(cacheTags.allSeriesBooks);
  });

  it("falls back to the global book list when the series is unknown", () => {
    invalidateReadProgress(null);

    expect(updatedTags()).toContain(cacheTags.allSeriesBooks);
    expect(updatedTags().some((tag) => tag.startsWith("series-books:"))).toBe(false);
  });
});

describe("invalidateSeriesRating", () => {
  it("stays granular and does not invalidate the global rating tag", () => {
    invalidateSeriesRating("s1");

    expect(updatedTags()).toEqual([cacheTags.seriesRating("s1"), cacheTags.ratingsList]);
  });
});

describe("invalidateSeriesShelf", () => {
  it("revalidates the library only when its id is known", () => {
    invalidateSeriesShelf("s1", "lib1");

    expect(updatedTags()).toEqual([
      cacheTags.home,
      cacheTags.seriesShelf("s1"),
      cacheTags.librarySeries("lib1"),
    ]);
    expect(revalidatedPaths()).toEqual([
      "/",
      "/in-progress",
      "/series/s1",
      "/libraries/lib1",
    ]);
  });

  it("invalidates every library list when the library is unknown", () => {
    invalidateSeriesShelf("s1");

    expect(updatedTags()).toContain(cacheTags.allLibrarySeries);
    expect(revalidatedPaths()).not.toContain("/libraries/lib1");
  });
});

describe("invalidateFavorites", () => {
  it("invalidates the favorites list and the home that displays it", () => {
    invalidateFavorites();

    expect(updatedTags()).toEqual([cacheTags.favorites, cacheTags.home]);
  });
});

describe("invalidateConnectionChange", () => {
  it("expires every provider-scoped list and the settings route", () => {
    invalidateConnectionChange();

    expect(updatedTags()).toEqual([
      cacheTags.home,
      cacheTags.allLibrarySeries,
      cacheTags.allSeriesBooks,
      cacheTags.favorites,
    ]);
    expect(revalidatedPaths()).toEqual(["/settings", "/"]);
  });
});

describe("invalidateLibraryScan", () => {
  it("revalidates the library routes without expiring any tag", () => {
    invalidateLibraryScan("lib1");

    expect(updateTag).not.toHaveBeenCalled();
    expect(revalidatedPaths()).toEqual(["/libraries/lib1", "/libraries"]);
  });
});

describe("invalidatePreferences", () => {
  it("revalidates the routes that render preferences on the server", () => {
    invalidatePreferences();

    expect(updateTag).not.toHaveBeenCalled();
    expect(revalidatedPaths()).toEqual(["/", "/libraries", "/series"]);
  });
});

describe("invalidateForRefresh", () => {
  it("targets the series' book list even when it was cached from another route", () => {
    invalidateForRefresh("series", "s1");

    expect(updatedTags()).toEqual([cacheTags.seriesBooks("s1")]);
    expect(revalidatedPaths()).toEqual(["/series/s1", "/series"]);
  });

  it("has no tag to invalidate for a book: the reader reads through no-store", () => {
    invalidateForRefresh("book", "b1");

    expect(updateTag).not.toHaveBeenCalled();
    expect(revalidatedPaths()).toEqual(["/books/b1"]);
  });
});
