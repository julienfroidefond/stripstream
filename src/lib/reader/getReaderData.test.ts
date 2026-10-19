import { beforeEach, describe, expect, it, vi } from "vitest";

const getActiveProviderTypeMock = vi.fn<() => Promise<string | null>>();

vi.mock("@/lib/providers/provider.factory", () => ({
  getActiveProviderType: () => getActiveProviderTypeMock(),
}));

import { getReaderData } from "./getReaderData";
import type { IMediaProvider } from "@/lib/providers/provider.interface";
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
    volume: 1,
    pageCount: 20,
    thumbnailUrl: "",
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
  rating?: NormalizedSeriesRating | null;
  ratingThrows?: boolean;
}

function makeProvider(options: StubOptions = {}) {
  const book = makeBook({ seriesId: options.seriesId === undefined ? "series-1" : options.seriesId });
  const getSeriesRating = options.ratingThrows
    ? vi.fn(async (): Promise<NormalizedSeriesRating | null> => {
        throw new Error("boom");
      })
    : vi.fn(async (): Promise<NormalizedSeriesRating | null> => options.rating ?? null);

  return {
    getBook: vi.fn(async () => book),
    getNextBook: vi.fn(async () => null),
    getSeriesById: vi.fn(async () => makeSeries()),
    getBooks: vi.fn(async () => makeBooksPage()),
    getSeriesRating,
  } as unknown as IMediaProvider & { getSeriesRating: ReturnType<typeof vi.fn> };
}

describe("getReaderData — series rating", () => {
  beforeEach(() => {
    getActiveProviderTypeMock.mockReset();
  });

  it("exposes the rating when the provider is Stripstream", async () => {
    getActiveProviderTypeMock.mockResolvedValue("stripstream");
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

  it("returns null and skips the fetch on Komga", async () => {
    getActiveProviderTypeMock.mockResolvedValue("komga");
    const provider = makeProvider();

    const data = await getReaderData(provider, "book-1");

    expect(data.seriesRating).toBeNull();
    expect(provider.getSeriesRating).not.toHaveBeenCalled();
  });

  it("returns null when the book has no series", async () => {
    getActiveProviderTypeMock.mockResolvedValue("stripstream");
    const provider = makeProvider({ seriesId: null });

    const data = await getReaderData(provider, "book-1");

    expect(data.seriesRating).toBeNull();
    expect(provider.getSeriesRating).not.toHaveBeenCalled();
  });

  it("swallows rating fetch errors", async () => {
    getActiveProviderTypeMock.mockResolvedValue("stripstream");
    const provider = makeProvider({ ratingThrows: true });

    const data = await getReaderData(provider, "book-1");

    expect(data.seriesRating).toBeNull();
  });
});
