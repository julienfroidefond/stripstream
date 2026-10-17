import { describe, expect, it } from "vitest";

import type { KomgaBook, KomgaLibrary, KomgaSeries, ReadProgress } from "@/types/komga";

import { KomgaAdapter } from "./komga.adapter";

function makeBook(overrides: Partial<KomgaBook> = {}): KomgaBook {
  return {
    id: "book-1",
    seriesId: "series-1",
    seriesTitle: "Series One",
    libraryId: "lib-1",
    name: "Book Name",
    url: "/book-1",
    number: 1,
    created: "2026-01-01T00:00:00Z",
    lastModified: "2026-01-01T00:00:00Z",
    fileLastModified: "2026-01-01T00:00:00Z",
    sizeBytes: 123,
    size: "123 B",
    media: { status: "READY", mediaType: "application/zip", pagesCount: 42 },
    metadata: {
      title: "Metadata Title",
      titleSort: "Metadata Title",
      summary: "  A summary  ",
      number: "1",
      authors: [{ name: "Auteur", role: "writer" }],
      tags: ["tag"],
      releaseDate: "2020-01-01",
      isbn: "",
    },
    readProgress: null,
    deleted: false,
    ...overrides,
  };
}

function makeSeries(overrides: Partial<KomgaSeries> = {}): KomgaSeries {
  return {
    id: "series-1",
    libraryId: "lib-1",
    name: "Series Name",
    url: "/series-1",
    created: "2026-01-01T00:00:00Z",
    lastModified: "2026-01-01T00:00:00Z",
    fileLastModified: "2026-01-01T00:00:00Z",
    booksCount: 3,
    booksReadCount: 1,
    booksUnreadCount: 2,
    booksInProgressCount: 0,
    metadata: {
      status: "ONGOING",
      title: "Meta Title",
      titleSort: "Meta Title",
      summary: "Meta summary",
      publisher: "Editeur",
      readingDirection: "LEFT_TO_RIGHT",
      ageRating: null,
      language: "fr",
      genres: ["Action"],
      tags: ["tag"],
    },
    booksMetadata: {
      created: "2026-01-01T00:00:00Z",
      lastModified: "2026-01-01T00:00:00Z",
      authors: [{ name: "Auteur", role: "writer" }],
    },
    deleted: false,
    oneshot: false,
    favorite: false,
    ...overrides,
  };
}

function makeLibrary(overrides: Partial<KomgaLibrary> = {}): KomgaLibrary {
  return {
    id: "lib-1",
    name: "Library",
    root: "/root",
    importLastModified: "2026-01-01T00:00:00Z",
    lastModified: "2026-01-01T00:00:00Z",
    unavailable: false,
    booksCount: 10,
    booksReadCount: 4,
    ...overrides,
  };
}

describe("KomgaAdapter.toNormalizedReadProgress", () => {
  it("returns null when there is no read progress", () => {
    expect(KomgaAdapter.toNormalizedReadProgress(null)).toBeNull();
  });

  it("maps page, completion and read date", () => {
    const progress: ReadProgress = {
      page: 12,
      completed: true,
      readDate: "2026-02-01T00:00:00Z",
      created: "2026-01-01T00:00:00Z",
      lastModified: "2026-01-01T00:00:00Z",
    };
    expect(KomgaAdapter.toNormalizedReadProgress(progress)).toEqual({
      page: 12,
      completed: true,
      lastReadAt: "2026-02-01T00:00:00Z",
    });
  });
});

describe("KomgaAdapter.toNormalizedBook", () => {
  it("maps the core fields and trims the summary", () => {
    const normalized = KomgaAdapter.toNormalizedBook(makeBook());

    expect(normalized).toMatchObject({
      id: "book-1",
      libraryId: "lib-1",
      title: "Metadata Title",
      number: "1",
      seriesId: "series-1",
      volume: 1,
      pageCount: 42,
      thumbnailUrl: "/api/komga/images/books/book-1/thumbnail",
      downloadUrl: "/api/komga/books/book-1/file",
      readProgress: null,
      summary: "A summary",
    });
  });

  it("falls back to the book name when the metadata title is empty", () => {
    const book = makeBook({
      metadata: { ...makeBook().metadata, title: "" },
    });
    expect(KomgaAdapter.toNormalizedBook(book).title).toBe("Book Name");
  });

  it("maps an existing read progress", () => {
    const book = makeBook({
      readProgress: {
        page: 3,
        completed: false,
        readDate: null,
        created: "2026-01-01T00:00:00Z",
        lastModified: "2026-01-01T00:00:00Z",
      },
    });
    expect(KomgaAdapter.toNormalizedBook(book).readProgress).toEqual({
      page: 3,
      completed: false,
      lastReadAt: null,
    });
  });

  it("returns a null volume when the book number is not numeric", () => {
    const book = makeBook({ number: undefined as unknown as number });
    expect(KomgaAdapter.toNormalizedBook(book).volume).toBeNull();
  });

  it("defaults pagesCount to 0 and summary to null when absent", () => {
    const book = makeBook({
      media: { status: "UNKNOWN", mediaType: "", pagesCount: undefined as unknown as number },
      metadata: { ...makeBook().metadata, summary: "   " },
    });
    const normalized = KomgaAdapter.toNormalizedBook(book);
    expect(normalized.pageCount).toBe(0);
    expect(normalized.summary).toBeNull();
  });

  it("returns a null seriesId when absent", () => {
    const book = makeBook({ seriesId: undefined as unknown as string });
    expect(KomgaAdapter.toNormalizedBook(book).seriesId).toBeNull();
  });
});

describe("KomgaAdapter.toNormalizedSeries", () => {
  it("maps series metadata, authors, genres and tags", () => {
    const normalized = KomgaAdapter.toNormalizedSeries(makeSeries());

    expect(normalized).toMatchObject({
      id: "series-1",
      name: "Meta Title",
      bookCount: 3,
      booksReadCount: 1,
      thumbnailUrl: "/api/komga/images/series/series-1/thumbnail",
      libraryId: "lib-1",
      summary: "Meta summary",
      authors: [{ name: "Auteur", role: "writer" }],
      genres: ["Action"],
      tags: ["tag"],
      createdAt: "2026-01-01T00:00:00Z",
    });
  });

  it("falls back to the series name and null metadata", () => {
    const series = makeSeries({
      metadata: undefined as unknown as KomgaSeries["metadata"],
    });
    const normalized = KomgaAdapter.toNormalizedSeries(series);

    expect(normalized.name).toBe("Series Name");
    expect(normalized.summary).toBeNull();
    expect(normalized.authors).toEqual([{ name: "Auteur", role: "writer" }]);
  });
});

describe("KomgaAdapter.toNormalizedLibrary", () => {
  it("maps the library fields", () => {
    expect(KomgaAdapter.toNormalizedLibrary(makeLibrary())).toEqual({
      id: "lib-1",
      name: "Library",
      bookCount: 10,
      booksReadCount: 4,
    });
  });
});
