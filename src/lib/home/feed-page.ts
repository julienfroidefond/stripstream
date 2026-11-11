/** Une page d'un flux de l'accueil. */
export interface FeedPage<T> {
  items: T[];
  hasMore: boolean;
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
