import { describe, expect, it } from "vitest";

import { isSpecialBook, splitBooksByVolumeType } from "./bookGrouping";
import type { NormalizedBook } from "@/lib/providers/types";

function makeBook(id: string, volumeType: string | null): NormalizedBook {
  return {
    id,
    libraryId: "lib-1",
    title: id,
    number: null,
    seriesId: null,
    volume: null,
    pageCount: 0,
    thumbnailUrl: "",
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
