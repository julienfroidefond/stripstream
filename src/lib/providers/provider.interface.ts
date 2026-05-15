import type {
  NormalizedLibrary,
  NormalizedSeries,
  NormalizedBook,
  NormalizedReadProgress,
  NormalizedSearchResult,
  NormalizedSeriesPage,
  NormalizedBooksPage,
  NormalizedMissingBook,
} from "./types";
import type { HomeData } from "@/types/home";

export interface BookListFilter {
  libraryId?: string;
  seriesName?: string;
  cursor?: string;
  limit?: number;
  unreadOnly?: boolean;
}

export interface IMediaProvider {
  // ── Collections ─────────────────────────────────────────────────────────
  getLibraries(): Promise<NormalizedLibrary[]>;
  getLibraryById(libraryId: string): Promise<NormalizedLibrary | null>;

  getSeries(libraryId: string, cursor?: string, limit?: number, unreadOnly?: boolean, search?: string, sort?: string, hasMissing?: boolean): Promise<NormalizedSeriesPage>;
  getSeriesById(seriesId: string): Promise<NormalizedSeries | null>;

  getBooks(filter: BookListFilter): Promise<NormalizedBooksPage>;
  getBook(bookId: string): Promise<NormalizedBook>;
  getNextBook(bookId: string): Promise<NormalizedBook | null>;
  getMissingBooks(seriesId: string): Promise<NormalizedMissingBook[]>;

  // ── Home ─────────────────────────────────────────────────────────────────
  getHomeData(): Promise<HomeData>;

  // ── Read progress ────────────────────────────────────────────────────────
  getReadProgress(bookId: string): Promise<NormalizedReadProgress | null>;
  saveReadProgress(bookId: string, page: number | null, completed: boolean): Promise<void>;
  resetReadProgress(bookId: string): Promise<void>;

  // ── Admin / utility ──────────────────────────────────────────────────────
  scanLibrary(libraryId: string): Promise<void>;
  getRandomBook(libraryIds?: string[]): Promise<string | null>;

  // ── Related series ───────────────────────────────────────────────────────
  getRelatedSeries(seriesId: string, limit?: number): Promise<NormalizedSeries[]>;

  // ── Search ───────────────────────────────────────────────────────────────
  search(query: string, limit?: number): Promise<NormalizedSearchResult[]>;

  // ── Connection ───────────────────────────────────────────────────────────
  testConnection(): Promise<{ ok: boolean; error?: string }>;

  // ── URL builders (return local proxy URLs) ───────────────────────────────
  getBookThumbnailUrl(bookId: string): string;
  getSeriesThumbnailUrl(seriesId: string): string;
  getBookPageUrl(bookId: string, pageNumber: number): string;
}
