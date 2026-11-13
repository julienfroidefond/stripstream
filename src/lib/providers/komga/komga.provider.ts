import {
  createProviderCapabilities,
  type IMediaProvider,
  type BookListFilter,
  type ProviderCapabilities,
} from "../provider.interface";
import type {
  NormalizedLibrary,
  NormalizedSeries,
  NormalizedBook,
  NormalizedReadProgress,
  NormalizedSearchResult,
  NormalizedSeriesPage,
  NormalizedBooksPage,
  NormalizedReadingStats,
  ScanStartResult,
  ScanStatus,
} from "../types";
import type { HomePrimaryData } from "@/types/home";
import { KomgaAdapter } from "./komga.adapter";
import { mediaUrl } from "@/lib/media/media-url";
import { createKomgaTransportPolicy } from "./komga.transport-policy";
import {
  ProviderTransport,
  type ProviderQueryParams,
  type ProviderRequestOptions,
} from "../provider-transport";
import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError } from "@/utils/errors";
import { normalizeServerUrl } from "@/utils/server-url";
import { normalizePageNumber } from "../pagination";

import type { KomgaBook, KomgaSeries, KomgaLibrary } from "@/types/komga";
import type { LibraryResponse } from "@/types/library";
import type { AuthConfig } from "@/types/auth";
import { cacheProfile } from "@/constants/cacheProfiles";
import { unstable_cache } from "next/cache";
import logger from "@/lib/logger";

type KomgaCondition = Record<string, unknown>;

/** Ordre des deux requêtes `getHomeContinueReadingData`, pour nommer les rejets. */
const CONTINUE_READING_FEEDS = ["ongoing", "onDeck"] as const;

export class KomgaProvider implements IMediaProvider {
  readonly capabilities: ProviderCapabilities;

  private config: AuthConfig;
  private transport: ProviderTransport;

  constructor(url: string, authHeader: string) {
    this.config = { serverUrl: normalizeServerUrl(url), authHeader };
    this.transport = new ProviderTransport(
      createKomgaTransportPolicy(this.config.serverUrl, authHeader)
    );
    this.capabilities = createProviderCapabilities({ search: this });
  }

  private fetch<T>(
    path: string,
    params?: ProviderQueryParams,
    options: ProviderRequestOptions = {}
  ): Promise<T> {
    return this.transport.request<T>(path, params, options);
  }

  async getLibraries(): Promise<NormalizedLibrary[]> {
    const raw = await this.fetch<KomgaLibrary[]>("libraries", undefined, cacheProfile.libraries());
    return raw.map(KomgaAdapter.toNormalizedLibrary);
  }

  async getSeries(libraryId: string, page?: number, limit = 20, unreadOnly = false, search?: string, _sort?: string, _hasMissing?: boolean): Promise<NormalizedSeriesPage> {
    const pageNumber = normalizePageNumber(page);

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
      { page: String(pageNumber - 1), size: String(limit), sort: "metadata.titleSort,asc" },
      {
        method: "POST",
        body: JSON.stringify(searchBody),
        ...cacheProfile.librarySeries(libraryId),
      }
    );

    const filtered = response.content.filter((s) => !s.deleted);
    const sorted = [...filtered].sort((a, b) => {
      const ta = a.metadata?.titleSort ?? "";
      const tb = b.metadata?.titleSort ?? "";
      const cmp = ta.localeCompare(tb);
      return cmp !== 0 ? cmp : a.id.localeCompare(b.id);
    });

    return KomgaAdapter.toPage(response, sorted.map(KomgaAdapter.toNormalizedSeries), pageNumber);
  }

  async getBooks(filter: BookListFilter): Promise<NormalizedBooksPage> {
    const pageNumber = normalizePageNumber(filter.page);
    const limit = filter.limit ?? 24;
    let condition: KomgaCondition;

    if (filter.seriesId && filter.unreadOnly) {
      condition = {
        allOf: [
          { seriesId: { operator: "is", value: filter.seriesId } },
          {
            anyOf: [
              { readStatus: { operator: "is", value: "UNREAD" } },
              { readStatus: { operator: "is", value: "IN_PROGRESS" } },
            ],
          },
        ],
      };
    } else if (filter.seriesId) {
      condition = { seriesId: { operator: "is", value: filter.seriesId } };
    } else if (filter.libraryId) {
      condition = { libraryId: { operator: "is", value: filter.libraryId } };
    } else {
      condition = {};
    }

    const response = await this.fetch<LibraryResponse<KomgaBook>>(
      "books/list",
      { page: String(pageNumber - 1), size: String(limit), sort: "metadata.numberSort,asc" },
      {
        method: "POST",
        body: JSON.stringify({ condition }),
        ...cacheProfile.books({ seriesId: filter.seriesId, libraryId: filter.libraryId }),
      }
    );
    const items = response.content.filter((b) => !b.deleted).map(KomgaAdapter.toNormalizedBook);
    return KomgaAdapter.toPage(response, items, pageNumber);
  }

  async getBook(bookId: string): Promise<NormalizedBook> {
    const [book, pages] = await Promise.all([
      // The reader starts at this position. It must come from Komga on every
      // visit: the read-progress mutation invalidates app caches, but this
      // provider request has no tag of its own and a TTL can otherwise resume
      // a stale page after a reload.
      this.fetch<KomgaBook>(`books/${bookId}`, undefined, cacheProfile.readerBook()),
      this.fetch<{ number: number }[]>(`books/${bookId}/pages`, undefined, cacheProfile.bookPages()),
    ]);
    const normalized = KomgaAdapter.toNormalizedBook(book);
    return { ...normalized, pageCount: pages.length };
  }

  async getSeriesById(seriesId: string): Promise<NormalizedSeries | null> {
    try {
      const series = await this.fetch<KomgaSeries>(`series/${seriesId}`, undefined, cacheProfile.series());
      return KomgaAdapter.toNormalizedSeries(series);
    } catch (error) {
      // L'interface promet `null` pour une série absente. Seul le 404 est une
      // absence confirmée ; une panne doit continuer de remonter.
      if (error instanceof AppError && error.code === ERROR_CODES.KOMGA.NOT_FOUND) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Komga n'expose pas de filtre « série entièrement lue » au niveau de la
   * liste : agréger les bibliothèques puis filtrer en mémoire coûtait jusqu'à
   * dix pages de 200 séries par bibliothèque, pour une page (« Mes notes ») qui
   * exige déjà la capacité `ratings`, absente de Komga. La liste des séries
   * lues appartient donc à cette capacité, pas au contrat commun.
   */

  async getReadProgress(bookId: string): Promise<NormalizedReadProgress | null> {
    const book = await this.fetch<KomgaBook>(`books/${bookId}`, undefined, cacheProfile.readProgress());
    return KomgaAdapter.toNormalizedReadProgress(book.readProgress);
  }

  async saveReadProgress(bookId: string, page: number | null, completed: boolean): Promise<void> {
    try {
      await this.fetch<void>(`books/${bookId}/read-progress`, undefined, {
        method: "PATCH",
        body: JSON.stringify({ page: page ?? 0, completed }),
      });
    } catch {
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
        { method: "POST", body: JSON.stringify(body), ...cacheProfile.search() }
      ),
      this.fetch<LibraryResponse<KomgaBook>>(
        "books/list",
        { page: "0", size: String(limit) },
        { method: "POST", body: JSON.stringify(body), ...cacheProfile.search() }
      ),
    ]);

    const results: NormalizedSearchResult[] = [
      ...seriesResp.content
        .filter((s) => !s.deleted)
        .map((s) => ({
          id: s.id,
          title: s.metadata?.title ?? s.name,
          href: `/series/${s.id}`,
          coverUrl: mediaUrl("komga", { kind: "series-cover", seriesId: s.id }),
          type: "series" as const,
          bookCount: s.booksCount,
        })),
      ...booksResp.content
        .filter((b) => !b.deleted)
        .map((b) => ({
          id: b.id,
          title: b.metadata?.title ?? b.name,
          seriesTitle: b.seriesTitle,
          href: `/books/${b.id}`,
          coverUrl: mediaUrl("komga", { kind: "book-cover", bookId: b.id }),
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

        // Une seule des deux sources peut échouer : la source saine continue
        // d'alimenter le hero, mais la raison du rejet ne doit pas disparaître.
        results.forEach((result, index) => {
          if (result.status === "rejected") {
            logger.warn(
              { err: result.reason, feed: CONTINUE_READING_FEEDS[index] },
              "Komga : flux « reprendre la lecture » partiellement indisponible"
            );
          }
        });

        const [ongoingBooks, onDeck] = results.map((r) =>
          r.status === "fulfilled" ? r.value : { content: [] }
        ) as [LibraryResponse<KomgaBook>, LibraryResponse<KomgaBook>];

        return {
          ongoingBooks: (ongoingBooks.content || []).map(KomgaAdapter.toNormalizedBook),
          onDeck: (onDeck.content || []).map(KomgaAdapter.toNormalizedBook),
        };
      },
      ["komga-home-continue-reading", this.config.serverUrl, this.config.authHeader, String(limit)],
      cacheProfile.home()
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
      cacheProfile.home()
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
      cacheProfile.home()
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
      cacheProfile.home()
    )();
  }

  async resetReadProgress(bookId: string): Promise<void> {
    try {
      await this.fetch<void>(`books/${bookId}/read-progress`, undefined, {
        method: "DELETE",
      });
    } catch {
      throw new AppError(ERROR_CODES.BOOK.PROGRESS_DELETE_ERROR);
    }
  }

  async scanLibrary(libraryId: string): Promise<ScanStartResult> {
    await this.fetch<unknown>(`libraries/${libraryId}/scan`, undefined, {
      method: "POST",
    });

    // Komga 1.24.1 exposes no task-status endpoint: `TaskController` only clears
    // the queue (`DELETE /tasks`, admin) and the SSE task events are admin-only
    // and global per type. The reader cannot follow the scan, so the UI degrades
    // to an explicit "scan started, progress unavailable" state.
    return { jobId: null, progressSupported: false };
  }

  async getScanStatus(): Promise<ScanStatus> {
    // Nothing to poll on Komga (see scanLibrary).
    return { state: "unavailable" };
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
        this.fetch<KomgaLibrary[]>("libraries", undefined, cacheProfile.stats()),
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
      { method: "POST", body: JSON.stringify({ condition }), ...cacheProfile.stats() }
    );
    return response.totalElements;
  }

  async testConnection(): Promise<{ ok: boolean; error?: string; libraryCount?: number }> {
    try {
      const libraries = await this.fetch<KomgaLibrary[]>("libraries");
      return { ok: true, libraryCount: libraries.length };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Connexion échouée" };
    }
  }

  getBookThumbnailUrl(bookId: string): string {
    return mediaUrl("komga", { kind: "book-cover", bookId });
  }
}
