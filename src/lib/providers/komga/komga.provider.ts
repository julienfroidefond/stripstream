import type { IMediaProvider, BookListFilter } from "../provider.interface";
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
} from "../types";
import type { HomeData, HomeDeferredData, HomePrimaryData } from "@/types/home";
import type { StripstreamReadingList } from "@/types/stripstream";
import { KomgaAdapter } from "./komga.adapter";
import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError } from "@/utils/errors";
import { codeForHttpStatus } from "@/utils/http-error";

const KOMGA_HTTP_CODES = {
  UNAUTHORIZED: ERROR_CODES.KOMGA.UNAUTHORIZED,
  FORBIDDEN: ERROR_CODES.KOMGA.FORBIDDEN,
  NOT_FOUND: ERROR_CODES.KOMGA.NOT_FOUND,
  SERVER_ERROR: ERROR_CODES.KOMGA.SERVER_ERROR,
  HTTP_ERROR: ERROR_CODES.KOMGA.HTTP_ERROR,
};
import type { KomgaBook, KomgaSeries, KomgaLibrary } from "@/types/komga";
import type { LibraryResponse } from "@/types/library";
import type { AuthConfig } from "@/types/auth";
import logger from "@/lib/logger";
import { HOME_CACHE_TAG, LIBRARY_SERIES_CACHE_TAG, SERIES_BOOKS_CACHE_TAG, STATS_CACHE_TAG } from "@/constants/cacheConstants";
import { unstable_cache } from "next/cache";

type KomgaCondition = Record<string, unknown>;

const CACHE_TTL_LONG = 300;
const CACHE_TTL_MED = 120;
const CACHE_TTL_SHORT = 30;
const TIMEOUT_MS = 15000;

export class KomgaProvider implements IMediaProvider {
  private config: AuthConfig;

  constructor(url: string, authHeader: string) {
    this.config = { serverUrl: url, authHeader };
  }

  private buildUrl(path: string, params?: Record<string, string | string[]>): string {
    const url = new URL(`${this.config.serverUrl}/api/v1/${path}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (Array.isArray(v)) {
          v.forEach((val) => url.searchParams.append(k, val));
        } else {
          url.searchParams.append(k, v);
        }
      });
    }
    return url.toString();
  }

  private getHeaders(extra: Record<string, string> = {}): Headers {
    return new Headers({
      Authorization: `Basic ${this.config.authHeader}`,
      Accept: "application/json",
      ...extra,
    });
  }

  private async fetch<T>(
    path: string,
    params?: Record<string, string | string[]>,
    options: RequestInit & { revalidate?: number; tags?: string[] } = {}
  ): Promise<T> {
    const url = this.buildUrl(path, params);
    const headers = this.getHeaders(options.body ? { "Content-Type": "application/json" } : {});

    const isDebug = process.env.KOMGA_DEBUG === "true";
    const isCacheDebug = process.env.CACHE_DEBUG === "true";

    if (isDebug) {
      logger.info(
        { url, method: options.method || "GET", params, revalidate: options.revalidate },
        "🔵 Komga Request"
      );
    }
    if (isCacheDebug) {
      if (options.tags) {
        logger.info({ url, cache: "tags", tags: options.tags }, "💾 Cache tags");
      } else if (options.revalidate !== undefined) {
        logger.info({ url, cache: "revalidate", ttl: options.revalidate }, "💾 Cache revalidate");
      } else {
        logger.info({ url, cache: "none" }, "💾 Cache none");
      }
    }

    const nextOptions = options.tags
      ? { tags: options.tags }
      : options.revalidate !== undefined
        ? { revalidate: options.revalidate }
        : undefined;

    const fetchOptions = {
      headers,
      ...options,
      next: nextOptions,
    };

    // Next.js does not cache POST fetch requests — use unstable_cache to cache results instead
    if (options.method === "POST" && nextOptions) {
      const cacheKey = ["komga", this.config.authHeader, url, String(options.body ?? "")];
      return unstable_cache(() => this.executeRequest<T>(url, fetchOptions), cacheKey, nextOptions)();
    }

    return this.executeRequest<T>(url, fetchOptions);
  }

  private async executeRequest<T>(url: string, fetchOptions: RequestInit): Promise<T> {
    const isDebug = process.env.KOMGA_DEBUG === "true";
    const startTime = isDebug ? Date.now() : 0;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    interface FetchErrorLike {
      code?: string;
      cause?: { code?: string };
    }

    const doFetch = async () => {
      try {
        return await fetch(url, { ...fetchOptions, signal: controller.signal });
      } catch (err: unknown) {
        const e = err as FetchErrorLike;
        if (e.cause?.code === "EAI_AGAIN" || e.code === "EAI_AGAIN") {
          logger.error(`DNS resolution failed for ${url}, retrying...`);
          return fetch(url, { ...fetchOptions, signal: controller.signal });
        }
        if (e.cause?.code === "UND_ERR_CONNECT_TIMEOUT") {
          logger.info(`⏱️ Connection timeout for ${url}, retrying (cold start)...`);
          return fetch(url, { ...fetchOptions, signal: controller.signal });
        }
        throw err;
      }
    };

    try {
      const response = await doFetch();
      clearTimeout(timeoutId);

      if (isDebug) {
        const duration = Date.now() - startTime;
        logger.info(
          { url, status: response.status, duration: `${duration}ms`, ok: response.ok },
          "🟢 Komga Response"
        );
      }

      if (!response.ok) {
        if (isDebug) {
          logger.error(
            { url, status: response.status, statusText: response.statusText },
            "🔴 Komga Error Response"
          );
        }
        throw new AppError(codeForHttpStatus(response.status, KOMGA_HTTP_CODES), {
          status: response.status,
          statusText: response.statusText,
        });
      }
      return response.json();
    } catch (error) {
      if (isDebug) {
        logger.error(
          {
            url,
            error: error instanceof Error ? error.message : String(error),
            duration: `${Date.now() - startTime}ms`,
          },
          "🔴 Komga Request Failed"
        );
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async getLibraries(): Promise<NormalizedLibrary[]> {
    const raw = await this.fetch<KomgaLibrary[]>("libraries", undefined, {
      revalidate: CACHE_TTL_LONG,
    });
    return raw.map(KomgaAdapter.toNormalizedLibrary);
  }

  async getSeries(libraryId: string, cursor?: string, limit = 20, unreadOnly = false, search?: string, _sort?: string, _hasMissing?: boolean): Promise<NormalizedSeriesPage> {
    const page = cursor ? parseInt(cursor, 10) - 1 : 0;

    let condition: KomgaCondition;
    if (unreadOnly) {
      condition = {
        allOf: [
          { libraryId: { operator: "is", value: libraryId } },
          {
            anyOf: [
              { readStatus: { operator: "is", value: "UNREAD" } },
              { readStatus: { operator: "is", value: "IN_PROGRESS" } },
            ],
          },
        ],
      };
    } else {
      condition = { libraryId: { operator: "is", value: libraryId } };
    }

    const searchBody: { condition: KomgaCondition; fullTextSearch?: string } = { condition };
    if (search) searchBody.fullTextSearch = search;

    const response = await this.fetch<LibraryResponse<KomgaSeries>>(
      "series/list",
      { page: String(page), size: String(limit), sort: "metadata.titleSort,asc" },
      {
        method: "POST",
        body: JSON.stringify(searchBody),
        revalidate: CACHE_TTL_MED,
        tags: [LIBRARY_SERIES_CACHE_TAG, `library-series:${libraryId}`],
      }
    );

    const filtered = response.content.filter((s) => !s.deleted);
    const sorted = [...filtered].sort((a, b) => {
      const ta = a.metadata?.titleSort ?? "";
      const tb = b.metadata?.titleSort ?? "";
      const cmp = ta.localeCompare(tb);
      return cmp !== 0 ? cmp : a.id.localeCompare(b.id);
    });

    return {
      items: sorted.map(KomgaAdapter.toNormalizedSeries),
      nextCursor: response.last ? null : String(page + 1),
      totalPages: response.totalPages,
      totalElements: response.totalElements,
    };
  }

  async getBooks(filter: BookListFilter): Promise<NormalizedBooksPage> {
    const page = filter.cursor ? parseInt(filter.cursor, 10) - 1 : 0;
    const limit = filter.limit ?? 24;
    let condition: KomgaCondition;

    if (filter.seriesName && filter.unreadOnly) {
      condition = {
        allOf: [
          { seriesId: { operator: "is", value: filter.seriesName } },
          {
            anyOf: [
              { readStatus: { operator: "is", value: "UNREAD" } },
              { readStatus: { operator: "is", value: "IN_PROGRESS" } },
            ],
          },
        ],
      };
    } else if (filter.seriesName) {
      condition = { seriesId: { operator: "is", value: filter.seriesName } };
    } else if (filter.libraryId) {
      condition = { libraryId: { operator: "is", value: filter.libraryId } };
    } else {
      condition = {};
    }

    const granularTags: string[] = [SERIES_BOOKS_CACHE_TAG];
    if (filter.seriesName) granularTags.push(`series-books:${filter.seriesName}`);
    if (filter.libraryId) granularTags.push(`library-books:${filter.libraryId}`);

    const response = await this.fetch<LibraryResponse<KomgaBook>>(
      "books/list",
      { page: String(page), size: String(limit), sort: "metadata.numberSort,asc" },
      { method: "POST", body: JSON.stringify({ condition }), revalidate: CACHE_TTL_MED, tags: granularTags }
    );
    const items = response.content.filter((b) => !b.deleted).map(KomgaAdapter.toNormalizedBook);
    return {
      items,
      nextCursor: response.last ? null : String(page + 1),
      totalPages: response.totalPages,
      totalElements: response.totalElements,
    };
  }

  async getBook(bookId: string): Promise<NormalizedBook> {
    const [book, pages] = await Promise.all([
      // The reader starts at this position. It must come from Komga on every
      // visit: the read-progress mutation invalidates app caches, but this
      // provider request has no tag of its own and a TTL can otherwise resume
      // a stale page after a reload.
      this.fetch<KomgaBook>(`books/${bookId}`, undefined, { cache: "no-store" }),
      this.fetch<{ number: number }[]>(`books/${bookId}/pages`, undefined, {
        revalidate: CACHE_TTL_SHORT,
      }),
    ]);
    const normalized = KomgaAdapter.toNormalizedBook(book);
    return { ...normalized, pageCount: pages.length };
  }

  async getSeriesById(seriesId: string): Promise<NormalizedSeries | null> {
    const series = await this.fetch<KomgaSeries>(`series/${seriesId}`, undefined, {
      revalidate: CACHE_TTL_MED,
    });
    return KomgaAdapter.toNormalizedSeries(series);
  }

  async getReadProgress(bookId: string): Promise<NormalizedReadProgress | null> {
    const book = await this.fetch<KomgaBook>(`books/${bookId}`, undefined, {
      revalidate: CACHE_TTL_SHORT,
    });
    return KomgaAdapter.toNormalizedReadProgress(book.readProgress);
  }

  async saveReadProgress(bookId: string, page: number | null, completed: boolean): Promise<void> {
    const url = this.buildUrl(`books/${bookId}/read-progress`);
    const headers = this.getHeaders({ "Content-Type": "application/json" });
    const response = await fetch(url, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ page: page ?? 0, completed }),
    });
    if (!response.ok) {
      throw new AppError(ERROR_CODES.BOOK.PROGRESS_UPDATE_ERROR);
    }
  }

  // Komga ne gère pas la notation de séries — l'UI est masquée côté page
  // (getActiveProviderType() === "stripstream"). Ces méthodes ne devraient
  // jamais être appelées en pratique.
  async getSeriesRating(_seriesId: string): Promise<NormalizedSeriesRating | null> {
    return null;
  }

  async setSeriesRating(_seriesId: string, _rating: number): Promise<void> {
    throw new AppError(ERROR_CODES.SERIES.RATING_NOT_SUPPORTED);
  }

  async deleteSeriesRating(_seriesId: string): Promise<void> {
    throw new AppError(ERROR_CODES.SERIES.RATING_NOT_SUPPORTED);
  }

  async search(query: string, limit = 6): Promise<NormalizedSearchResult[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const body = { fullTextSearch: trimmed };
    const [seriesResp, booksResp] = await Promise.all([
      this.fetch<LibraryResponse<KomgaSeries>>(
        "series/list",
        { page: "0", size: String(limit) },
        { method: "POST", body: JSON.stringify(body), revalidate: CACHE_TTL_SHORT }
      ),
      this.fetch<LibraryResponse<KomgaBook>>(
        "books/list",
        { page: "0", size: String(limit) },
        { method: "POST", body: JSON.stringify(body), revalidate: CACHE_TTL_SHORT }
      ),
    ]);

    const results: NormalizedSearchResult[] = [
      ...seriesResp.content
        .filter((s) => !s.deleted)
        .map((s) => ({
          id: s.id,
          title: s.metadata?.title ?? s.name,
          href: `/series/${s.id}`,
          coverUrl: `/api/komga/images/series/${s.id}/thumbnail`,
          type: "series" as const,
          bookCount: s.booksCount,
        })),
      ...booksResp.content
        .filter((b) => !b.deleted)
        .map((b) => ({
          id: b.id,
          title: b.metadata?.title ?? b.name,
          seriesTitle: b.seriesTitle,
          seriesId: b.seriesId,
          href: `/books/${b.id}`,
          coverUrl: `/api/komga/images/books/${b.id}/thumbnail`,
          type: "book" as const,
        })),
    ];
    return results;
  }

  async getLibraryById(libraryId: string): Promise<NormalizedLibrary | null> {
    const libraries = await this.getLibraries();
    return libraries.find((lib) => lib.id === libraryId) ?? null;
  }

  async getNextBook(bookId: string): Promise<NormalizedBook | null> {
    try {
      const book = await this.fetch<KomgaBook>(`books/${bookId}/next`);
      return KomgaAdapter.toNormalizedBook(book);
    } catch (error) {
      if (
        error instanceof AppError &&
        (error as AppError & { params?: { status?: number } }).params?.status === 404
      ) {
        return null;
      }
      return null;
    }
  }

  async getMissingBooks(): Promise<NormalizedMissingBook[]> {
    return [];
  }

  async getHomePrimaryData(): Promise<HomePrimaryData> {
    return unstable_cache(
      () => this.fetchHomePrimaryData(),
      ["komga-home-primary", this.config.serverUrl, this.config.authHeader],
      { revalidate: CACHE_TTL_MED, tags: [HOME_CACHE_TAG] }
    )();
  }

  private async fetchHomePrimaryData(): Promise<HomePrimaryData> {
    const [continueReadingData, ongoing] = await Promise.all([
      this.getHomeContinueReadingData(),
      this.getHomeOngoingSeries(),
    ]);

    return {
      ongoing,
      ongoingBooks: continueReadingData.ongoingBooks,
      onDeck: continueReadingData.onDeck,
    };
  }

  async getHomeDeferredData(): Promise<HomeDeferredData> {
    return unstable_cache(
      () => this.fetchHomeDeferredData(),
      ["komga-home-deferred", this.config.serverUrl, this.config.authHeader],
      { revalidate: CACHE_TTL_MED, tags: [HOME_CACHE_TAG] }
    )();
  }

  private async fetchHomeDeferredData(): Promise<HomeDeferredData> {
    const [recentlyRead, latestSeries, readingLists] = await Promise.all([
      this.getHomeRecentlyRead(),
      this.getHomeLatestSeries(),
      this.getHomeReadingLists(),
    ]);

    return {
      recentlyRead,
      latestSeries,
      readingLists,
    };
  }

  async getHomeData(): Promise<HomeData> {
    const [primaryData, deferredData] = await Promise.all([
      this.getHomePrimaryData(),
      this.getHomeDeferredData(),
    ]);

    return {
      ...primaryData,
      ...deferredData,
    };
  }

  async getHomeContinueReadingData(limit = 10): Promise<Pick<HomePrimaryData, "ongoingBooks" | "onDeck">> {
    return unstable_cache(
      async () => {
        const results = await Promise.allSettled([
          this.fetch<LibraryResponse<KomgaBook>>(
            "books/list",
            { page: "0", size: String(limit), sort: "readProgress.readDate,desc" },
            {
              method: "POST",
              body: JSON.stringify({
                condition: { readStatus: { operator: "is", value: "IN_PROGRESS" } },
              }),
            }
          ),
          this.fetch<LibraryResponse<KomgaBook>>(
            "books/ondeck",
            { page: "0", size: String(limit), media_status: "READY" }
          ),
        ]);

        const failures = results.filter((r) => r.status === "rejected");
        if (failures.length === results.length) {
          const reasons = failures.map((r) => (r as PromiseRejectedResult).reason);
          const firstAppError = reasons.find((r): r is AppError => r instanceof AppError);
          if (firstAppError) throw firstAppError;
          throw new AppError(ERROR_CODES.HOME.FETCH_ERROR, {}, reasons[0]);
        }

        const [ongoingBooks, onDeck] = results.map((r) =>
          r.status === "fulfilled" ? r.value : { content: [] }
        ) as [LibraryResponse<KomgaBook>, LibraryResponse<KomgaBook>];

        return {
          ongoingBooks: (ongoingBooks.content || []).map(KomgaAdapter.toNormalizedBook),
          onDeck: (onDeck.content || []).map(KomgaAdapter.toNormalizedBook),
        };
      },
      ["komga-home-continue-reading", this.config.serverUrl, this.config.authHeader, String(limit)],
      { revalidate: CACHE_TTL_MED, tags: [HOME_CACHE_TAG] }
    )();
  }

  async getHomeOngoingSeries(limit = 10): Promise<NormalizedSeries[]> {
    return unstable_cache(
      async () => {
        const ongoing = await this.fetch<LibraryResponse<KomgaSeries>>(
          "series/list",
          { page: "0", size: String(limit), sort: "readDate,desc" },
          {
            method: "POST",
            body: JSON.stringify({
              condition: { readStatus: { operator: "is", value: "IN_PROGRESS" } },
            }),
          }
        );

        return (ongoing.content || []).map(KomgaAdapter.toNormalizedSeries);
      },
      ["komga-home-ongoing-series", this.config.serverUrl, this.config.authHeader, String(limit)],
      { revalidate: CACHE_TTL_MED, tags: [HOME_CACHE_TAG] }
    )();
  }

  async getHomeLatestSeries(limit = 10): Promise<NormalizedSeries[]> {
    return unstable_cache(
      async () => {
        const latestSeries = await this.fetch<LibraryResponse<KomgaSeries>>(
          "series/latest",
          { page: "0", size: String(limit), media_status: "READY" }
        );

        return (latestSeries.content || []).map(KomgaAdapter.toNormalizedSeries);
      },
      ["komga-home-latest-series", this.config.serverUrl, this.config.authHeader, String(limit)],
      { revalidate: CACHE_TTL_MED, tags: [HOME_CACHE_TAG] }
    )();
  }

  async getHomeRecentlyRead(limit = 10): Promise<NormalizedBook[]> {
    return unstable_cache(
      async () => {
        const recentlyRead = await this.fetch<LibraryResponse<KomgaBook>>(
          "books/latest",
          { page: "0", size: String(limit), media_status: "READY" }
        );

        return (recentlyRead.content || []).map(KomgaAdapter.toNormalizedBook);
      },
      ["komga-home-recently-read", this.config.serverUrl, this.config.authHeader, String(limit)],
      { revalidate: CACHE_TTL_MED, tags: [HOME_CACHE_TAG] }
    )();
  }

  async getHomeReadingLists(): Promise<StripstreamReadingList[]> {
    return [];
  }

  async resetReadProgress(bookId: string): Promise<void> {
    const url = this.buildUrl(`books/${bookId}/read-progress`);
    const headers = this.getHeaders();
    const response = await fetch(url, { method: "DELETE", headers });
    if (!response.ok) {
      throw new AppError(ERROR_CODES.BOOK.PROGRESS_DELETE_ERROR);
    }
  }

  async scanLibrary(libraryId: string): Promise<void> {
    const url = this.buildUrl(`libraries/${libraryId}/scan`);
    const headers = this.getHeaders();
    await fetch(url, { method: "POST", headers });
  }

  async getRandomBook(libraryIds?: string[]): Promise<string | null> {
    try {
      const libraryId = libraryIds?.length
        ? libraryIds[Math.floor(Math.random() * libraryIds.length)]
        : undefined;
      const condition: KomgaCondition = libraryId
        ? { libraryId: { operator: "is", value: libraryId } }
        : {};
      const getPage = (page: number) => this.fetch<LibraryResponse<KomgaBook>>(
        "books/list",
        { page: String(page), size: "20", sort: "metadata.numberSort,asc" },
        { method: "POST", body: JSON.stringify({ condition }) }
      );
      const firstPage = await getPage(0);
      const response = firstPage.totalPages > 1
        ? await getPage(Math.floor(Math.random() * firstPage.totalPages))
        : firstPage;
      const books = response.content.filter((b) => !b.deleted);
      if (!books.length) return null;
      return books[Math.floor(Math.random() * books.length)].id;
    } catch {
      return null;
    }
  }

  async getReadingStats(): Promise<NormalizedReadingStats> {
    const [libraries, totalSeries, totalBooks, booksRead, booksInProgress, booksUnread] =
      await Promise.all([
        this.fetch<KomgaLibrary[]>("libraries", undefined, { tags: [STATS_CACHE_TAG] }),
        this.countEntries("series/list"),
        this.countEntries("books/list"),
        this.countEntries("books/list", "READ"),
        this.countEntries("books/list", "IN_PROGRESS"),
        this.countEntries("books/list", "UNREAD"),
      ]);

    return {
      totalSeries,
      totalBooks,
      booksRead,
      booksInProgress,
      booksUnread,
      libraries: libraries.map((library) => ({
        id: library.id,
        name: library.name,
        bookCount: library.booksCount,
        booksReadCount: library.booksReadCount ?? 0,
      })),
    };
  }

  private async countEntries(
    endpoint: "books/list" | "series/list",
    readStatus?: "READ" | "IN_PROGRESS" | "UNREAD"
  ): Promise<number> {
    const condition: KomgaCondition = readStatus
      ? { readStatus: { operator: "is", value: readStatus } }
      : {};
    const response = await this.fetch<LibraryResponse<unknown>>(
      endpoint,
      { page: "0", size: "1" },
      { method: "POST", body: JSON.stringify({ condition }), tags: [STATS_CACHE_TAG] }
    );
    return response.totalElements;
  }

  async getRelatedSeries(_seriesId: string, _limit?: number): Promise<NormalizedSeries[]> {
    return [];
  }

  async getRecommendations(_limit?: number): Promise<NormalizedSeries[]> {
    return [];
  }

  async getFavorites(): Promise<NormalizedSeries[]> {
    return [];
  }

  async isFavorite(_seriesId: string): Promise<boolean> {
    return false;
  }

  async addToFavorites(_seriesId: string): Promise<void> {
    throw new Error("Favorites are managed locally for Komga");
  }

  async removeFromFavorites(_seriesId: string): Promise<void> {
    throw new Error("Favorites are managed locally for Komga");
  }

  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    try {
      await this.fetch<KomgaLibrary[]>("libraries");
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Connexion échouée" };
    }
  }

  getBookThumbnailUrl(bookId: string): string {
    return `/api/komga/images/books/${bookId}/thumbnail`;
  }

  getSeriesThumbnailUrl(seriesId: string): string {
    return `/api/komga/images/series/${seriesId}/thumbnail`;
  }

  getBookPageUrl(bookId: string, pageNumber: number): string {
    return `/api/komga/images/books/${bookId}/pages/${pageNumber}`;
  }
}
