import { describe, expect, it } from "vitest";

import type { NormalizedBook, NormalizedSeries } from "@/lib/providers/types";
import {
  buildResumeEntries,
  getBookProgressPercent,
  getSeriesProgressPercent,
  mergeResumeBooks,
} from "./resume-state";

function series(
  id: string,
  overrides: Partial<NormalizedSeries> = {}
): NormalizedSeries {
  return {
    id,
    name: `Série ${id}`,
    bookCount: 6,
    booksReadCount: 2,
    thumbnailUrl: "",
    ...overrides,
  };
}

function book(
  id: string,
  overrides: Partial<NormalizedBook> = {}
): NormalizedBook {
  return {
    id,
    libraryId: "lib-1",
    title: `Tome ${id}`,
    number: id,
    seriesId: "s1",
    volume: null,
    pageCount: 100,
    thumbnailUrl: "",
    readProgress: null,
    ...overrides,
  };
}

describe("mergeResumeBooks", () => {
  it("puts on-deck books first and deduplicates by id", () => {
    const onDeck = [book("b1"), book("b2")];
    const ongoingBooks = [book("b2"), book("b3")];

    const merged = mergeResumeBooks({ onDeck, ongoingBooks });

    expect(merged.map((item) => item.id)).toEqual(["b1", "b2", "b3"]);
  });

  it("keeps the on-deck copy when a book appears in both feeds", () => {
    const fromOnDeck = book("b1", { readProgress: { page: null, completed: false, lastReadAt: null } });
    const fromOngoing = book("b1", { readProgress: { page: 12, completed: false, lastReadAt: "2026-06-01T10:00:00.000Z" } });

    const merged = mergeResumeBooks({
      onDeck: [fromOnDeck],
      ongoingBooks: [fromOngoing],
    });

    expect(merged).toEqual([fromOnDeck]);
  });

  it("handles missing feeds", () => {
    expect(mergeResumeBooks({})).toEqual([]);
    expect(mergeResumeBooks({ onDeck: null, ongoingBooks: null })).toEqual([]);
  });
});

describe("getBookProgressPercent", () => {
  it("computes page progress and ignores books without pagination", () => {
    const reading = book("b1", {
      pageCount: 200,
      readProgress: { page: 50, completed: false, lastReadAt: null },
    });

    expect(getBookProgressPercent(reading)).toBe(25);
    expect(getBookProgressPercent(book("b2"))).toBeNull();
    expect(getBookProgressPercent(null)).toBeNull();
  });

  it("treats an empty page and a missing page count as unknown", () => {
    expect(
      getBookProgressPercent(
        book("b1", {
          readProgress: { page: 0, completed: false, lastReadAt: null },
        })
      )
    ).toBeNull();
    expect(
      getBookProgressPercent(
        book("b1", {
          pageCount: 0,
          readProgress: { page: 10, completed: false, lastReadAt: null },
        })
      )
    ).toBeNull();
  });

  it("clamps the result at 100", () => {
    expect(
      getBookProgressPercent(
        book("b1", {
          pageCount: 100,
          readProgress: { page: 140, completed: false, lastReadAt: null },
        })
      )
    ).toBe(100);
  });
});

describe("getSeriesProgressPercent", () => {
  it("computes the read share of the series", () => {
    expect(
      getSeriesProgressPercent(series("s1", { bookCount: 8, booksReadCount: 3 }))
    ).toBe(38);
  });

  it("returns zero for an empty series and clamps at 100", () => {
    expect(
      getSeriesProgressPercent(series("s1", { bookCount: 0, booksReadCount: 2 }))
    ).toBe(0);
    expect(
      getSeriesProgressPercent(series("s1", { bookCount: 3, booksReadCount: 5 }))
    ).toBe(100);
  });
});

describe("buildResumeEntries", () => {
  it("matches the series by id and computes the book progress", () => {
    const entries = buildResumeEntries(
      [
        book("b1", {
          seriesId: "s1",
          readProgress: { page: 40, completed: false, lastReadAt: null },
        }),
      ],
      [series("s1")]
    );

    expect(entries).toEqual([
      {
        book: expect.objectContaining({ id: "b1" }),
        series: series("s1"),
        progressPercent: 40,
      },
    ]);
  });

  it("matches a series name without case or accents", () => {
    const [entry] = buildResumeEntries(
      [book("b1", { seriesId: "ete" })],
      [series("s1", { name: "Été" })]
    );

    expect(entry.series?.id).toBe("s1");
  });

  it("uses the library to disambiguate same-name series", () => {
    const [entry] = buildResumeEntries(
      [book("b1", { libraryId: "lib-b", seriesId: "same" })],
      [
        series("a", { name: "Same", libraryId: "lib-a" }),
        series("b", { name: "Same", libraryId: "lib-b" }),
      ]
    );

    expect(entry.series?.id).toBe("b");
  });

  it("prefers an exact library match over a candidate without a library", () => {
    const [entry] = buildResumeEntries(
      [book("b1", { libraryId: "lib-b", seriesId: "same" })],
      [
        series("unknown", { name: "Same" }),
        series("known", { name: "Same", libraryId: "lib-b" }),
      ]
    );

    expect(entry.series?.id).toBe("known");
  });

  it("keeps the book with a null series when the pool has no match", () => {
    const [entry] = buildResumeEntries(
      [book("b1", { seriesId: "missing" })],
      [series("s1")]
    );

    expect(entry.book.id).toBe("b1");
    expect(entry.series).toBeNull();
    expect(entry.progressPercent).toBeNull();
  });

  it("preserves the input order", () => {
    const entries = buildResumeEntries(
      [book("b1", { seriesId: "s1" }), book("b2", { seriesId: "s2" })],
      [series("s1"), series("s2")]
    );

    expect(entries.map((entry) => entry.book.id)).toEqual(["b1", "b2"]);
  });
});
