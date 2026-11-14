import { describe, expect, it } from "vitest";

import type { NormalizedBook, NormalizedSeries } from "@/lib/providers/types";
import {
  bookProgressSignature,
  dropSettled,
  optimisticBookProgress,
  resolveBook,
  resolveSeries,
  seriesProgressSignature,
  settleOverride,
  withOverride,
  type ReadOverrides,
} from "./read-progress-overrides";

const book: NormalizedBook = {
  id: "book-1",
  libraryId: "library-1",
  title: "Tome 1",
  number: "1",
  seriesId: "series-1",
  seriesName: "Série",
  volume: 1,
  pageCount: 48,
  thumbnailUrl: "",
  media: { pageUrlTemplate: "", thumbnailUrlTemplate: "" },
  readProgress: { page: 12, completed: false, lastReadAt: "2026-11-01T10:00:00Z" },
};

const series: NormalizedSeries = {
  id: "series-1",
  name: "Série",
  bookCount: 10,
  booksReadCount: 3,
  thumbnailUrl: "",
};

const empty: ReadOverrides = new Map();

function makeBookWith(readProgress: NormalizedBook["readProgress"]): NormalizedBook {
  return { ...book, readProgress };
}

describe("optimisticBookProgress", () => {
  it("completes the book on its last page and keeps the last read date", () => {
    expect(optimisticBookProgress(book, true)).toEqual({
      page: 48,
      completed: true,
      lastReadAt: "2026-11-01T10:00:00Z",
    });
  });

  it("clears the progress when marking unread", () => {
    expect(optimisticBookProgress(book, false)).toBeNull();
  });
});

describe("resolveBook", () => {
  it("returns the server book when nothing is pending", () => {
    expect(resolveBook(empty, book)).toBe(book);
  });

  it("applies the override while the server still shows the observed state", () => {
    const overrides = withOverride(empty, book.id, {
      read: true,
      observed: bookProgressSignature(book),
    });

    expect(resolveBook(overrides, book).readProgress).toMatchObject({
      page: 48,
      completed: true,
    });
  });

  it("hands control back to the server once its state changes", () => {
    const overrides = withOverride(empty, book.id, {
      read: true,
      observed: bookProgressSignature(book),
    });
    const refreshed: NormalizedBook = {
      ...book,
      readProgress: { page: 48, completed: true, lastReadAt: null },
    };

    expect(resolveBook(overrides, refreshed)).toBe(refreshed);
  });

  it("distinguishes unread from in-progress books", () => {
    expect(bookProgressSignature({ ...book, readProgress: null })).not.toBe(
      bookProgressSignature(book)
    );
  });
});

describe("resolveSeries", () => {
  it("reports every book read or none while the override is active", () => {
    const read = withOverride(empty, series.id, {
      read: true,
      observed: seriesProgressSignature(series),
    });
    const unread = withOverride(empty, series.id, {
      read: false,
      observed: seriesProgressSignature(series),
    });

    expect(resolveSeries(read, series).booksReadCount).toBe(10);
    expect(resolveSeries(unread, series).booksReadCount).toBe(0);
  });

  it("drops a stale override when the server count moved", () => {
    const overrides = withOverride(empty, series.id, {
      read: true,
      observed: seriesProgressSignature(series),
    });
    const refreshed = { ...series, booksReadCount: 10 };

    expect(resolveSeries(overrides, refreshed)).toBe(refreshed);
  });
});

describe("withOverride", () => {
  it("adds and removes without mutating the source map", () => {
    const added = withOverride(empty, "a", { read: true, observed: "none" });
    const removed = withOverride(added, "a", null);

    expect(empty.size).toBe(0);
    expect(added.get("a")).toEqual({ read: true, observed: "none" });
    expect(removed.has("a")).toBe(false);
  });
});

describe("settled overrides", () => {
  const readBook = makeBookWith({ page: 48, completed: true, lastReadAt: null });
  const unreadBook = makeBookWith(null);

  it("keeps a recorded override while a stale server still shows the observed state", () => {
    const overrides = settleOverride(
      withOverride(new Map(), readBook.id, { read: false, observed: "done:48" }),
      readBook.id
    );

    expect(resolveBook(overrides, readBook).readProgress).toBeNull();
    expect(resolveBook(overrides, unreadBook)).toBe(unreadBook);
  });

  it("drops only the recorded overrides matching the predicate", () => {
    const overrides: ReadOverrides = new Map([
      ["a", { read: true, observed: "none", settled: true, seriesId: "s1" }],
      ["b", { read: true, observed: "none", seriesId: "s1" }],
      ["c", { read: true, observed: "none", settled: true, seriesId: "s2" }],
    ]);

    const dropped = dropSettled(overrides, (override) => override.seriesId === "s1");

    expect([...dropped.keys()]).toEqual(["b", "c"]);
    expect(dropSettled(overrides, () => false)).toBe(overrides);
  });
});
