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
} from "./types";
import type { HomePrimaryData } from "@/types/home";

export interface BookListFilter {
  libraryId?: string;
  seriesId?: string;
  cursor?: string;
  limit?: number;
  unreadOnly?: boolean;
}

/**
 * Le contrat que tout backend doit satisfaire : le catalogue, la progression
 * de lecture et les surfaces accueil/admin communes. Les fonctionnalités
 * optionnelles sont déclarées dans `IMediaProvider.capabilities`, jamais
 * simulées par un résultat vide ou une exception « non supporté ».
 */
export interface MediaProviderCore {
  // ── Collections ─────────────────────────────────────────────────────────
  getLibraries(): Promise<NormalizedLibrary[]>;
  getLibraryById(libraryId: string): Promise<NormalizedLibrary | null>;

  getSeries(libraryId: string, cursor?: string, limit?: number, unreadOnly?: boolean, search?: string, sort?: string, hasMissing?: boolean): Promise<NormalizedSeriesPage>;
  getSeriesById(seriesId: string): Promise<NormalizedSeries | null>;

  getBooks(filter: BookListFilter): Promise<NormalizedBooksPage>;
  getBook(bookId: string): Promise<NormalizedBook>;
  /**
   * Séries entièrement lues par l'utilisateur, toutes bibliothèques confondues.
   * Utilisée par la page « Mes notes » pour proposer les séries à noter.
   */
  getReadSeries(page?: number, limit?: number): Promise<NormalizedSeriesPage>;
  getNextBook(bookId: string): Promise<NormalizedBook | null>;

  // ── Home ─────────────────────────────────────────────────────────────────
  getHomeContinueReadingData(limit?: number): Promise<Pick<HomePrimaryData, "ongoingBooks" | "onDeck">>;
  getHomeOngoingSeries(limit?: number): Promise<NormalizedSeries[]>;
  getHomeLatestSeries(limit?: number): Promise<NormalizedSeries[]>;
  getHomeRecentlyRead(limit?: number): Promise<NormalizedBook[]>;

  // ── Read progress ────────────────────────────────────────────────────────
  getReadProgress(bookId: string): Promise<NormalizedReadProgress | null>;
  saveReadProgress(bookId: string, page: number | null, completed: boolean): Promise<void>;
  resetReadProgress(bookId: string): Promise<void>;

  // ── Admin / utility ──────────────────────────────────────────────────────
  scanLibrary(libraryId: string): Promise<ScanStartResult>;
  /** Follow a scan started by `scanLibrary`; returns `unavailable` when the backend cannot report it. */
  getScanStatus(libraryId: string, jobId?: string | null): Promise<ScanStatus>;
  getRandomBook(libraryIds?: string[]): Promise<string | null>;

  // ── Reading statistics (active connection) ───────────────────────────────
  getReadingStats(): Promise<NormalizedReadingStats>;

  // ── Connection ───────────────────────────────────────────────────────────
  testConnection(): Promise<{ ok: boolean; error?: string; libraryCount?: number }>;

  // ── URL builder (returns a local proxy URL) ───────────────────────────────
  getBookThumbnailUrl(bookId: string): string;
}

/** Listes de séries éditoriales et ordonnées. Stripstream uniquement aujourd'hui. */
export interface ReadingListsCapability {
  getReadingLists(): Promise<NormalizedReadingList[]>;
  getReadingListDetail(id: string): Promise<NormalizedReadingListDetail | null>;
}

/** Recherche plein texte sur les séries et les tomes. */
export interface SearchCapability {
  search(query: string, limit?: number): Promise<NormalizedSearchResult[]>;
}

/** Notes par série et agrégat du provider. Stripstream uniquement aujourd'hui. */
export interface RatingsCapability {
  getSeriesRating(seriesId: string): Promise<NormalizedSeriesRating | null>;
  setSeriesRating(seriesId: string, rating: number): Promise<void>;
  deleteSeriesRating(seriesId: string): Promise<void>;
}

/** La « mise de côté » du lecteur. Stripstream uniquement aujourd'hui. */
export interface ShelfCapability {
  getShelvedSeries(limit?: number): Promise<NormalizedSeries[]>;
  isShelved(seriesId: string): Promise<boolean>;
  shelveSeries(seriesId: string): Promise<void>;
  unshelveSeries(seriesId: string): Promise<void>;
}

/** Tomes manquants détectés dans la séquence d'une série. Stripstream uniquement aujourd'hui. */
export interface MissingBooksCapability {
  getMissingBooks(seriesId: string): Promise<NormalizedMissingBook[]>;
}

/** Séries liées et recommandées. Stripstream uniquement aujourd'hui. */
export interface DiscoveryCapability {
  getRelatedSeries(seriesId: string, limit?: number): Promise<NormalizedSeries[]>;
  getRecommendations(limit?: number): Promise<NormalizedSeries[]>;
}

/**
 * Favoris stockés par le backend. Un backend sans cette capacité les garde
 * dans le stockage local de l'application (Komga).
 */
export interface FavoritesCapability {
  getFavorites(): Promise<NormalizedSeries[]>;
  isFavorite(seriesId: string): Promise<boolean>;
  addToFavorites(seriesId: string): Promise<void>;
  removeFromFavorites(seriesId: string): Promise<void>;
}

/**
 * Les fonctionnalités optionnelles qu'un backend implémente. `null` est une
 * absence explicite : l'appelant masque la fonctionnalité ou retombe sur son
 * stockage local, sans jamais déduire le support du type de connexion.
 */
export interface ProviderCapabilities {
  readonly readingLists: ReadingListsCapability | null;
  readonly search: SearchCapability | null;
  readonly ratings: RatingsCapability | null;
  readonly shelf: ShelfCapability | null;
  readonly missingBooks: MissingBooksCapability | null;
  readonly discovery: DiscoveryCapability | null;
  readonly favorites: FavoritesCapability | null;
}

export type ProviderCapabilityKey = keyof ProviderCapabilities;

/** Forme stable pour les adaptateurs et les tests : tout est absent par défaut. */
export function createProviderCapabilities(
  overrides: Partial<ProviderCapabilities> = {}
): ProviderCapabilities {
  return {
    readingLists: null,
    search: null,
    ratings: null,
    shelf: null,
    missingBooks: null,
    discovery: null,
    favorites: null,
    ...overrides,
  };
}

export interface IMediaProvider extends MediaProviderCore {
  readonly capabilities: ProviderCapabilities;
}
