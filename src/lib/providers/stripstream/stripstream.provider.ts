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
import type {
  StripstreamLibraryResponse,
  StripstreamBooksPage,
  StripstreamSeriesPage,
  StripstreamBookItem,
  StripstreamSeriesItem,
  StripstreamBookDetails,
  StripstreamReadingProgressResponse,
  StripstreamSearchResponse,
  StripstreamSeriesMetadata,
  StripstreamSeriesLookup,
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
    // seriesId can be a real series UUID (from series listing) or a first_book_id (from search results).
    // Try as series_id first via the global series list.
    const series = await this.findSeriesInList(seriesId);
    if (series) {
      const normalized = StripstreamAdapter.toNormalizedSeries(series);
      return this.enrichSeriesWithMetadata(normalized, series.library_id, series.series_id);
    }

    // Fallback: try as first_book_id (search results still use first_book_id)
    try {
      const book = await this.client.fetch<StripstreamBookDetails>(`books/${seriesId}`, undefined, {
        revalidate: CACHE_TTL_MED,
      });
      if (!book.series) return null;
      return this.resolveSeriesByName(book.series, book.library_id);
    } catch {
      return null;
    }
  }

  private async findSeriesInList(seriesId: string): Promise<StripstreamSeriesItem | null> {
    try {
      let page = 1;
      const limit = 200;
      while (true) {
        const response = await this.client.fetch<StripstreamSeriesPage>(
          "series",
          { limit: String(limit), page: String(page) },
          { revalidate: CACHE_TTL_MED }
        );
        const match = response.items.find((s) => s.series_id === seriesId);
        if (match) return match;
        if (response.items.length < limit) return null;
        page++;
      }
    } catch {
      return null;
    }
  }

  private async resolveSeriesByName(name: string, libraryId: string): Promise<NormalizedSeries | null> {
    try {
      // Use by-name endpoint to get the series UUID
      const lookup = await this.client.fetch<StripstreamSeriesLookup>(
        `libraries/${libraryId}/series/by-name/${encodeURIComponent(name)}`,
        undefined,
        { revalidate: CACHE_TTL_MED }
      );

      // Find the full series item for book counts etc.
      const series = await this.findSeriesInList(lookup.id);
      if (series) {
        const normalized = StripstreamAdapter.toNormalizedSeries(series);
        return this.enrichSeriesWithMetadata(normalized, series.library_id, series.series_id);
      }

      // Fallback: construct from lookup + metadata
      const fallback: NormalizedSeries = {
        id: lookup.id,
        name: lookup.name,
        bookCount: 0,
        booksReadCount: 0,
        thumbnailUrl: "",
        libraryId: lookup.library_id,
        summary: null,
        authors: [],
        genres: [],
        tags: [],
        createdAt: null,
      };
      return this.enrichSeriesWithMetadata(fallback, lookup.library_id, lookup.id);
    } catch {
      return null;
    }
  }

  private async enrichSeriesWithMetadata(
    series: NormalizedSeries,
    libraryId: string,
    seriesId: string
  ): Promise<NormalizedSeries> {
    try {
      const metadata = await this.client.fetch<StripstreamSeriesMetadata>(
        `libraries/${libraryId}/series/${seriesId}/metadata`,
        undefined,
        { revalidate: CACHE_TTL_MED }
      );
      return {
        ...series,
        summary: metadata.description ?? null,
        authors: metadata.authors.map((name) => ({ name, role: "writer" })),
      };
    } catch {
      return series;
    }
  }

  private async resolveSeriesId(seriesIdOrBookId: string): Promise<string | null> {
    // If it's already a series_id, verify it exists
    const series = await this.findSeriesInList(seriesIdOrBookId);
    if (series) return series.series_id;

    // Fallback: try as first_book_id — resolve to series_id via by-name
    try {
      const book = await this.client.fetch<StripstreamBookDetails>(`books/${seriesIdOrBookId}`, undefined, {
        revalidate: CACHE_TTL_MED,
      });
      if (!book.series) return null;
      const lookup = await this.client.fetch<StripstreamSeriesLookup>(
        `libraries/${book.library_id}/series/by-name/${encodeURIComponent(book.series)}`,
        undefined,
        { revalidate: CACHE_TTL_MED }
      );
      return lookup.id;
    } catch {
      return null;
    }
  }

  async getBooks(filter: BookListFilter): Promise<NormalizedBooksPage> {
    const limit = filter.limit ?? 24;
    const params: Record<string, string | undefined> = { limit: String(limit) };

    if (filter.seriesName) {
      // seriesName is a series_id UUID — the books API now expects a series_id
      const seriesId = await this.resolveSeriesId(filter.seriesName);
      params.series = seriesId ?? filter.seriesName;
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

      // Resolve series name to series_id for the books API
      const lookup = await this.client.fetch<StripstreamSeriesLookup>(
        `libraries/${book.library_id}/series/by-name/${encodeURIComponent(book.series)}`,
        undefined,
        { revalidate: CACHE_TTL_MED }
      );

      const response = await this.client.fetch<StripstreamBooksPage>("books", {
        series: lookup.id,
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
    const [ongoingBooksResult, ongoingSeriesResult, booksPage, latestSeriesResult] = await Promise.allSettled([
      this.client.fetch<StripstreamBookItem[]>("books/ongoing", { limit: "20" }, homeOpts),
      this.client.fetch<StripstreamSeriesItem[]>("series/ongoing", { limit: "10" }, homeOpts),
      this.client.fetch<StripstreamBooksPage>("books", { sort: "latest", limit: "10" }, homeOpts),
      this.client.fetch<StripstreamSeriesPage>("series", { sort: "latest", limit: "10" }, homeOpts),
    ]);

    // /books/ongoing returns both currently reading and next unread per series
    const ongoingBooks = ongoingBooksResult.status === "fulfilled"
      ? ongoingBooksResult.value.map(StripstreamAdapter.toNormalizedBook)
      : [];

    const ongoingSeries = ongoingSeriesResult.status === "fulfilled"
      ? ongoingSeriesResult.value.map(StripstreamAdapter.toNormalizedSeries)
      : [];

    const recentlyRead = booksPage.status === "fulfilled"
      ? booksPage.value.items.map(StripstreamAdapter.toNormalizedBook)
      : [];

    const latestSeries = latestSeriesResult.status === "fulfilled"
      ? latestSeriesResult.value.items.map(StripstreamAdapter.toNormalizedSeries)
      : [];

    return {
      ongoing: ongoingSeries,
      ongoingBooks: [],
      recentlyRead,
      onDeck: ongoingBooks,
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

    // Resolve series_id for each hit via by-name lookup
    const seriesResults: NormalizedSearchResult[] = await Promise.all(
      response.series_hits.map(async (s) => {
        let id = s.first_book_id;
        try {
          const lookup = await this.client.fetch<StripstreamSeriesLookup>(
            `libraries/${s.library_id}/series/by-name/${encodeURIComponent(s.name)}`,
            undefined,
            { revalidate: CACHE_TTL_MED }
          );
          id = lookup.id;
        } catch {
          // fallback to first_book_id
        }
        return {
          id,
          title: s.name,
          href: `/series/${id}`,
          coverUrl: `/api/stripstream/images/books/${s.first_book_id}/thumbnail`,
          type: "series" as const,
          bookCount: s.book_count,
        };
      })
    );

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
