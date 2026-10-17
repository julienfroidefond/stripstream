export type ProviderType = "komga" | "stripstream";

export interface NormalizedReadProgress {
  page: number | null;
  completed: boolean;
  lastReadAt: string | null;
}

export interface NormalizedLibrary {
  id: string;
  name: string;
  bookCount: number;
  /** Books the current user has finished in this library. Optional: providers that cannot supply it omit it. */
  booksReadCount?: number;
}

export interface NormalizedLibraryReadingStats {
  id: string;
  name: string;
  bookCount: number;
  booksReadCount: number;
}

export interface NormalizedReadingStats {
  totalSeries: number;
  totalBooks: number;
  booksRead: number;
  booksInProgress: number;
  booksUnread: number;
  libraries: NormalizedLibraryReadingStats[];
}

export interface NormalizedSeries {
  id: string;
  name: string;
  bookCount: number;
  booksReadCount: number;
  thumbnailUrl: string;
  libraryId?: string;
  // Optional metadata (Komga-rich, Stripstream-sparse)
  summary?: string | null;
  authors?: Array<{ name: string; role: string }>;
  genres?: string[];
  tags?: string[];
  createdAt?: string | null;
  startYear?: number | null;
  missingCount?: number | null;
  seriesStatus?: string | null;
  matchReasons?: string[];
  /** For recommendations: names of recently-read series that triggered this recommendation. */
  becauseOf?: string[];
  /**
   * Aggregate community rating on the API-native 0-5 scale (Stripstream only).
   * Rendered as /10 on cards via `communityScoreToTen` to match the series page.
   */
  communityScore?: number | null;
  /** Current user's own half-star rating (1-10), null when unrated (Stripstream only). */
  userRating?: number | null;
}

export interface NormalizedBook {
  id: string;
  libraryId: string;
  title: string;
  number: string | null;
  seriesId: string | null;
  volume: number | null;
  pageCount: number;
  thumbnailUrl: string;
  /**
   * Local proxy URL that streams the original source file (CBZ/CBR/PDF/EPUB).
   * Built by each provider adapter, exactly like `thumbnailUrl`, so the UI never
   * needs to know which backend is active.
   */
  downloadUrl?: string;
  readProgress: NormalizedReadProgress | null;
  volumeType?: string | null;
  /** Optional per-book summary (Komga-rich, Stripstream usually absent). */
  summary?: string | null;
}

export interface NormalizedMissingBook {
  title: string;
  volumeNumber: number;
  coverUrl: string | null;
}

export interface NormalizedProviderRating {
  provider: string;
  rating: number;
  ratingScale: number;
  ratingCount: number | null;
}

export interface NormalizedSeriesRating {
  /** User rating on the 1-10 half-star scale, or null if unrated. */
  userRating: number | null;
  /** Aggregate ratings from linked metadata providers (AniList, MangaDex, …), read-only. */
  providerRatings: NormalizedProviderRating[];
}

export interface NormalizedSearchResult {
  id: string;
  title: string;
  seriesTitle?: string | null;
  seriesId?: string | null;
  href: string;
  coverUrl: string;
  type: "series" | "book";
  bookCount?: number;
}

export interface NormalizedSeriesPage {
  items: NormalizedSeries[];
  nextCursor: string | null;
  totalPages?: number;
  totalElements?: number;
}

export interface NormalizedBooksPage {
  items: NormalizedBook[];
  nextCursor: string | null;
  totalPages?: number;
  totalElements?: number;
}

/**
 * Lifecycle of a library scan as reported by the backend.
 *
 * `unavailable` is the honest answer when the provider exposes no way to follow
 * the scan: the UI must not invent a completion.
 */
export type ScanState = "running" | "completed" | "failed" | "cancelled" | "unavailable";

/** Result of starting a library scan. */
export interface ScanStartResult {
  /** Backend job id when the provider can report progress, otherwise null. */
  jobId: string | null;
  /** True when `getScanStatus` can follow the scan started by this call. */
  progressSupported: boolean;
}

export interface ScanStatus {
  state: ScanState;
  /** Completion percentage (0-100) when the backend exposes it. */
  progressPercent?: number;
  processedFiles?: number;
  totalFiles?: number;
  /** Backend-provided failure message, when available. */
  error?: string;
}
