import { describe, expect, it } from "vitest";

import { isSpecialBook } from "@/lib/books/volume-type";
import { mergeMissingBooks, splitBooksByVolumeType } from "./bookGrouping";
import type { NormalizedBook, NormalizedMissingBook } from "@/lib/providers/types";

function makeBook(id: string, volumeType: string | null): NormalizedBook {
  return {
    id,
    libraryId: "lib-1",
    title: id,
    number: null,
    seriesId: null,
    seriesName: null,
    volume: null,
    pageCount: 0,
    thumbnailUrl: "",
    media: { pageUrlTemplate: "/pages/{page}", thumbnailUrlTemplate: "/pages/{page}" },
    readProgress: null,
    volumeType,
  };
}

describe("isSpecialBook", () => {
  it("keeps regular volumes in the main list", () => {
    expect(isSpecialBook(makeBook("v1", "regular"))).toBe(false);
  });

  it("keeps intégrales with the regular volumes", () => {
    expect(isSpecialBook(makeBook("int", "integral"))).toBe(false);
  });

  it("treats hors-série and one-shots as side content", () => {
    expect(isSpecialBook(makeBook("hs", "hs"))).toBe(true);
    expect(isSpecialBook(makeBook("os", "oneshot"))).toBe(true);
  });

  it("treats books without a volume type as regular", () => {
    expect(isSpecialBook(makeBook("none", null))).toBe(false);
  });
});

describe("splitBooksByVolumeType", () => {
  it("keeps intégrales out of the Hors-série section", () => {
    const books = [
      makeBook("v1", "regular"),
      makeBook("int", "integral"),
      makeBook("hs", "hs"),
      makeBook("os", "oneshot"),
    ];

    const { regularBooks, specialBooks } = splitBooksByVolumeType(books);

    expect(regularBooks.map((b) => b.id)).toEqual(["v1", "int"]);
    expect(specialBooks.map((b) => b.id)).toEqual(["hs", "os"]);
  });

  it("returns every book when none is special", () => {
    const books = [makeBook("v1", "regular"), makeBook("int", "integral")];
    expect(splitBooksByVolumeType(books).specialBooks).toEqual([]);
    expect(splitBooksByVolumeType(books).regularBooks).toHaveLength(2);
  });
});

function makeVolume(id: string, volume: number | null): NormalizedBook {
  return { ...makeBook(id, "regular"), volume };
}

function missing(volumeNumber: number, coverUrl: string | null = null): NormalizedMissingBook {
  return { title: `Tome ${volumeNumber}`, volumeNumber, coverUrl };
}

describe("mergeMissingBooks", () => {
  it("wraps books unchanged when nothing is missing", () => {
    const books = [makeVolume("v2", 2), makeVolume("v1", 1)];

    const merged = mergeMissingBooks(books, []);

    expect(merged).toEqual([
      { kind: "book", key: "v2", book: books[0] },
      { kind: "book", key: "v1", book: books[1] },
    ]);
  });

  it("interleaves placeholders by volume number", () => {
    const merged = mergeMissingBooks(
      [makeVolume("v1", 1), makeVolume("v4", 4)],
      [missing(3, "/cover-3.webp"), missing(2)]
    );

    expect(merged.map((entry) => entry.key)).toEqual(["v1", "missing-2", "missing-3", "v4"]);
    expect(merged[2]).toEqual({
      kind: "missing",
      key: "missing-3",
      title: "Tome 3",
      volume: 3,
      coverUrl: "/cover-3.webp",
    });
  });

  it("keeps books without a volume number last, in provider order", () => {
    const merged = mergeMissingBooks(
      [makeVolume("a", null), makeVolume("v2", 2), makeVolume("b", null)],
      [missing(1)]
    );

    expect(merged.map((entry) => entry.key)).toEqual(["missing-1", "v2", "a", "b"]);
  });

  it("puts the real book before a placeholder of the same volume", () => {
    const merged = mergeMissingBooks([makeVolume("v2", 2)], [missing(2)]);

    expect(merged.map((entry) => entry.kind)).toEqual(["book", "missing"]);
  });

  it("does not mutate its inputs", () => {
    const books = [makeVolume("v3", 3), makeVolume("v1", 1)];
    const absent = [missing(2)];

    mergeMissingBooks(books, absent);

    expect(books.map((book) => book.id)).toEqual(["v3", "v1"]);
    expect(absent).toEqual([missing(2)]);
  });
});
