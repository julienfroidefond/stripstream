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
    volume: null,
    pageCount: 10,
    thumbnailUrl: "",
    readProgress: null,
  };
}

function makePage(
  ids: string[],
  extra: Partial<NormalizedBooksPage> = {}
): NormalizedBooksPage {
  return { items: ids.map(makeBook), nextCursor: null, ...extra };
}

/** Provider factice qui rejoue une séquence de pages en enregistrant les filtres reçus. */
function stubProvider(pages: NormalizedBooksPage[]): {
  provider: Pick<IMediaProvider, "getBooks">;
  calls: BookListFilter[];
} {
  const calls: BookListFilter[] = [];
  let index = 0;
  const getBooks = async (filter: BookListFilter): Promise<NormalizedBooksPage> => {
    calls.push(filter);
    const page = pages[Math.min(index, pages.length - 1)];
    index += 1;
    return page;
  };
  return { provider: { getBooks }, calls };
}

describe("getAllSeriesBooks", () => {
  it("follows nextCursor across pages (Komga)", async () => {
    const { provider, calls } = stubProvider([
      makePage(["1", "2"], { nextCursor: "2" }),
      makePage(["3"], { nextCursor: null }),
    ]);

    const books = await getAllSeriesBooks(provider, "series-1");

    expect(books.map((b) => b.id)).toEqual(["1", "2", "3"]);
    expect(calls).toHaveLength(2);
    expect(calls[0]).toMatchObject({ seriesName: "series-1", cursor: "1", unreadOnly: false });
    expect(calls[1]).toMatchObject({ cursor: "2" });
  });

  it("paginates with totalPages when nextCursor is null (Stripstream)", async () => {
    const { provider, calls } = stubProvider([
      makePage(["1"], { totalPages: 3 }),
      makePage(["2"], { totalPages: 3 }),
      makePage(["3"], { totalPages: 3 }),
    ]);

    const books = await getAllSeriesBooks(provider, "series-1");

    expect(books.map((b) => b.id)).toEqual(["1", "2", "3"]);
    expect(calls).toHaveLength(3);
    expect(calls.map((c) => c.cursor)).toEqual(["1", "2", "3"]);
  });

  it("stops on the first empty page even when more pages are announced", async () => {
    const { provider, calls } = stubProvider([
      makePage(["1"], { totalPages: 5 }),
      makePage([], { totalPages: 5 }),
    ]);

    const books = await getAllSeriesBooks(provider, "series-1");

    expect(books.map((b) => b.id)).toEqual(["1"]);
    expect(calls).toHaveLength(2);
  });

  it("returns an empty array when the series has no books", async () => {
    const { provider } = stubProvider([makePage([])]);

    await expect(getAllSeriesBooks(provider, "series-1")).resolves.toEqual([]);
  });

  it("requests unreadOnly: false so read books are included", async () => {
    const { provider, calls } = stubProvider([makePage(["1"], { totalPages: 1 })]);

    await getAllSeriesBooks(provider, "series-1");

    expect(calls[0]?.unreadOnly).toBe(false);
  });
});
