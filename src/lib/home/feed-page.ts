import type {
  NormalizedBook,
  NormalizedReadingList,
  NormalizedSeries,
} from "@/lib/providers/types";

/** Les flux de l'accueil qui alimentent une rangée paginée. */
export type HomeFeed =
  | "ongoing"
  | "favorites"
  | "reading-lists"
  | "latest-series"
  | "recently-read"
  | "recommendations";

/** Type d'élément rendu par chaque flux. */
export interface HomeFeedItems {
  ongoing: NormalizedSeries;
  favorites: NormalizedSeries;
  "reading-lists": NormalizedReadingList;
  "latest-series": NormalizedSeries;
  "recently-read": NormalizedBook;
  recommendations: NormalizedSeries;
}

/** Type d'élément rendu par un flux, ou union de tous les flux par défaut. */
export type HomeFeedItem<F extends HomeFeed = HomeFeed> = HomeFeedItems[F];

/** Une page d'un flux de l'accueil. */
export interface FeedPage<T> {
  items: T[];
  hasMore: boolean;
}

/** Une page typée par le flux qui l'a produite. */
export type HomeFeedPage<F extends HomeFeed = HomeFeed> = FeedPage<
  HomeFeedItems[F]
>;

/** Page vide, utilisée quand aucun provider n'est disponible. */
export function emptyFeedPage<T>(): FeedPage<T> {
  return { items: [], hasMore: false };
}

/**
 * Limite de requête d'une page qui sonde le reste de la collection.
 *
 * Les flux bornés par le provider demandent `offset + pageSize + 1` éléments :
 * l'élément supplémentaire prouve qu'il reste une page, sans requête de
 * comptage. C'est la règle partagée par le registre et le hero de reprise.
 */
export function probeLimit(offset: number, pageSize: number): number {
  return Math.max(0, offset) + pageSize + 1;
}

/**
 * Extrait la page qui commence à `offset`.
 *
 * Les flux de l'accueil sont chargés avec un élément de sonde
 * (`offset + pageSize + 1`) : `hasMore` est connu sans requête de comptage et
 * la sonde n'est jamais renvoyée dans la page.
 */
export function paginateFeed<T>(
  items: readonly T[],
  offset: number,
  pageSize: number
): FeedPage<T> {
  const start = Math.max(0, offset);
  const end = start + pageSize;

  return {
    items: items.slice(start, end),
    hasMore: items.length > end,
  };
}
