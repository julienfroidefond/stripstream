import type { IMediaProvider, BookListFilter } from "../provider.interface";
import logger from "@/lib/logger";
import type {
  NormalizedLibrary,
  NormalizedSeries,
  NormalizedBook,
  NormalizedReadProgress,
  NormalizedSearchResult,
  NormalizedSeriesPage,
  NormalizedBooksPage,
} from "../types";
import type { HomeData } from "@/types/home";
import { StripstreamClient } from "./stripstream.client";
import { StripstreamAdapter } from "./stripstream.adapter";
import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError } from "@/utils/errors";
import type {
  StripstreamLibraryResponse,
  StripstreamBooksPage,
  StripstreamSeriesPage,
  StripstreamBookDetails,
  StripstreamReadingProgressResponse,
  StripstreamSearchResponse,
} from "@/types/stripstream";
import { HOME_CACHE_TAG, LIBRARY_SERIES_CACHE_TAG, SERIES_BOOKS_CACHE_TAG } from "@/constants/cacheConstants";

const CACHE_TTL_LONG = 300;
const CACHE_TTL_MED = 120;
const CACHE_TTL_SHORT = 30;

export class StripstreamProvider implements IMediaProvider {
  private client: StripstreamClient;

  constructor(url: string, token: string) {
    this.client = new StripstreamClient(url, token);
  }

  async getLibraries(): Promise<NormalizedLibrary[]> {
    const libraries = await this.client.fetch<StripstreamLibraryResponse[]>("libraries", undefined, {
      revalidate: CACHE_TTL_LONG,
    });
    return libraries.map(StripstreamAdapter.toNormalizedLibrary);
  }

  async getLibraryById(libraryId: string): Promise<NormalizedLibrary | null> {
    try {
      const libraries = await this.client.fetch<StripstreamLibraryResponse[]>("libraries", undefined, {
        revalidate: CACHE_TTL_LONG,
      });
      const lib = libraries.find((l) => l.id === libraryId);
      return lib ? StripstreamAdapter.toNormalizedLibrary(lib) : null;
    } catch {
      return null;
    }
  }

  // Stripstream series endpoint: GET /libraries/{library_id}/series
  async getSeries(libraryId: string, page?: string, limit = 20, unreadOnly = false, search?: string): Promise<NormalizedSeriesPage> {
    const pageNumber = page ? parseInt(page) : 1;
    const params: Record<string, string | undefined> = { limit: String(limit), page: String(pageNumber) };
    if (unreadOnly) params.reading_status = "unread,reading";
    if (search?.trim()) params.q = search.trim();

    const response = await this.client.fetch<StripstreamSeriesPage>(
      `libraries/${libraryId}/series`,
      params,
      { revalidate: CACHE_TTL_MED, tags: [LIBRARY_SERIES_CACHE_TAG] }
    );

    const totalPages = Math.ceil(response.total / limit);
    return {
      items: response.items.map(StripstreamAdapter.toNormalizedSeries),
      nextCursor: null,
      totalElements: response.total,
      totalPages,
    };
  }

  async getSeriesById(seriesId: string): Promise<NormalizedSeries | null> {
    // seriesId can be either a first_book_id (from series cards) or a series name (from book.seriesId).
    // Try first_book_id first; fall back to series name search.
    try {
      const book = await this.client.fetch<StripstreamBookDetails>(`books/${seriesId}`, undefined, {
        revalidate: CACHE_TTL_MED,
      });
      if (!book.series) return null;
      return {
        id: seriesId,
        name: book.series,
        bookCount: 0,
        booksReadCount: 0,
        thumbnailUrl: `/api/stripstream/images/books/${seriesId}/thumbnail`,
        summary: null,
        authors: [],
        genres: [],
        tags: [],
        createdAt: null,
      };
    } catch {
      // Fall back: treat seriesId as a series name, find its first book
      try {
        const page = await this.client.fetch<StripstreamBooksPage>(
          "books",
          { series: seriesId, limit: "1" },
          { revalidate: CACHE_TTL_MED }
        );
        if (!page.items.length) return null;
        const firstBook = page.items[0];
        return {
          id: firstBook.id,
          name: seriesId,
          bookCount: 0,
          booksReadCount: 0,
          thumbnailUrl: `/api/stripstream/images/books/${firstBook.id}/thumbnail`,
          summary: null,
          authors: [],
          genres: [],
          tags: [],
          createdAt: null,
        };
      } catch {
        return null;
      }
    }
  }

  async getBooks(filter: BookListFilter): Promise<NormalizedBooksPage> {
    const limit = filter.limit ?? 24;
    const params: Record<string, string | undefined> = { limit: String(limit) };

    if (filter.seriesName) {
      // seriesName is first_book_id for Stripstream — resolve to actual series name
      try {
        const book = await this.client.fetch<StripstreamBookDetails>(
          `books/${filter.seriesName}`,
          undefined,
          { revalidate: CACHE_TTL_MED }
        );
        params.series = book.series ?? filter.seriesName;
      } catch {
        params.series = filter.seriesName;
      }
    } else if (filter.libraryId) {
      params.library_id = filter.libraryId;
    }

    if (filter.unreadOnly) params.reading_status = "unread,reading";
    const pageNumber = filter.cursor ? parseInt(filter.cursor) : 1;
    params.page = String(pageNumber);

    const response = await this.client.fetch<StripstreamBooksPage>("books", params, {
      revalidate: CACHE_TTL_MED,
      tags: [SERIES_BOOKS_CACHE_TAG],
    });

    const pageSize = filter.limit ?? 24;
    const totalPages = Math.ceil(response.total / pageSize);
    return {
      items: response.items.map(StripstreamAdapter.toNormalizedBook),
      nextCursor: null,
      totalElements: response.total,
      totalPages,
    };
  }

  async getBook(bookId: string): Promise<NormalizedBook> {
    const book = await this.client.fetch<StripstreamBookDetails>(`books/${bookId}`, undefined, {
      revalidate: CACHE_TTL_SHORT,
    });
    return StripstreamAdapter.toNormalizedBookDetails(book);
  }

  async getNextBook(bookId: string): Promise<NormalizedBook | null> {
    try {
      const book = await this.client.fetch<StripstreamBookDetails>(`books/${bookId}`, undefined, {
        revalidate: CACHE_TTL_SHORT,
      });
      if (!book.series || book.volume == null) return null;

      const response = await this.client.fetch<StripstreamBooksPage>("books", {
        series: book.series,
        limit: "200",
      }, { revalidate: CACHE_TTL_SHORT });

      const sorted = response.items
        .filter((b) => b.volume != null)
        .sort((a, b) => (a.volume ?? 0) - (b.volume ?? 0));

      const idx = sorted.findIndex((b) => b.id === bookId);
      if (idx === -1 || idx === sorted.length - 1) return null;
      return StripstreamAdapter.toNormalizedBook(sorted[idx + 1]);
    } catch {
      return null;
    }
  }

  async getHomeData(): Promise<HomeData> {
    const homeOpts = { revalidate: CACHE_TTL_MED, tags: [HOME_CACHE_TAG] };
    const [ongoingBooksPage, booksPage, libraries] = await Promise.allSettled([
      this.client.fetch<StripstreamBooksPage>("books", { limit: "10", reading_status: "reading" }, homeOpts),
      this.client.fetch<StripstreamBooksPage>("books", { limit: "10" }, homeOpts),
      this.client.fetch<StripstreamLibraryResponse[]>("libraries", undefined, { revalidate: CACHE_TTL_LONG, tags: [HOME_CACHE_TAG] }),
    ]);

    const ongoingBooks = ongoingBooksPage.status === "fulfilled"
      ? ongoingBooksPage.value.items.map(StripstreamAdapter.toNormalizedBook)
      : [];

    const books = booksPage.status === "fulfilled"
      ? booksPage.value.items.map(StripstreamAdapter.toNormalizedBook)
      : [];

    // Derive ongoing series from ongoing books (series with at least one book being read)
    const ongoingSeriesNames = ongoingBooksPage.status === "fulfilled"
      ? Array.from(new Set(ongoingBooksPage.value.items.filter((b) => b.series).map((b) => b.series!)))
      : [];

    let ongoingSeries: NormalizedSeries[] = [];
    let latestSeries: NormalizedSeries[] = [];
    if (libraries.status === "fulfilled" && libraries.value.length > 0) {
      const libs = libraries.value;

      // Fetch all series from all libraries for ongoing matching and latest
      const allSeriesResults = await Promise.allSettled(
        libs.map((lib) =>
          this.client.fetch<StripstreamSeriesPage>(
            `libraries/${lib.id}/series`,
            { limit: "200" },
            homeOpts
          )
        )
      );
      const allSeries = allSeriesResults
        .filter((r): r is PromiseFulfilledResult<StripstreamSeriesPage> => r.status === "fulfilled")
        .flatMap((r) => r.value.items);

      ongoingSeries = allSeries
        .filter((s) => ongoingSeriesNames.includes(s.name))
        .map(StripstreamAdapter.toNormalizedSeries)
        .slice(0, 10);

      latestSeries = allSeries
        .map(StripstreamAdapter.toNormalizedSeries)
        .slice(0, 10);
    }

    return {
      ongoing: ongoingSeries,
      ongoingBooks: ongoingBooks,
      recentlyRead: books,
      onDeck: [],
      latestSeries,
    };
  }

  async getReadProgress(bookId: string): Promise<NormalizedReadProgress | null> {
    const progress = await this.client.fetch<StripstreamReadingProgressResponse>(
      `books/${bookId}/progress`,
      undefined,
      { revalidate: CACHE_TTL_SHORT }
    );
    return StripstreamAdapter.toNormalizedReadProgress(progress);
  }

  async saveReadProgress(bookId: string, page: number | null, completed: boolean): Promise<void> {
    const status = completed ? "read" : page !== null && page > 0 ? "reading" : "unread";
    await this.client.fetch<unknown>(`books/${bookId}/progress`, undefined, {
      method: "PATCH",
      body: JSON.stringify({ status, current_page: page }),
    });
  }

  async resetReadProgress(bookId: string): Promise<void> {
    await this.client.fetch<unknown>(`books/${bookId}/progress`, undefined, {
      method: "PATCH",
      body: JSON.stringify({ status: "unread", current_page: null }),
    });
  }

  async scanLibrary(libraryId: string): Promise<void> {
    await this.client.fetch<unknown>(`libraries/${libraryId}/scan`, undefined, {
      method: "POST",
    });
  }

  async getRandomBook(libraryIds?: string[]): Promise<string | null> {
    try {
      const params: Record<string, string | undefined> = { limit: "50" };
      if (libraryIds?.length) {
        params.library_id = libraryIds[Math.floor(Math.random() * libraryIds.length)];
      }
      const response = await this.client.fetch<StripstreamBooksPage>("books", params);
      if (!response.items.length) return null;
      return response.items[Math.floor(Math.random() * response.items.length)].id;
    } catch {
      return null;
    }
  }

  async search(query: string, limit = 6): Promise<NormalizedSearchResult[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const response = await this.client.fetch<StripstreamSearchResponse>("search", {
      q: trimmed,
      limit: String(limit),
    }, { revalidate: CACHE_TTL_SHORT });

    const seriesResults: NormalizedSearchResult[] = response.series_hits.map((s) => ({
      id: s.first_book_id,
      title: s.name,
      href: `/series/${s.first_book_id}`,
      coverUrl: `/api/stripstream/images/books/${s.first_book_id}/thumbnail`,
      type: "series" as const,
      bookCount: s.book_count,
    }));

    const bookResults: NormalizedSearchResult[] = response.hits.map((hit) => ({
      id: hit.id,
      title: hit.title,
      seriesTitle: hit.series ?? null,
      seriesId: hit.series ?? null,
      href: `/books/${hit.id}`,
      coverUrl: `/api/stripstream/images/books/${hit.id}/thumbnail`,
      type: "book" as const,
    }));

    return [...seriesResults, ...bookResults];
  }

  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    try {
      await this.client.fetch<StripstreamLibraryResponse[]>("libraries");
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Connexion échouée" };
    }
  }

  getBookThumbnailUrl(bookId: string): string {
    return `/api/stripstream/images/books/${bookId}/thumbnail`;
  }

  getSeriesThumbnailUrl(seriesId: string): string {
    return `/api/stripstream/images/books/${seriesId}/thumbnail`;
  }

  getBookPageUrl(bookId: string, pageNumber: number): string {
    return `/api/stripstream/images/books/${bookId}/pages/${pageNumber}`;
  }
}
