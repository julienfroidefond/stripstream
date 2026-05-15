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
  NormalizedMissingBook,
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
  StripstreamMetadataLink,
  StripstreamMissingBooksDto,
  StripstreamRelatedSeriesItem,
} from "@/types/stripstream";
import { HOME_CACHE_TAG, LIBRARY_SERIES_CACHE_TAG, SERIES_BOOKS_CACHE_TAG } from "@/constants/cacheConstants";
import { AppError } from "@/utils/errors";
import { ERROR_CODES } from "@/constants/errorCodes";

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
  async getSeries(libraryId: string, page?: string, limit = 20, unreadOnly = false, search?: string, sort?: string, hasMissing?: boolean): Promise<NormalizedSeriesPage> {
    const pageNumber = page ? parseInt(page) : 1;
    const params: Record<string, string | undefined> = { limit: String(limit), page: String(pageNumber), has_books: "true", library_id: libraryId };
    if (unreadOnly) params.reading_status = "unread,reading";
    if (search?.trim()) params.q = search.trim();
    if (sort) params.sort = sort;
    if (hasMissing) params.has_missing = "true";

    const response = await this.client.fetch<StripstreamSeriesPage>(
      `series`,
      params,
      {
        revalidate: CACHE_TTL_MED,
        tags: [LIBRARY_SERIES_CACHE_TAG, `library-series:${libraryId}`],
      }
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
    // Try as series_id first via the direct endpoint
    const series = await this.fetchSeriesById(seriesId);
    if (series) {
      const normalized = StripstreamAdapter.toNormalizedSeries(series);
      return this.enrichSeriesWithMetadata(normalized, series.series_id);
    }

    // Fallback: try as first_book_id (search results still use first_book_id)
    try {
      const book = await this.client.fetch<StripstreamBookDetails>(`books/${seriesId}`, undefined, {
        revalidate: CACHE_TTL_MED,
      });
      if (!book.series) return null;

      // Resolve series name → series_id via by-name endpoint
      const lookup = await this.client.fetch<StripstreamSeriesLookup>(
        `libraries/${book.library_id}/series/by-name/${encodeURIComponent(book.series)}`,
        undefined,
        { revalidate: CACHE_TTL_MED }
      );
      const resolved = await this.fetchSeriesById(lookup.id);
      if (resolved) {
        const normalized = StripstreamAdapter.toNormalizedSeries(resolved);
        return this.enrichSeriesWithMetadata(normalized, resolved.series_id);
      }
      return null;
    } catch {
      return null;
    }
  }

  private async fetchSeriesById(seriesId: string): Promise<StripstreamSeriesItem | null> {
    try {
      return await this.client.fetch<StripstreamSeriesItem>(
        `series/${seriesId}/details`,
        undefined,
        { revalidate: CACHE_TTL_MED }
      );
    } catch {
      return null;
    }
  }

  private async enrichSeriesWithMetadata(
    series: NormalizedSeries,
    seriesId: string
  ): Promise<NormalizedSeries> {
    try {
      const metadata = await this.client.fetch<StripstreamSeriesMetadata>(
        `series/${seriesId}/metadata`,
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

  async getMissingBooks(seriesId: string): Promise<NormalizedMissingBook[]> {
    try {
      // 1. Get metadata links for this series
      const links = await this.client.fetch<StripstreamMetadataLink[]>(
        `metadata/links`,
        { series_id: seriesId },
        { revalidate: CACHE_TTL_MED }
      );

      // 2. Find the approved link
      const approvedLink = links.find((l) => l.status === "approved");
      if (!approvedLink) return [];

      // 3. Get missing books for this link
      const dto = await this.client.fetch<StripstreamMissingBooksDto>(
        `metadata/missing/${approvedLink.id}`,
        undefined,
        { revalidate: CACHE_TTL_MED }
      );

      return dto.missing_books.map((mb) => ({
        title: mb.title,
        volumeNumber: mb.volume_number,
        coverUrl: mb.cover_url ?? null,
      }));
    } catch (error) {
      logger.error({ err: error, seriesId }, "Failed to fetch missing books");
      return [];
    }
  }

  private async resolveSeriesId(seriesIdOrBookId: string): Promise<string | null> {
    // Try as series_id directly
    const series = await this.fetchSeriesById(seriesIdOrBookId);
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

    const granularTags: string[] = [SERIES_BOOKS_CACHE_TAG];
    if (params.series) granularTags.push(`series-books:${params.series}`);
    if (filter.libraryId) granularTags.push(`library-books:${filter.libraryId}`);

    const response = await this.client.fetch<StripstreamBooksPage>("books", params, {
      revalidate: CACHE_TTL_MED,
      tags: granularTags,
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
    const results = await Promise.allSettled([
      this.client.fetch<StripstreamBookItem[]>("books/ongoing", { limit: "20" }, homeOpts),
      this.client.fetch<StripstreamSeriesItem[]>("series/ongoing", { limit: "10" }, homeOpts),
      this.client.fetch<StripstreamBooksPage>("books", { sort: "latest", limit: "10" }, homeOpts),
      this.client.fetch<StripstreamSeriesPage>("series", { sort: "latest", limit: "10", has_books: "true" }, homeOpts),
    ]);

    // Si la majorité des endpoints ont échoué, on propage une erreur pour que
    // la page affiche un message au lieu d'une home vide silencieuse. On
    // préserve l'AppError la plus spécifique disponible (ex. UNAUTHORIZED)
    // plutôt que de la wrapper en HOME.FETCH_ERROR générique.
    const failures = results.filter((r) => r.status === "rejected");
    if (failures.length >= 3) {
      const reasons = failures.map((r) => (r as PromiseRejectedResult).reason);
      const firstAppError = reasons.find((r): r is AppError => r instanceof AppError);
      if (firstAppError) throw firstAppError;
      throw new AppError(ERROR_CODES.HOME.FETCH_ERROR, {}, reasons[0]);
    }

    const [ongoingBooksResult, ongoingSeriesResult, booksPage, latestSeriesResult] = results;

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

  async getRelatedSeries(seriesId: string, limit = 10): Promise<NormalizedSeries[]> {
    try {
      const items = await this.client.fetch<StripstreamRelatedSeriesItem[]>(
        `series/${seriesId}/related`,
        { limit: String(limit) },
        { revalidate: CACHE_TTL_MED, tags: [`series-related:${seriesId}`] }
      );
      return items.map(StripstreamAdapter.toNormalizedRelatedSeries);
    } catch {
      return [];
    }
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
