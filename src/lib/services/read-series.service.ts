import type { IMediaProvider } from "@/lib/providers/provider.interface";
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
 * Le provider renvoie une page ; on enchaîne les suivantes pour que la page
 * puisse afficher l'ensemble des séries notables et non seulement les 200
 * premières.
 */
export async function getReadSeries(provider: IMediaProvider): Promise<NormalizedSeries[]> {
  const firstPage = await provider.getReadSeries(1, PAGE_SIZE);
  if (!firstPage.nextCursor) return firstPage.items;

  const totalPages = Math.min(firstPage.totalPages ?? 1, MAX_PAGES);
  const remainingPages = await Promise.all(
    Array.from({ length: Math.max(0, totalPages - 1) }, (_, index) =>
      provider.getReadSeries(index + 2, PAGE_SIZE)
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

/** Les séries à noter d'abord, puis les mieux notées, puis par titre. */
export function sortReadSeries(series: NormalizedSeries[]): NormalizedSeries[] {
  return [...series].sort((a, b) => {
    const ratingA = a.userRating ?? null;
    const ratingB = b.userRating ?? null;

    if (ratingA === null && ratingB !== null) return -1;
    if (ratingA !== null && ratingB === null) return 1;
    if (ratingA !== null && ratingB !== null && ratingA !== ratingB) {
      return ratingB - ratingA;
    }
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
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
