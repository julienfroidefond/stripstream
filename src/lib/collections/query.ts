import { normalizeGridPageSize } from "@/lib/pageSize";
import type { IMediaProvider, BookListFilter } from "@/lib/providers/provider.interface";
import type { Page } from "@/lib/providers/pagination";
import type { NormalizedSeriesPage } from "@/lib/providers/types";
import type { SortOrder } from "@/types/preferences";

/**
 * Contrat des requêtes de collection.
 *
 * Une page de collection (grille de séries d'une bibliothèque, grille de tomes
 * d'une série) est décrite par les mêmes paramètres d'URL et les mêmes
 * préférences par défaut, quelle que soit la surface qui la sert. Les pages App
 * Router lisent leurs `searchParams` via ce module, puis passent la requête
 * normalisée au provider ; aucun défaut ni borne ne vit dans la page.
 */

export const DEFAULT_COLLECTION_PAGE_SIZE = 30;

export interface CollectionSearchParams {
  page?: string;
  size?: string;
  unread?: string;
}

/** Préférences qui fournissent les valeurs par défaut d'une collection. */
export interface CollectionQueryDefaults {
  itemsPerPage: number;
  compact: boolean;
  unreadOnly: boolean;
}

export interface CollectionQuery {
  page: number;
  pageSize: number;
  unreadOnly: boolean;
}

export interface SeriesCollectionSearchParams extends CollectionSearchParams {
  search?: string;
  sort?: string;
  missing?: string;
}

/** Contexte d'une grille de séries : défauts d'affichage + capacités provider. */
export interface SeriesCollectionContext extends CollectionQueryDefaults {
  defaultSortOrder: SortOrder;
  /**
   * Préférence « Afficher les séries complètes » : `false` ouvre la grille
   * avec le filtre « Manquants » actif. `usePaginatedGrid` écrit la même
   * valeur (`showMissingBooks = !filtreActif`) quand l'utilisateur bascule le
   * filtre ; voir `missingFilterFromPreference` / `preferenceForMissingFilter`.
   */
  showMissingBooks: boolean;
  canSortByRating: boolean;
}

export interface SeriesCollectionQuery extends CollectionQuery {
  search?: string;
  sort: SortOrder;
  /** `true` = ne garder que les séries auxquelles il manque des tomes. */
  missing: boolean;
}

/** Page valide : entier strictement positif, sinon 1. */
export function parsePage(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

/**
 * Charge une page de collection en la bornant à la dernière page existante.
 *
 * Une URL périmée (`?page=3` alors qu'il n'y a plus que deux pages) servait une
 * page vide titrée « Page 3 sur 2 » sans pagination pour revenir. Le provider
 * donne `totalPages` avec la page : au-delà, on recharge la dernière (un seul
 * aller-retour supplémentaire, uniquement dans ce cas), comme
 * `paginateReadSeries` le fait pour les notes.
 */
export async function loadClampedPage<T extends Pick<Page<unknown>, "totalPages">>(
  requestedPage: number,
  load: (page: number) => Promise<T>
): Promise<{ page: number; result: T }> {
  const result = await load(requestedPage);
  const lastPage = Math.max(1, result.totalPages);
  if (requestedPage <= lastPage) return { page: requestedPage, result };
  return { page: lastPage, result: await load(lastPage) };
}

/** Filtre « Manquants » par défaut déduit de la préférence `showMissingBooks`. */
export function missingFilterFromPreference(showMissingBooks: boolean): boolean {
  return !showMissingBooks;
}

/** Valeur de `showMissingBooks` à persister quand le filtre « Manquants » bascule. */
export function preferenceForMissingFilter(missingFilterActive: boolean): boolean {
  return !missingFilterActive;
}

/** Tri connu, sinon le tri par titre (même règle que le contrôleur client). */
export function normalizeSortOrder(value: string | undefined): SortOrder {
  return value === "latest" || value === "community_score" ? value : "title";
}

function parsePageSize(
  value: string | undefined,
  defaults: CollectionQueryDefaults
): number {
  const requested = value
    ? Number.parseInt(value, 10)
    : defaults.itemsPerPage || DEFAULT_COLLECTION_PAGE_SIZE;

  return normalizeGridPageSize(requested, defaults.compact);
}

/** Pagination + filtre unread communs aux grilles de séries et de tomes. */
export function parseCollectionQuery(
  searchParams: CollectionSearchParams,
  defaults: CollectionQueryDefaults
): CollectionQuery {
  return {
    page: parsePage(searchParams.page),
    pageSize: parsePageSize(searchParams.size, defaults),
    unreadOnly:
      searchParams.unread !== undefined
        ? searchParams.unread === "true"
        : defaults.unreadOnly,
  };
}

/** Requête complète d'une grille de séries : pagination, recherche, tri, manquants. */
export function parseSeriesCollectionQuery(
  searchParams: SeriesCollectionSearchParams,
  context: SeriesCollectionContext
): SeriesCollectionQuery {
  const requestedSort = normalizeSortOrder(searchParams.sort ?? context.defaultSortOrder);
  // Un tri par note mémorisé côté préférences ne doit pas casser une connexion
  // dont le provider n'expose pas les notes.
  const sort =
    !context.canSortByRating && requestedSort === "community_score"
      ? "title"
      : requestedSort;

  const missing =
    searchParams.missing !== undefined
      ? searchParams.missing === "true"
      : missingFilterFromPreference(context.showMissingBooks);

  return {
    ...parseCollectionQuery(searchParams, context),
    search: searchParams.search,
    sort,
    missing,
  };
}

/**
 * Construit et exécute la page provider d'une grille de séries, bornée à la
 * dernière page : `query.page` du résultat est la page réellement servie.
 */
export async function fetchSeriesCollectionPage(
  provider: Pick<IMediaProvider, "getSeries">,
  libraryId: string,
  query: SeriesCollectionQuery
): Promise<{ query: SeriesCollectionQuery; seriesPage: NormalizedSeriesPage }> {
  const { page, result } = await loadClampedPage(query.page, (page) =>
    provider.getSeries(
      libraryId,
      page,
      query.pageSize,
      query.unreadOnly,
      query.search,
      query.sort,
      query.missing
    )
  );
  return { query: { ...query, page }, seriesPage: result };
}

/**
 * Charge la page de tomes d'une série, bornée à la dernière page : `query.page`
 * du résultat est la page réellement servie.
 */
export async function fetchBookCollectionPage<T extends Pick<Page<unknown>, "totalPages">>(
  provider: { getBooks(filter: BookListFilter): Promise<T> },
  seriesId: string,
  query: CollectionQuery
): Promise<{ query: CollectionQuery; booksPage: T }> {
  const { page, result } = await loadClampedPage(query.page, (page) =>
    provider.getBooks(bookCollectionFilter(seriesId, { ...query, page }))
  );
  return { query: { ...query, page }, booksPage: result };
}

/** Filtre provider de la grille de tomes d'une série. */
export function bookCollectionFilter(
  seriesId: string,
  query: CollectionQuery
): BookListFilter {
  return {
    seriesId,
    page: query.page,
    limit: query.pageSize,
    unreadOnly: query.unreadOnly,
  };
}
