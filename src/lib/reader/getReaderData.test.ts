import { describe, expect, it, vi } from "vitest";

import { getReaderData } from "./getReaderData";
import {
  createProviderCapabilities,
  type IMediaProvider,
} from "@/lib/providers/provider.interface";
import type {
  NormalizedBook,
  NormalizedBooksPage,
  NormalizedSeries,
  NormalizedSeriesRating,
} from "@/lib/providers/types";

function makeBook(over: Partial<NormalizedBook> = {}): NormalizedBook {
  return {
    id: "book-1",
    libraryId: "lib-1",
    title: "Book 1",
    number: null,
    seriesId: "series-1",
    seriesName: null,
    volume: 1,
    pageCount: 20,
    thumbnailUrl: "",
    media: { pageUrlTemplate: "/pages/{page}", thumbnailUrlTemplate: "/pages/{page}" },
    readProgress: null,
    ...over,
  };
}

function makeSeries(): NormalizedSeries {
  return {
    id: "series-1",
    name: "Series 1",
    bookCount: 20,
    booksReadCount: 0,
    thumbnailUrl: "",
  };
}

function makeBooksPage(): NormalizedBooksPage {
  return { items: [makeBook()], nextCursor: null, totalElements: 20 };
}

interface StubOptions {
  seriesId?: string | null;
  seriesName?: string | null;
  rating?: NormalizedSeriesRating | null;
  ratingThrows?: boolean;
  /** `false` simule un provider sans capacité de notation (Komga). */
  ratings?: boolean;
}

function makeProvider(options: StubOptions = {}) {
  const book = makeBook({
    seriesId: options.seriesId === undefined ? "series-1" : options.seriesId,
    seriesName: options.seriesName === undefined ? null : options.seriesName,
  });
  const getSeriesRating = options.ratingThrows
    ? vi.fn(async (): Promise<NormalizedSeriesRating | null> => {
        throw new Error("boom");
      })
    : vi.fn(async (): Promise<NormalizedSeriesRating | null> => options.rating ?? null);

  const ratings = options.ratings === false
    ? null
    : {
        getReadSeries: vi.fn(async () => ({
          items: [],
          nextCursor: null,
          totalPages: 0,
          totalElements: 0,
        })),
        getSeriesRating,
        setSeriesRating: vi.fn(async () => undefined),
        deleteSeriesRating: vi.fn(async () => undefined),
      };

  return {
    getBook: vi.fn(async () => book),
    getNextBook: vi.fn(async () => null),
    getSeriesById: vi.fn(async () => makeSeries()),
    getSeries: vi.fn(async () => ({ items: [makeSeries()], nextCursor: null })),
    getBooks: vi.fn(async () => makeBooksPage()),
    capabilities: createProviderCapabilities({ ratings }),
    getSeriesRating,
  } as unknown as IMediaProvider & { getSeriesRating: ReturnType<typeof vi.fn> };
}

describe("getReaderData — series rating", () => {
  it("exposes the rating when the provider declares the capability", async () => {
    const provider = makeProvider({
      rating: {
        userRating: 7,
        providerRatings: [
          { provider: "anilist", rating: 8, ratingScale: 10, ratingCount: 120 },
        ],
      },
    });

    const data = await getReaderData(provider, "book-1");

    expect(data.seriesRating).toEqual({
      userRating: 7,
      providerRatings: [
        { provider: "anilist", rating: 8, ratingScale: 10, ratingCount: 120 },
      ],
    });
  });

  it("returns null and skips the fetch without the capability", async () => {
    const provider = makeProvider({ ratings: false });

    const data = await getReaderData(provider, "book-1");

    expect(data.seriesRating).toBeNull();
    expect(provider.getSeriesRating).not.toHaveBeenCalled();
  });

  it("returns null when the book has no series", async () => {
    const provider = makeProvider({ seriesId: null });

    const data = await getReaderData(provider, "book-1");

    expect(data.seriesRating).toBeNull();
    expect(provider.getSeriesRating).not.toHaveBeenCalled();
  });

  it("swallows rating fetch errors", async () => {
    const provider = makeProvider({ ratingThrows: true });

    const data = await getReaderData(provider, "book-1");

    expect(data.seriesRating).toBeNull();
  });
});

describe("getReaderData — series resolution", () => {
  it("resolves the series by id without searching by name", async () => {
    const provider = makeProvider({ seriesId: "series-1", seriesName: "Series 1" });

    const data = await getReaderData(provider, "book-1");

    expect(provider.getSeriesById).toHaveBeenCalledWith("series-1");
    expect(provider.getSeries).not.toHaveBeenCalled();
    expect(data.readerInfo?.seriesTitle).toBe("Series 1");
  });

  it("falls back to the name when the provider omits the series id", async () => {
    const provider = makeProvider({ seriesId: null, seriesName: "Series 1" });

    const data = await getReaderData(provider, "book-1");

    expect(provider.getSeriesById).not.toHaveBeenCalled();
    expect(provider.getSeries).toHaveBeenCalledWith(
      "lib-1",
      undefined,
      20,
      false,
      "Series 1"
    );
    expect(data.readerInfo?.seriesTitle).toBe("Series 1");
  });
});
