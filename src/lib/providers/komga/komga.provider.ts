import type { IMediaProvider, BookListFilter } from "../provider.interface";
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
import { KomgaAdapter } from "./komga.adapter";
import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError } from "@/utils/errors";
import type { KomgaBook, KomgaSeries, KomgaLibrary } from "@/types/komga";
import type { LibraryResponse } from "@/types/library";
import type { AuthConfig } from "@/types/auth";
import logger from "@/lib/logger";
import { HOME_CACHE_TAG, LIBRARY_SERIES_CACHE_TAG, SERIES_BOOKS_CACHE_TAG } from "@/constants/cacheConstants";

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
    const startTime = isDebug ? Date.now() : 0;

    if (isDebug) {
      logger.info(
        { url, method: options.method || "GET", params, revalidate: options.revalidate },
        "🔵 Komga Request"
      );
    }
    if (isCacheDebug && options.revalidate) {
      logger.info({ url, cache: "enabled", ttl: options.revalidate }, "💾 Cache enabled");
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
      if (isCacheDebug && options.revalidate) {
        const cacheStatus = response.headers.get("x-nextjs-cache") ?? "UNKNOWN";
        logger.info({ url, cacheStatus }, `💾 Cache ${cacheStatus}`);
      }

      if (!response.ok) {
        if (isDebug) {
          logger.error(
            { url, status: response.status, statusText: response.statusText },
            "🔴 Komga Error Response"
          );
        }
        throw new AppError(ERROR_CODES.KOMGA.HTTP_ERROR, {
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
    // Enrich with book counts
    const enriched = await Promise.all(
      raw.map(async (lib) => {
        try {
          const resp = await this.fetch<{ totalElements: number }>(
            "books",
            {
              library_id: lib.id,
              size: "0",
            },
            { revalidate: CACHE_TTL_LONG }
          );
          return { ...lib, booksCount: resp.totalElements, booksReadCount: 0 } as KomgaLibrary;
        } catch {
          return { ...lib, booksCount: 0, booksReadCount: 0 } as KomgaLibrary;
        }
      })
    );
    return enriched.map(KomgaAdapter.toNormalizedLibrary);
  }

  async getSeries(libraryId: string, cursor?: string, limit = 20, unreadOnly = false, search?: string): Promise<NormalizedSeriesPage> {
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
        tags: [LIBRARY_SERIES_CACHE_TAG],
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

    const response = await this.fetch<LibraryResponse<KomgaBook>>(
      "books/list",
      { page: String(page), size: String(limit), sort: "metadata.numberSort,asc" },
      { method: "POST", body: JSON.stringify({ condition }), revalidate: CACHE_TTL_MED, tags: [SERIES_BOOKS_CACHE_TAG] }
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
      this.fetch<KomgaBook>(`books/${bookId}`, undefined, { revalidate: CACHE_TTL_SHORT }),
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
    try {
      const lib = await this.fetch<KomgaLibrary>(`libraries/${libraryId}`, undefined, {
        revalidate: CACHE_TTL_LONG,
      });
      try {
        const resp = await this.fetch<{ totalElements: number }>(
          "books",
          {
            library_id: lib.id,
            size: "0",
          },
          { revalidate: CACHE_TTL_LONG }
        );
        return KomgaAdapter.toNormalizedLibrary({
          ...lib,
          booksCount: resp.totalElements,
          booksReadCount: 0,
        });
      } catch {
        return KomgaAdapter.toNormalizedLibrary({ ...lib, booksCount: 0, booksReadCount: 0 });
      }
    } catch {
      return null;
    }
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

  async getHomeData(): Promise<HomeData> {
    const homeOpts = { revalidate: CACHE_TTL_MED, tags: [HOME_CACHE_TAG] };
    const [ongoing, ongoingBooks, recentlyRead, onDeck, latestSeries] = await Promise.all([
      this.fetch<LibraryResponse<KomgaSeries>>(
        "series/list",
        { page: "0", size: "10", sort: "readDate,desc" },
        {
          method: "POST",
          body: JSON.stringify({
            condition: { readStatus: { operator: "is", value: "IN_PROGRESS" } },
          }),
          ...homeOpts,
        }
      ).catch(() => ({ content: [] as KomgaSeries[] })),
      this.fetch<LibraryResponse<KomgaBook>>(
        "books/list",
        { page: "0", size: "10", sort: "readProgress.readDate,desc" },
        {
          method: "POST",
          body: JSON.stringify({
            condition: { readStatus: { operator: "is", value: "IN_PROGRESS" } },
          }),
          ...homeOpts,
        }
      ).catch(() => ({ content: [] as KomgaBook[] })),
      this.fetch<LibraryResponse<KomgaBook>>(
        "books/latest",
        { page: "0", size: "10", media_status: "READY" },
        { ...homeOpts }
      ).catch(() => ({ content: [] as KomgaBook[] })),
      this.fetch<LibraryResponse<KomgaBook>>(
        "books/ondeck",
        { page: "0", size: "10", media_status: "READY" },
        { ...homeOpts }
      ).catch(() => ({ content: [] as KomgaBook[] })),
      this.fetch<LibraryResponse<KomgaSeries>>(
        "series/latest",
        { page: "0", size: "10", media_status: "READY" },
        { ...homeOpts }
      ).catch(() => ({ content: [] as KomgaSeries[] })),
    ]);
    return {
      ongoing: (ongoing.content || []).map(KomgaAdapter.toNormalizedSeries),
      ongoingBooks: (ongoingBooks.content || []).map(KomgaAdapter.toNormalizedBook),
      recentlyRead: (recentlyRead.content || []).map(KomgaAdapter.toNormalizedBook),
      onDeck: (onDeck.content || []).map(KomgaAdapter.toNormalizedBook),
      latestSeries: (latestSeries.content || []).map(KomgaAdapter.toNormalizedSeries),
    };
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
      const randomPage = Math.floor(Math.random() * 5);
      const response = await this.fetch<LibraryResponse<KomgaBook>>(
        "books/list",
        { page: String(randomPage), size: "20", sort: "metadata.numberSort,asc" },
        { method: "POST", body: JSON.stringify({ condition }) }
      );
      const books = response.content.filter((b) => !b.deleted);
      if (!books.length) return null;
      return books[Math.floor(Math.random() * books.length)].id;
    } catch {
      return null;
    }
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
