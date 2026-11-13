import {
  createProviderCapabilities,
  type IMediaProvider,
  type BookListFilter,
  type ProviderCapabilities,
} from "../provider.interface";
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
  NormalizedSeriesRating,
  NormalizedReadingStats,
  NormalizedReadingList,
  NormalizedReadingListDetail,
  ScanStartResult,
  ScanStatus,
} from "../types";
import type { HomePrimaryData } from "@/types/home";
import { createStripstreamClient } from "./stripstream.client";
import type { StripstreamClient } from "./stripstream.client";
import {
  findSeriesById,
  resolveSeriesId,
  resolveSeriesIdByName,
  resolveSeriesIdFromBookId,
} from "./series-identity";
import { StripstreamAdapter } from "./stripstream.adapter";
import { selectApprovedMetadataLink } from "./metadata-links";
import { scanStateFromIndexJobStatus } from "../scan-status";
import { normalizePageNumber } from "../pagination";
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
  StripstreamMetadataLink,
  StripstreamMissingBooksDto,
  StripstreamRelatedSeriesItem,
  StripstreamRecommendedSeriesItem,
  StripstreamReadingList,
  StripstreamReadingListDetail,
  StripstreamSeriesRatingsResponse,
  StripstreamIndexJob,
} from "@/types/stripstream";
import { cacheProfile } from "@/constants/cacheProfiles";

export class StripstreamProvider implements IMediaProvider {
  readonly capabilities: ProviderCapabilities;

  private client: StripstreamClient;

  constructor(url: string, token: string) {
    this.client = createStripstreamClient(url, token);
    this.capabilities = createProviderCapabilities({
      readingLists: this,
      search: this,
      ratings: this,
      shelf: this,
      missingBooks: this,
      discovery: this,
      favorites: this,
    });
  }

  async getLibraries(): Promise<NormalizedLibrary[]> {
    const libraries = await this.client.fetch<StripstreamLibraryResponse[]>("libraries", undefined, cacheProfile.libraries());
    return libraries.map(StripstreamAdapter.toNormalizedLibrary);
  }

  async getLibraryById(libraryId: string): Promise<NormalizedLibrary | null> {
    try {
      const libraries = await this.client.fetch<StripstreamLibraryResponse[]>("libraries", undefined, cacheProfile.libraries());
      const lib = libraries.find((l) => l.id === libraryId);
      return lib ? StripstreamAdapter.toNormalizedLibrary(lib) : null;
    } catch {
      return null;
    }
  }

  // Stripstream series endpoint: GET /libraries/{library_id}/series
  async getSeries(libraryId: string, page?: number, limit = 20, unreadOnly = false, search?: string, sort?: string, hasMissing?: boolean): Promise<NormalizedSeriesPage> {
    const pageNumber = normalizePageNumber(page);
    const params: Record<string, string | undefined> = { limit: String(limit), page: String(pageNumber), has_books: "true", library_id: libraryId };
    if (unreadOnly) params.reading_status = "unread,reading";
    if (search?.trim()) params.q = search.trim();
    if (sort) params.sort = sort;
    if (hasMissing) params.has_missing = "true";

    const response = await this.client.fetch<StripstreamSeriesPage>(
      `series`,
      params,
      cacheProfile.librarySeries(libraryId)
    );

    return StripstreamAdapter.toPage(response, StripstreamAdapter.toNormalizedSeries, pageNumber, limit);
  }

  /**
   * Séries entièrement lues, toutes bibliothèques confondues.
   * `reading_status=read` côté Librarian signifie « tous les tomes lus ».
   */
  async getReadSeries(page = 1, limit = 200): Promise<NormalizedSeriesPage> {
    const pageNumber = normalizePageNumber(page);
    const response = await this.client.fetch<StripstreamSeriesPage>(
      "series",
      {
        reading_status: "read",
        has_books: "true",
        page: String(pageNumber),
        limit: String(limit),
        sort: "title",
      },
      cacheProfile.readSeries()
    );

    return StripstreamAdapter.toPage(response, StripstreamAdapter.toNormalizedSeries, pageNumber, limit);
  }

  /**
   * Séries mises de côté par l'utilisateur courant, toutes bibliothèques
   * confondues. Le filtre `shelved=true` est appliqué côté Librarian ; on
   * refiltre côté client pour rester compatible avec un backend plus ancien
   * qui ignorerait le paramètre.
   */
  async getShelvedSeries(limit = 200): Promise<NormalizedSeries[]> {
    const response = await this.client.fetch<StripstreamSeriesPage>(
      "series",
      {
        shelved: "true",
        has_books: "true",
        limit: String(limit),
        sort: "title",
      },
      cacheProfile.shelvedSeries()
    );

    return response.items
      .map(StripstreamAdapter.toNormalizedSeries)
      .filter((series) => series.shelvedAt != null);
  }

  /**
   * Resolves a series id. For legacy search links, `seriesId` may also be a
   * first-book id: the book is loaded, its series name resolved in the book's
   * library, then the series id fetched. A series name is never accepted here;
   * callers with a name-only book use `resolveBookSeries`.
   */
  async getSeriesById(seriesId: string): Promise<NormalizedSeries | null> {
    const series = await findSeriesById(this.client, seriesId);
    if (series) {
      return this.enrichSeriesWithMetadata(
        StripstreamAdapter.toNormalizedSeries(series),
        series.series_id
      );
    }

    const resolvedId = await resolveSeriesIdFromBookId(this.client, seriesId);
    if (!resolvedId) return null;

    const resolved = await findSeriesById(this.client, resolvedId);
    if (!resolved) return null;

    return this.enrichSeriesWithMetadata(
      StripstreamAdapter.toNormalizedSeries(resolved),
      resolved.series_id
    );
  }

  private async enrichSeriesWithMetadata(
    series: NormalizedSeries,
    seriesId: string
  ): Promise<NormalizedSeries> {
    try {
      const metadata = await this.client.fetch<StripstreamSeriesMetadata>(
        `series/${seriesId}/metadata`,
        undefined,
        cacheProfile.series()
      );
      return {
        ...series,
        summary: metadata.description ?? null,
        authors: metadata.authors.map((name) => ({ name, role: "writer" })),
        genres: metadata.genres ?? [],
        startYear: metadata.start_year ?? series.startYear ?? null,
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
        cacheProfile.series()
      );

      // 2. Find the approved link, preferring Librarian's primary link when
      // several providers are approved for the same series (#76).
      const approvedLink = selectApprovedMetadataLink(links);
      if (!approvedLink) return [];

      // 3. Get missing books for this link
      const dto = await this.client.fetch<StripstreamMissingBooksDto>(
        `metadata/missing/${approvedLink.id}`,
        undefined,
        cacheProfile.series()
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

  async getBooks(filter: BookListFilter): Promise<NormalizedBooksPage> {
    const limit = filter.limit ?? 24;
    const params: Record<string, string | undefined> = { limit: String(limit) };

    if (filter.seriesId) {
      // `seriesId` is a series UUID; the books API expects a series id.
      const seriesId = await resolveSeriesId(this.client, filter.seriesId);
      params.series = seriesId ?? filter.seriesId;
    } else if (filter.libraryId) {
      params.library_id = filter.libraryId;
    }

    if (filter.unreadOnly) params.reading_status = "unread,reading";
    const pageNumber = normalizePageNumber(filter.page);
    params.page = String(pageNumber);

    const response = await this.client.fetch<StripstreamBooksPage>(
      "books",
      params,
      cacheProfile.books({ seriesId: params.series, libraryId: filter.libraryId })
    );

    return StripstreamAdapter.toPage(response, StripstreamAdapter.toNormalizedBook, pageNumber, limit);
  }

  async getBook(bookId: string): Promise<NormalizedBook> {
    // The reader must always resume from the current provider-side position.
    // Keeping this response in Next's data cache could show a stale page after
    // a progress update on another device.
    const book = await this.client.fetch<StripstreamBookDetails>(`books/${bookId}`, undefined, cacheProfile.readerBook());
    return StripstreamAdapter.toNormalizedBookDetails(book);
  }

  async getNextBook(bookId: string): Promise<NormalizedBook | null> {
    try {
      const book = await this.client.fetch<StripstreamBookDetails>(`books/${bookId}`, undefined, cacheProfile.nextBook());
      if (!book.series || book.volume == null) return null;

      // Resolve series name to series_id for the books API
      const seriesId = await resolveSeriesIdByName(
        this.client,
        book.library_id,
        book.series
      );
      if (!seriesId) return null;

      // Charge une page bornée (50) triée par volume pour repérer le tome suivant :
      // pas besoin de charger toute la série.
      const response = await this.client.fetch<StripstreamBooksPage>("books", {
        series: seriesId,
        limit: "50",
        sort: "volume",
      }, cacheProfile.nextBook());

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

  async getHomeContinueReadingData(limit = 20): Promise<Pick<HomePrimaryData, "ongoingBooks" | "onDeck">> {
    const homeOpts = cacheProfile.home();
    const ongoingBooks = await this.client.fetch<StripstreamBookItem[]>(
      "books/ongoing",
      { limit: String(limit) },
      homeOpts
    );

    return {
      ongoingBooks: [],
      onDeck: ongoingBooks.map(StripstreamAdapter.toNormalizedBook),
    };
  }

  async getHomeOngoingSeries(limit = 20): Promise<NormalizedSeries[]> {
    const homeOpts = cacheProfile.home();
    const ongoingSeries = await this.client.fetch<StripstreamSeriesItem[]>(
      "series/ongoing",
      { limit: String(limit) },
      homeOpts
    );

    return ongoingSeries.map(StripstreamAdapter.toNormalizedSeries);
  }

  async getHomeLatestSeries(limit = 10): Promise<NormalizedSeries[]> {
    const homeOpts = cacheProfile.home();
    const latestSeries = await this.client.fetch<StripstreamSeriesPage>(
      "series",
      { sort: "latest", limit: String(limit), has_books: "true" },
      homeOpts
    );

    return latestSeries.items.map(StripstreamAdapter.toNormalizedSeries);
  }

  async getHomeRecentlyRead(limit = 10): Promise<NormalizedBook[]> {
    const homeOpts = cacheProfile.home();
    const booksPage = await this.client.fetch<StripstreamBooksPage>(
      "books",
      { sort: "latest", limit: String(limit) },
      homeOpts
    );

    return booksPage.items.map(StripstreamAdapter.toNormalizedBook);
  }

  async getReadingLists(): Promise<NormalizedReadingList[]> {
    const lists = await this.client.fetch<StripstreamReadingList[]>(
      "reading-lists",
      undefined,
      cacheProfile.readingLists()
    );
    return lists.map(StripstreamAdapter.toNormalizedReadingList);
  }

  async getReadingListDetail(id: string): Promise<NormalizedReadingListDetail> {
    const detail = await this.client.fetch<StripstreamReadingListDetail>(
      `reading-lists/${id}`,
      undefined,
      cacheProfile.readingListDetail()
    );
    return StripstreamAdapter.toNormalizedReadingListDetail(detail);
  }

  async getReadProgress(bookId: string): Promise<NormalizedReadProgress | null> {
    const progress = await this.client.fetch<StripstreamReadingProgressResponse>(
      `books/${bookId}/progress`,
      undefined,
      cacheProfile.readProgress()
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

  async getSeriesRating(seriesId: string): Promise<NormalizedSeriesRating | null> {
    try {
      const response = await this.client.fetch<StripstreamSeriesRatingsResponse>(
        `series/${seriesId}/ratings`,
        undefined,
        cacheProfile.seriesRating(seriesId)
      );
      return {
        userRating: response.user_rating,
        providerRatings: response.provider_ratings.map((p) => ({
          provider: p.provider,
          rating: p.rating,
          ratingScale: p.rating_scale,
          ratingCount: p.rating_count,
        })),
      };
    } catch {
      return null;
    }
  }

  async setSeriesRating(seriesId: string, rating: number): Promise<void> {
    await this.client.fetch<unknown>(`series/${seriesId}/rating`, undefined, {
      method: "PUT",
      body: JSON.stringify({ rating }),
    });
  }

  async deleteSeriesRating(seriesId: string): Promise<void> {
    await this.client.fetch<unknown>(`series/${seriesId}/rating`, undefined, {
      method: "DELETE",
    });
  }

  async scanLibrary(libraryId: string): Promise<ScanStartResult> {
    const job = await this.client.fetch<StripstreamIndexJob>(
      `libraries/${libraryId}/scan`,
      undefined,
      { method: "POST" }
    );

    // The Librarian answers with the created index job. A 204 or an unexpected
    // payload means there is nothing to follow, so the UI stays honest instead
    // of guessing when the scan ends.
    if (!job?.id) return { jobId: null, progressSupported: false };

    return { jobId: job.id, progressSupported: true };
  }

  async getScanStatus(_libraryId: string, jobId?: string | null): Promise<ScanStatus> {
    if (!jobId) return { state: "unavailable" };

    try {
      const job = await this.client.fetch<StripstreamIndexJob>(`index/jobs/${jobId}`);
      return {
        state: scanStateFromIndexJobStatus(job.status),
        progressPercent: job.progress_percent ?? undefined,
        processedFiles: job.processed_files ?? undefined,
        totalFiles: job.total_files ?? undefined,
        error: job.error_opt ?? undefined,
      };
    } catch (error) {
      // Read-scoped tokens cannot read the admin job API (403), and a removed
      // job (404) or a network blip must not break the button. Degrade quietly:
      // the client stops polling after a few consecutive `unavailable` answers.
      logger.debug({ err: error, jobId }, "Scan status unavailable");
      return { state: "unavailable" };
    }
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

  async getReadingStats(): Promise<NormalizedReadingStats> {
    const [libraries, totalSeries, totalBooks, statusCounts] = await Promise.all([
      this.client.fetch<StripstreamLibraryResponse[]>("libraries", undefined, cacheProfile.stats()),
      this.countEntries("series"),
      this.countEntries("books"),
      this.countBooksByStatus(),
    ]);

    const libraryStats = await Promise.all(
      libraries.map(async (library) => ({
        id: library.id,
        name: library.name,
        bookCount: library.book_count,
        booksReadCount: await this.countEntries("books", {
          library_id: library.id,
          reading_status: "read",
        }),
      }))
    );

    return {
      totalSeries,
      totalBooks,
      booksRead: statusCounts.read,
      booksInProgress: statusCounts.reading,
      booksUnread: statusCounts.unread,
      libraries: libraryStats,
    };
  }

  private async countBooksByStatus(): Promise<{ read: number; reading: number; unread: number }> {
    const [read, reading, unread] = await Promise.all([
      this.countEntries("books", { reading_status: "read" }),
      this.countEntries("books", { reading_status: "reading" }),
      this.countEntries("books", { reading_status: "unread" }),
    ]);
    return { read, reading, unread };
  }

  private async countEntries(
    endpoint: "books" | "series",
    params: Record<string, string> = {}
  ): Promise<number> {
    const response = await this.client.fetch<{ total: number }>(
      endpoint,
      { limit: "1", ...params },
      cacheProfile.stats()
    );
    return response.total;
  }

  async search(query: string, limit = 6): Promise<NormalizedSearchResult[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const response = await this.client.fetch<StripstreamSearchResponse>("search", {
      q: trimmed,
      limit: String(limit),
    }, cacheProfile.search());

    // Resolve series_id for each hit via by-name lookup.
    // Piscine de concurrence bornée pour ne pas tirer N requêtes réseau d'un coup.
    const CONCURRENCY = 3;
    const hits = response.series_hits;
    const resolved = new Map<string, string>();
    const seriesResults: NormalizedSearchResult[] = [];

    const resolveHit = async (s: (typeof hits)[number]): Promise<string> => {
      try {
        // La recherche est best-effort : un échec de résolution retombe sur
        // `first_book_id`, jamais sur une page en erreur.
        return (await resolveSeriesIdByName(this.client, s.library_id, s.name)) ?? s.first_book_id;
      } catch {
        return s.first_book_id;
      }
    };

    const seenIds = new Set<string>();
    for (let i = 0; i < hits.length; i += CONCURRENCY) {
      const chunk = hits.slice(i, i + CONCURRENCY);
      const chunkIds = await Promise.allSettled(chunk.map(resolveHit));
      chunk.forEach((s, j) => {
        const settled = chunkIds[j];
        const id = settled.status === "fulfilled" ? settled.value : s.first_book_id;
        resolved.set(s.name, id);
      });
    }

    // Garde l'unicité par series_id tout en préservant l'ordre des hits.
    for (const s of hits) {
      const id = resolved.get(s.name) ?? s.first_book_id;
      if (seenIds.has(id)) continue;
      seenIds.add(id);
      seriesResults.push({
        id,
        title: s.name,
        href: `/series/${id}`,
        coverUrl: `/api/stripstream/images/books/${s.first_book_id}/thumbnail`,
        type: "series" as const,
        bookCount: s.book_count,
      });
    }

    const bookResults: NormalizedSearchResult[] = response.hits.map((hit) => ({
      id: hit.id,
      title: hit.title,
      seriesTitle: hit.series ?? null,
      href: `/books/${hit.id}`,
      coverUrl: `/api/stripstream/images/books/${hit.id}/thumbnail`,
      type: "book" as const,
    }));

    return [...seriesResults, ...bookResults];
  }

  async getRecommendations(limit = 20): Promise<NormalizedSeries[]> {
    try {
      const items = await this.client.fetch<StripstreamRecommendedSeriesItem[]>(
        `series/recommendations`,
        { limit: String(limit) },
        cacheProfile.recommendations()
      );
      return items.map(StripstreamAdapter.toNormalizedRecommendedSeries);
    } catch {
      return [];
    }
  }

  async getFavorites(): Promise<NormalizedSeries[]> {
    const favorites = await this.client.fetch<StripstreamSeriesItem[]>("favorites", undefined, cacheProfile.favorites());
    return favorites.map(StripstreamAdapter.toNormalizedSeries);
  }

  async isFavorite(seriesId: string): Promise<boolean> {
    return this.client.fetch<boolean>(`series/${seriesId}/favorite`, undefined, cacheProfile.favorites());
  }

  async addToFavorites(seriesId: string): Promise<void> {
    await this.client.fetch<unknown>(`series/${seriesId}/favorite`, undefined, { method: "PUT" });
  }

  async removeFromFavorites(seriesId: string): Promise<void> {
    await this.client.fetch<unknown>(`series/${seriesId}/favorite`, undefined, { method: "DELETE" });
  }

  async isShelved(seriesId: string): Promise<boolean> {
    return this.client.fetch<boolean>(`series/${seriesId}/shelf`, undefined, cacheProfile.seriesShelf(seriesId));
  }

  async shelveSeries(seriesId: string): Promise<void> {
    await this.client.fetch<unknown>(`series/${seriesId}/shelf`, undefined, { method: "PUT" });
  }

  async unshelveSeries(seriesId: string): Promise<void> {
    await this.client.fetch<unknown>(`series/${seriesId}/shelf`, undefined, { method: "DELETE" });
  }

  async getRelatedSeries(seriesId: string, limit = 10): Promise<NormalizedSeries[]> {
    try {
      const items = await this.client.fetch<StripstreamRelatedSeriesItem[]>(
        `series/${seriesId}/related`,
        { limit: String(limit) },
        cacheProfile.relatedSeries(seriesId)
      );
      return items.map(StripstreamAdapter.toNormalizedRelatedSeries);
    } catch {
      return [];
    }
  }

  async testConnection(): Promise<{ ok: boolean; error?: string; libraryCount?: number }> {
    try {
      const libraries = await this.client.fetch<StripstreamLibraryResponse[]>("libraries");
      return { ok: true, libraryCount: libraries.length };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Connexion échouée" };
    }
  }

  getBookThumbnailUrl(bookId: string): string {
    return `/api/stripstream/images/books/${bookId}/thumbnail`;
  }
}
