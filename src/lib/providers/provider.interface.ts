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
} from "./types";
import type { HomeData, HomeDeferredData, HomePrimaryData } from "@/types/home";
import type { StripstreamReadingList } from "@/types/stripstream";

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
  getHomeContinueReadingData(limit?: number): Promise<Pick<HomePrimaryData, "ongoingBooks" | "onDeck">>;
  getHomeOngoingSeries(limit?: number): Promise<NormalizedSeries[]>;
  getHomeLatestSeries(limit?: number): Promise<NormalizedSeries[]>;
  getHomeRecentlyRead(limit?: number): Promise<NormalizedBook[]>;
  getHomeReadingLists(): Promise<StripstreamReadingList[]>;
  getHomePrimaryData(): Promise<HomePrimaryData>;
  getHomeDeferredData(): Promise<HomeDeferredData>;
  getHomeData(): Promise<HomeData>;

  // ── Read progress ────────────────────────────────────────────────────────
  getReadProgress(bookId: string): Promise<NormalizedReadProgress | null>;
  saveReadProgress(bookId: string, page: number | null, completed: boolean): Promise<void>;
  resetReadProgress(bookId: string): Promise<void>;

  // ── Series rating (Stripstream only; Komga returns null / throws not-supported) ──
  getSeriesRating(seriesId: string): Promise<NormalizedSeriesRating | null>;
  setSeriesRating(seriesId: string, rating: number): Promise<void>;
  deleteSeriesRating(seriesId: string): Promise<void>;

  // ── Admin / utility ──────────────────────────────────────────────────────
  scanLibrary(libraryId: string): Promise<void>;
  getRandomBook(libraryIds?: string[]): Promise<string | null>;

  // ── Reading statistics (active connection) ───────────────────────────────
  getReadingStats(): Promise<NormalizedReadingStats>;

  // ── Related / recommended series ─────────────────────────────────────────
  getRelatedSeries(seriesId: string, limit?: number): Promise<NormalizedSeries[]>;
  getRecommendations(limit?: number): Promise<NormalizedSeries[]>;

  // ── Favorites ────────────────────────────────────────────────────────────
  getFavorites(): Promise<NormalizedSeries[]>;
  isFavorite(seriesId: string): Promise<boolean>;
  addToFavorites(seriesId: string): Promise<void>;
  removeFromFavorites(seriesId: string): Promise<void>;

  // ── Search ───────────────────────────────────────────────────────────────
  search(query: string, limit?: number): Promise<NormalizedSearchResult[]>;

  // ── Connection ───────────────────────────────────────────────────────────
  testConnection(): Promise<{ ok: boolean; error?: string }>;

  // ── URL builders (return local proxy URLs) ───────────────────────────────
  getBookThumbnailUrl(bookId: string): string;
  getSeriesThumbnailUrl(seriesId: string): string;
  getBookPageUrl(bookId: string, pageNumber: number): string;
}
