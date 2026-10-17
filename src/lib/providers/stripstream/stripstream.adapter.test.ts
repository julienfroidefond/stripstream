import { describe, expect, it } from "vitest";

import type {
  StripstreamBookDetails,
  StripstreamBookItem,
  StripstreamLibraryResponse,
  StripstreamReadingListItem,
  StripstreamRecommendedSeriesItem,
  StripstreamRelatedSeriesItem,
  StripstreamSeriesItem,
} from "@/types/stripstream";

import { StripstreamAdapter } from "./stripstream.adapter";

const SENTINEL = "00000000-0000-0000-0000-000000000000";

function makeBookItem(overrides: Partial<StripstreamBookItem> = {}): StripstreamBookItem {
  return {
    id: "book-1",
    library_id: "lib-1",
    kind: "comic",
    title: "Book Title",
    updated_at: "2026-01-01T00:00:00Z",
    reading_status: "unread",
    volume_type: "volume",
    ...overrides,
  };
}

function makeBookDetails(
  overrides: Partial<StripstreamBookDetails> = {}
): StripstreamBookDetails {
  return {
    id: "book-1",
    library_id: "lib-1",
    kind: "comic",
    title: "Book Title",
    reading_status: "unread",
    volume_type: "volume",
    ...overrides,
  };
}

function makeSeriesItem(overrides: Partial<StripstreamSeriesItem> = {}): StripstreamSeriesItem {
  return {
    series_id: "series-1",
    name: "Series Name",
    book_count: 3,
    books_read_count: 1,
    first_book_id: "book-1",
    library_id: "lib-1",
    ...overrides,
  };
}

function makeRelated(overrides: Partial<StripstreamRelatedSeriesItem> = {}): StripstreamRelatedSeriesItem {
  return {
    series_id: "series-1",
    name: "Series Name",
    book_count: 3,
    books_read_count: 1,
    library_id: "lib-1",
    score: 0.9,
    match_reasons: ["same author"],
    first_book_id: "book-1",
    ...overrides,
  };
}

function makeReadingListItem(
  overrides: Partial<StripstreamReadingListItem> = {}
): StripstreamReadingListItem {
  return {
    id: "list-1",
    name: "List Name",
    cover_url: null,
    first_book_id: "book-1",
    library_id: "lib-1",
    library_name: "Library",
    position: 0,
    book_count: 3,
    books_read_count: 1,
    ...overrides,
  };
}

function makeRecommended(
  overrides: Partial<StripstreamRecommendedSeriesItem> = {}
): StripstreamRecommendedSeriesItem {
  return {
    series_id: "series-1",
    name: "Series Name",
    library_id: "lib-1",
    book_count: 3,
    score: 0.8,
    because_of: ["Another Series"],
    match_reasons: ["same genre"],
    description: null,
    authors: [],
    genres: [],
    ...overrides,
  };
}

describe("StripstreamAdapter.toNormalizedReadProgress", () => {
  it("returns null when there is no progress", () => {
    expect(StripstreamAdapter.toNormalizedReadProgress(null)).toBeNull();
  });

  it("maps status, page and last read date", () => {
    expect(
      StripstreamAdapter.toNormalizedReadProgress({
        status: "read",
        current_page: 20,
        last_read_at: "2026-02-01T00:00:00Z",
      })
    ).toEqual({ page: 20, completed: true, lastReadAt: "2026-02-01T00:00:00Z" });
  });

  it("defaults page and last read date to null", () => {
    expect(StripstreamAdapter.toNormalizedReadProgress({ status: "reading" })).toEqual({
      page: null,
      completed: false,
      lastReadAt: null,
    });
  });
});

describe("StripstreamAdapter.toNormalizedBook", () => {
  it("maps the core fields", () => {
    expect(StripstreamAdapter.toNormalizedBook(makeBookItem())).toMatchObject({
      id: "book-1",
      libraryId: "lib-1",
      title: "Book Title",
      number: null,
      seriesId: null,
      volume: null,
      pageCount: 0,
      thumbnailUrl: "/api/stripstream/images/books/book-1/thumbnail",
      downloadUrl: "/api/stripstream/books/book-1/file",
      readProgress: null,
      volumeType: "volume",
    });
  });

  it("stringifies a numeric volume and keeps volume 0", () => {
    expect(StripstreamAdapter.toNormalizedBook(makeBookItem({ volume: 2 })).number).toBe("2");
    expect(StripstreamAdapter.toNormalizedBook(makeBookItem({ volume: 0 })).number).toBe("0");
  });

  it("prefers series_id over the series name and falls back", () => {
    expect(
      StripstreamAdapter.toNormalizedBook(makeBookItem({ series_id: "uuid-1", series: "Name" }))
        .seriesId
    ).toBe("uuid-1");
    expect(
      StripstreamAdapter.toNormalizedBook(makeBookItem({ series: "Name" })).seriesId
    ).toBe("Name");
    expect(StripstreamAdapter.toNormalizedBook(makeBookItem()).seriesId).toBeNull();
  });

  it("returns null progress for an unread book with no page", () => {
    expect(StripstreamAdapter.toNormalizedBook(makeBookItem()).readProgress).toBeNull();
  });

  it("builds progress once a page is recorded", () => {
    expect(
      StripstreamAdapter.toNormalizedBook(
        makeBookItem({ reading_status: "reading", reading_current_page: 5 })
      ).readProgress
    ).toEqual({ page: 5, completed: false, lastReadAt: null });
  });

  it("marks a read book as completed", () => {
    expect(
      StripstreamAdapter.toNormalizedBook(
        makeBookItem({ reading_status: "read", reading_current_page: 9 })
      ).readProgress
    ).toEqual({ page: 9, completed: true, lastReadAt: null });
  });
});

describe("StripstreamAdapter.toNormalizedBookDetails", () => {
  it("prefers series_id over the series name", () => {
    const details = makeBookDetails({ series_id: "uuid-1", series: "Name" });
    expect(StripstreamAdapter.toNormalizedBookDetails(details).seriesId).toBe("uuid-1");
  });

  it("trims the summary and nulls out whitespace-only summaries", () => {
    expect(
      StripstreamAdapter.toNormalizedBookDetails(makeBookDetails({ summary: "  hi  " })).summary
    ).toBe("hi");
    expect(
      StripstreamAdapter.toNormalizedBookDetails(makeBookDetails({ summary: "   " })).summary
    ).toBeNull();
  });

  it("returns null progress for an unread book with no page", () => {
    expect(
      StripstreamAdapter.toNormalizedBookDetails(makeBookDetails()).readProgress
    ).toBeNull();
  });
});

describe("StripstreamAdapter.toNormalizedSeries", () => {
  it("maps the series metadata", () => {
    const normalized = StripstreamAdapter.toNormalizedSeries(
      makeSeriesItem({
        description: "  Description  ",
        authors: ["Auteur"],
        genres: ["Action"],
        start_year: 2010,
        missing_count: 2,
        series_status: "ONGOING",
        community_score: 4,
        user_rating: 8,
      })
    );

    expect(normalized).toMatchObject({
      id: "series-1",
      name: "Series Name",
      bookCount: 3,
      booksReadCount: 1,
      libraryId: "lib-1",
      thumbnailUrl: "/api/stripstream/images/books/book-1/thumbnail",
      summary: "Description",
      authors: [{ name: "Auteur", role: "" }],
      genres: ["Action"],
      tags: [],
      createdAt: null,
      startYear: 2010,
      missingCount: 2,
      seriesStatus: "ONGOING",
      communityScore: 4,
      userRating: 8,
    });
  });

  it("falls back to the cover URL when the first book id is missing", () => {
    expect(
      StripstreamAdapter.toNormalizedSeries(
        makeSeriesItem({ first_book_id: null, cover_url: "cover.jpg" })
      ).thumbnailUrl
    ).toBe("cover.jpg");
  });

  it("falls back to the cover URL for the sentinel first-book UUID", () => {
    expect(
      StripstreamAdapter.toNormalizedSeries(
        makeSeriesItem({ first_book_id: SENTINEL, cover_url: "cover.jpg" })
      ).thumbnailUrl
    ).toBe("cover.jpg");
  });

  it("uses an empty string when neither id nor cover is available", () => {
    expect(
      StripstreamAdapter.toNormalizedSeries(
        makeSeriesItem({ first_book_id: null, cover_url: null })
      ).thumbnailUrl
    ).toBe("");
  });
});

describe("StripstreamAdapter.toNormalizedRelatedSeries", () => {
  it("maps the related series with its match reasons", () => {
    expect(StripstreamAdapter.toNormalizedRelatedSeries(makeRelated())).toMatchObject({
      id: "series-1",
      name: "Series Name",
      bookCount: 3,
      booksReadCount: 1,
      libraryId: "lib-1",
      thumbnailUrl: "/api/stripstream/images/books/book-1/thumbnail",
      summary: null,
      authors: [],
      genres: [],
      matchReasons: ["same author"],
    });
  });

  it("falls back to the cover URL for the sentinel first-book UUID", () => {
    expect(
      StripstreamAdapter.toNormalizedRelatedSeries(
        makeRelated({ first_book_id: SENTINEL, cover_url: "cover.jpg" })
      ).thumbnailUrl
    ).toBe("cover.jpg");
  });
});

describe("StripstreamAdapter.toNormalizedReadingListSeries", () => {
  it("uses the list item id and nulls metadata it does not carry", () => {
    expect(StripstreamAdapter.toNormalizedReadingListSeries(makeReadingListItem())).toMatchObject({
      id: "list-1",
      name: "List Name",
      bookCount: 3,
      booksReadCount: 1,
      libraryId: "lib-1",
      thumbnailUrl: "/api/stripstream/images/books/book-1/thumbnail",
      summary: null,
      seriesStatus: null,
      tags: [],
    });
  });

  it("falls back to the cover URL when the first book id is missing", () => {
    expect(
      StripstreamAdapter.toNormalizedReadingListSeries(
        makeReadingListItem({ first_book_id: null, cover_url: "cover.jpg" })
      ).thumbnailUrl
    ).toBe("cover.jpg");
  });
});

describe("StripstreamAdapter.toNormalizedRecommendedSeries", () => {
  it("maps the recommendation and reports zero books read", () => {
    expect(
      StripstreamAdapter.toNormalizedRecommendedSeries(
        makeRecommended({
          description: "  Desc  ",
          authors: ["Auteur"],
          genres: ["Drama"],
        })
      )
    ).toMatchObject({
      id: "series-1",
      name: "Series Name",
      bookCount: 3,
      booksReadCount: 0,
      libraryId: "lib-1",
      summary: "Desc",
      authors: [{ name: "Auteur", role: "" }],
      genres: ["Drama"],
      matchReasons: ["same genre"],
      becauseOf: ["Another Series"],
    });
  });

  it("falls back to the cover URL for the sentinel first-book UUID", () => {
    expect(
      StripstreamAdapter.toNormalizedRecommendedSeries(
        makeRecommended({ first_book_id: SENTINEL, cover_url: "cover.jpg" })
      ).thumbnailUrl
    ).toBe("cover.jpg");
  });
});

describe("StripstreamAdapter.toNormalizedLibrary", () => {
  it("maps the library fields", () => {
    const library: StripstreamLibraryResponse = {
      id: "lib-1",
      name: "Library",
      root_path: "/root",
      enabled: true,
      book_count: 10,
      monitor_enabled: false,
      scan_mode: "auto",
      watcher_enabled: true,
    };
    expect(StripstreamAdapter.toNormalizedLibrary(library)).toEqual({
      id: "lib-1",
      name: "Library",
      bookCount: 10,
    });
  });
});
