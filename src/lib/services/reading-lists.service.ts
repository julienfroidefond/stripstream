import type { NormalizedReadingList, NormalizedSeries } from "@/lib/providers/types";

export type ReadingListSort = "updated" | "created" | "name" | "progress";
export type ReadingListStatus = "unread" | "reading" | "read";

export const DEFAULT_READING_LIST_SORT: ReadingListSort = "updated";

export interface ReadingListTotals {
  bookCount: number;
  booksReadCount: number;
}

/**
 * Statut de lecture d'une liste, à partir de ses totaux de livres.
 * Utilisé à la fois par la page listes et par le détail, pour que les deux
 * surfaces ne puissent pas diverger.
 */
export function getReadingListStatus({
  bookCount,
  booksReadCount,
}: ReadingListTotals): ReadingListStatus {
  if (bookCount > 0 && booksReadCount >= bookCount) return "read";
  if (booksReadCount > 0) return "reading";
  return "unread";
}

/** Additionne les livres et les livres lus des séries d'une liste. */
export function getReadingListTotals(
  items: ReadonlyArray<Pick<NormalizedSeries, "bookCount" | "booksReadCount">>
): ReadingListTotals {
  return items.reduce(
    (totals, item) => ({
      bookCount: totals.bookCount + item.bookCount,
      booksReadCount: totals.booksReadCount + item.booksReadCount,
    }),
    { bookCount: 0, booksReadCount: 0 }
  );
}

function compareListNames(a: NormalizedReadingList, b: NormalizedReadingList): number {
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}

function timestamp(value: string): number {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function progressRatio(list: NormalizedReadingList): number {
  if (list.bookCount <= 0) return 0;
  return list.booksReadCount / list.bookCount;
}

/**
 * Tri de la page « Listes de lecture ».
 * `progress` remonte les listes les moins avancées d'abord pour faciliter la reprise.
 */
export function sortReadingLists(
  lists: NormalizedReadingList[],
  sort: ReadingListSort = DEFAULT_READING_LIST_SORT
): NormalizedReadingList[] {
  return [...lists].sort((a, b) => {
    switch (sort) {
      case "name":
        return compareListNames(a, b);
      case "created":
        return timestamp(b.createdAt) - timestamp(a.createdAt) || compareListNames(a, b);
      case "progress":
        return progressRatio(a) - progressRatio(b) || compareListNames(a, b);
      case "updated":
      default:
        return timestamp(b.updatedAt) - timestamp(a.updatedAt) || compareListNames(a, b);
    }
  });
}
