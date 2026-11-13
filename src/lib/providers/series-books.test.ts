import { describe, expect, it } from "vitest";

import { getAllSeriesBooks } from "./series-books";
import type { BookListFilter, IMediaProvider } from "./provider.interface";
import type { NormalizedBook, NormalizedBooksPage } from "./types";

function makeBook(id: string): NormalizedBook {
  return {
    id,
    libraryId: "lib-1",
    title: id,
    number: null,
    seriesId: "series-1",
    seriesName: null,
    volume: null,
    pageCount: 10,
    thumbnailUrl: "",
    media: { pageUrlTemplate: "/pages/{page}", thumbnailUrlTemplate: "/pages/{page}" },
    readProgress: null,
  };
}

/**
 * Provider factice qui sert des pages par numéro (1-based), comme le contrat,
 * en enregistrant les filtres reçus.
 */
function stubProvider(pages: string[][], totalPages = pages.length): {
  provider: Pick<IMediaProvider, "getBooks">;
  calls: BookListFilter[];
} {
  const calls: BookListFilter[] = [];
  const totalElements = pages.reduce((sum, ids) => sum + ids.length, 0);
  const getBooks = async (filter: BookListFilter): Promise<NormalizedBooksPage> => {
    calls.push(filter);
    const page = filter.page ?? 1;
    return {
      items: (pages[page - 1] ?? []).map(makeBook),
      page,
      totalPages,
      totalElements,
    };
  };
  return { provider: { getBooks }, calls };
}

describe("getAllSeriesBooks", () => {
  it("requests each page number once, in order", async () => {
    const { provider, calls } = stubProvider([["1", "2"], ["3", "4"], ["5"]]);

    const books = await getAllSeriesBooks(provider, "series-1");

    expect(books.map((b) => b.id)).toEqual(["1", "2", "3", "4", "5"]);
    expect(calls.map((c) => c.page)).toEqual([1, 2, 3]);
    expect(calls[0]).toMatchObject({ seriesId: "series-1", limit: 100, unreadOnly: false });
  });

  it("stops on the first empty page even when more pages are announced", async () => {
    const { provider, calls } = stubProvider([["1"], []], 5);

    const books = await getAllSeriesBooks(provider, "series-1");

    expect(books.map((b) => b.id)).toEqual(["1"]);
    expect(calls).toHaveLength(2);
  });

  it("returns an empty array when the series has no books", async () => {
    const { provider, calls } = stubProvider([[]], 1);

    await expect(getAllSeriesBooks(provider, "series-1")).resolves.toEqual([]);
    expect(calls).toHaveLength(1);
  });

  it("requests unreadOnly: false so read books are included", async () => {
    const { provider, calls } = stubProvider([["1"]]);

    await getAllSeriesBooks(provider, "series-1");

    expect(calls[0]?.unreadOnly).toBe(false);
  });
});
