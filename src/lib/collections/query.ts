import { normalizeGridPageSize } from "@/lib/pageSize";
import type { IMediaProvider, BookListFilter } from "@/lib/providers/provider.interface";
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
      : context.showMissingBooks === false;

  return {
    ...parseCollectionQuery(searchParams, context),
    search: searchParams.search,
    sort,
    missing,
  };
}

/** Construit et exécute la page provider d'une grille de séries. */
export async function fetchSeriesCollectionPage(
  provider: Pick<IMediaProvider, "getSeries">,
  libraryId: string,
  query: SeriesCollectionQuery
): Promise<NormalizedSeriesPage> {
  return provider.getSeries(
    libraryId,
    String(query.page),
    query.pageSize,
    query.unreadOnly,
    query.search,
    query.sort,
    query.missing
  );
}

/** Filtre provider de la grille de tomes d'une série. */
export function bookCollectionFilter(
  seriesId: string,
  query: CollectionQuery
): BookListFilter {
  return {
    seriesId,
    cursor: String(query.page),
    limit: query.pageSize,
    unreadOnly: query.unreadOnly,
  };
}
