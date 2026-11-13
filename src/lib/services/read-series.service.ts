import type { RatingsCapability } from "@/lib/providers/provider.interface";
import type { NormalizedSeries } from "@/lib/providers/types";

/**
 * Taille de page maximale acceptée par l'API (voir `list_all_series`).
 * On borne volontairement le nombre de pages : la page « Mes notes » est une
 * vue de confort, elle ne doit pas déclencher un nombre illimité de requêtes
 * pour une bibliothèque exceptionnellement fournie.
 */
const PAGE_SIZE = 200;
const MAX_PAGES = 5;

/**
 * Récupère toutes les séries lues de la connexion active.
 *
 * La source est la capacité `ratings` : la liste appartient à la notation, pas
 * au contrat commun. Le provider renvoie une page ; on enchaîne les suivantes
 * pour que la page puisse afficher l'ensemble des séries notables et non
 * seulement les 200 premières.
 */
export async function getReadSeries(ratings: RatingsCapability): Promise<NormalizedSeries[]> {
  const firstPage = await ratings.getReadSeries(1, PAGE_SIZE);
  if (!firstPage.nextCursor) return firstPage.items;

  const totalPages = Math.min(firstPage.totalPages ?? 1, MAX_PAGES);
  const remainingPages = await Promise.all(
    Array.from({ length: Math.max(0, totalPages - 1) }, (_, index) =>
      ratings.getReadSeries(index + 2, PAGE_SIZE)
    )
  );

  const seen = new Set<string>();
  return [firstPage, ...remainingPages]
    .flatMap((page) => page.items)
    .filter((series) => {
      if (seen.has(series.id)) return false;
      seen.add(series.id);
      return true;
    });
}

export type ReadSeriesFilter = "all" | "unrated" | "rated";

export interface ReadSeriesCounts {
  total: number;
  unrated: number;
  rated: number;
}

export interface ReadSeriesSlice {
  items: NormalizedSeries[];
  page: number;
  totalPages: number;
}

/** Normalise un titre pour une recherche insensible à la casse et aux accents. */
export function normalizeSeriesSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function filterReadSeries(
  series: NormalizedSeries[],
  query: string,
  filter: ReadSeriesFilter
): NormalizedSeries[] {
  const normalizedQuery = normalizeSeriesSearch(query.trim());

  return series.filter((item) => {
    const isRated = item.userRating != null;
    if (filter === "unrated" && isRated) return false;
    if (filter === "rated" && !isRated) return false;
    return !normalizedQuery || normalizeSeriesSearch(item.name).includes(normalizedQuery);
  });
}

export type ReadSeriesSort =
  | "to-rate"
  | "recent"
  | "title"
  | "rating-desc"
  | "rating-asc";

export const DEFAULT_READ_SERIES_SORT: ReadSeriesSort = "to-rate";

export function parseReadSeriesSort(value: string | undefined): ReadSeriesSort {
  return value === "recent" ||
    value === "title" ||
    value === "rating-desc" ||
    value === "rating-asc"
    ? value
    : DEFAULT_READ_SERIES_SORT;
}

function compareSeriesTitles(a: NormalizedSeries, b: NormalizedSeries): number {
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}

/** Timestamp de dernière lecture, ou `null` si la donnée manque ou est invalide. */
function lastReadTimestamp(series: NormalizedSeries): number | null {
  if (!series.lastReadAt) return null;
  const timestamp = Date.parse(series.lastReadAt);
  return Number.isNaN(timestamp) ? null : timestamp;
}

/**
 * Tri de la page « Mes notes ».
 * - `to-rate` (défaut) : les séries à noter d'abord, puis les mieux notées, puis par titre.
 * - `recent` : dernières lectures d'abord, séries sans date en dernier.
 * - `rating-desc` / `rating-asc` : séries notées d'abord, puis les non notées, par titre.
 * - `title` : ordre alphabétique.
 */
export function sortReadSeries(
  series: NormalizedSeries[],
  sort: ReadSeriesSort = DEFAULT_READ_SERIES_SORT
): NormalizedSeries[] {
  const items = [...series];

  if (sort === "title") {
    return items.sort(compareSeriesTitles);
  }

  if (sort === "recent") {
    return items.sort((a, b) => {
      const aTime = lastReadTimestamp(a);
      const bTime = lastReadTimestamp(b);

      if (aTime === null || bTime === null) {
        if (aTime === bTime) return compareSeriesTitles(a, b);
        return aTime === null ? 1 : -1;
      }
      if (aTime !== bTime) return bTime - aTime;
      return compareSeriesTitles(a, b);
    });
  }

  return items.sort((a, b) => {
    const ratingA = a.userRating ?? null;
    const ratingB = b.userRating ?? null;

    if (sort === "to-rate") {
      if (ratingA === null && ratingB !== null) return -1;
      if (ratingA !== null && ratingB === null) return 1;
      if (ratingA !== null && ratingB !== null && ratingA !== ratingB) {
        return ratingB - ratingA;
      }
      return compareSeriesTitles(a, b);
    }

    // Tri explicite par note : les séries non notées passent en dernier.
    if (ratingA === null || ratingB === null) {
      if (ratingA === ratingB) return compareSeriesTitles(a, b);
      return ratingA === null ? 1 : -1;
    }
    if (ratingA !== ratingB) {
      return sort === "rating-desc" ? ratingB - ratingA : ratingA - ratingB;
    }
    return compareSeriesTitles(a, b);
  });
}

export function countReadSeries(series: NormalizedSeries[]): ReadSeriesCounts {
  let unrated = 0;
  for (const item of series) {
    if (item.userRating == null) unrated += 1;
  }
  return { total: series.length, unrated, rated: series.length - unrated };
}

export function paginateReadSeries(
  series: NormalizedSeries[],
  page: number,
  pageSize: number
): ReadSeriesSlice {
  const totalPages = Math.max(1, Math.ceil(series.length / Math.max(1, pageSize)));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    items: series.slice(start, start + pageSize),
    page: safePage,
    totalPages,
  };
}
