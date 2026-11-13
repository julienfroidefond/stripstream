/**
 * Le contrat de pagination des providers.
 *
 * Toutes les listes paginées du contrat (`getSeries`, `getBooks`,
 * `ratings.getReadSeries`) sont paginées **par numéro de page, à partir de 1**.
 * Aucun backend ne fournit de curseur opaque : Komga pagine en base 0 (son
 * adaptateur convertit), Librarian en base 1. Le contrat ne transporte donc
 * pas de `nextCursor` — un numéro de page déguisé en chaîne était exactement la
 * source du bug de Komga, qui renvoyait la page reçue comme « suivante ».
 *
 * Voir docs/adr/0021-one-pagination-contract.md.
 */

/** Une page de résultats. `page` est 1-based, `totalPages >= 1` même si vide. */
export interface Page<T> {
  items: T[];
  /** Numéro de la page renvoyée, à partir de 1. */
  page: number;
  /** Nombre total de pages pour la taille de page demandée (au moins 1). */
  totalPages: number;
  /** Nombre total d'éléments, toutes pages confondues. */
  totalElements: number;
}

/** Nombre de pages pour `totalElements` éléments par pages de `pageSize` (au moins 1). */
export function pageCount(totalElements: number, pageSize: number): number {
  return Math.max(1, Math.ceil(totalElements / Math.max(1, pageSize)));
}

/** Normalise un numéro de page demandé (1-based) : tout ce qui n'est pas un entier ≥ 1 devient 1. */
export function normalizePageNumber(page: number | undefined): number {
  return page !== undefined && Number.isInteger(page) && page >= 1 ? page : 1;
}

export interface IteratePagesOptions {
  /** Nombre maximal de pages lues, garde-fou contre un backend incohérent ou une liste démesurée. */
  max: number;
  /**
   * Nombre de pages demandées en parallèle une fois la première connue
   * (`totalPages` est alors fixé). Par défaut 1 : lecture séquentielle.
   */
  concurrency?: number;
}

/**
 * Parcourt une liste paginée de la page 1 à `min(totalPages, max)` et renvoie
 * les éléments dans l'ordre des pages. C'est le seul itérateur des listes
 * provider : ne réécrivez pas de boucle `while (next)` à côté.
 *
 * `totalPages` est lu sur la première page ; la lecture s'arrête aussi sur la
 * première page vide, pour ne pas tourner à vide si le total annoncé est faux.
 */
export async function iteratePages<T>(
  fetchPage: (page: number) => Promise<Page<T>>,
  { max, concurrency = 1 }: IteratePagesOptions
): Promise<T[]> {
  if (max < 1) return [];

  const first = await fetchPage(1);
  const items = [...first.items];
  if (first.items.length === 0) return items;

  const lastPage = Math.min(first.totalPages, max);
  const batchSize = Math.max(1, concurrency);

  for (let start = 2; start <= lastPage; start += batchSize) {
    const numbers = Array.from(
      { length: Math.min(batchSize, lastPage - start + 1) },
      (_, index) => start + index
    );
    const pages = await Promise.all(numbers.map((page) => fetchPage(page)));
    for (const page of pages) {
      if (page.items.length === 0) return items;
      items.push(...page.items);
    }
  }

  return items;
}
