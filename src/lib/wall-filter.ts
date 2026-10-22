import type { WallItem } from "@/types/wall";

/**
 * Le Wall — filtres côté client.
 *
 * Le mur est déjà chargé en entier : filtrer ne demande aucun aller-retour
 * serveur. Une série est « terminée » quand elle compte au moins un tome et
 * que tous ses tomes sont lus, exactement comme les badges de la bibliothèque.
 */
export function isWallItemComplete(
  item: Pick<WallItem, "bookCount" | "booksReadCount">
): boolean {
  const booksRead = Number.isFinite(item.booksReadCount) ? item.booksReadCount : 0;
  return item.bookCount > 0 && booksRead >= item.bookCount;
}

export function filterWallItems(
  items: readonly WallItem[],
  selectedLibraries: ReadonlySet<string>,
  hideRead: boolean
): WallItem[] {
  return items.filter((item) => {
    if (selectedLibraries.size > 0 && !selectedLibraries.has(item.libraryName)) {
      return false;
    }
    if (hideRead && isWallItemComplete(item)) return false;
    return true;
  });
}

/** La préférence est stockée en clair : seule la valeur exacte « true » l'active. */
export function parseStoredHideRead(value: string | null): boolean {
  return value === "true";
}

/**
 * Relit la sélection de bibliothèques sans faire tomber le mur : une valeur
 * absente, corrompue ou devenue obsolète (bibliothèque supprimée) est ignorée.
 */
export function parseStoredWallLibraries(
  value: string | null,
  availableLibraries: ReadonlySet<string>
): string[] {
  if (!value) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const restored = parsed.filter(
    (name): name is string =>
      typeof name === "string" && availableLibraries.has(name)
  );
  return [...new Set(restored)];
}
