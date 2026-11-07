import type { StripstreamReadingList } from "@/types/stripstream";

export type ReadingListSort = "updated" | "created" | "name" | "progress";

export const DEFAULT_READING_LIST_SORT: ReadingListSort = "updated";

function compareListNames(a: StripstreamReadingList, b: StripstreamReadingList): number {
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}

function timestamp(value: string): number {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function progressRatio(list: StripstreamReadingList): number {
  if (list.book_count <= 0) return 0;
  return list.books_read_count / list.book_count;
}

/**
 * Tri de la page « Listes de lecture ».
 * `progress` remonte les listes les moins avancées d'abord pour faciliter la reprise.
 */
export function sortReadingLists(
  lists: StripstreamReadingList[],
  sort: ReadingListSort = DEFAULT_READING_LIST_SORT
): StripstreamReadingList[] {
  return [...lists].sort((a, b) => {
    switch (sort) {
      case "name":
        return compareListNames(a, b);
      case "created":
        return timestamp(b.created_at) - timestamp(a.created_at) || compareListNames(a, b);
      case "progress":
        return progressRatio(a) - progressRatio(b) || compareListNames(a, b);
      case "updated":
      default:
        return timestamp(b.updated_at) - timestamp(a.updated_at) || compareListNames(a, b);
    }
  });
}
