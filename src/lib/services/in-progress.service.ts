import type { IMediaProvider } from "@/lib/providers/provider.interface";
import type { NormalizedBook, NormalizedSeries } from "@/lib/providers/types";
import type { HomePrimaryData } from "@/types/home";
import { bookSeriesRef, indexSeries, matchSeries, seriesKey } from "@/lib/resume/identity";
import { getSeriesProgressPercent } from "@/lib/resume/resume-state";

/** Les listes « en cours » et « de côté » sont bornées à 50 éléments. */
export const IN_PROGRESS_LIMIT = 50;

export type InProgressSource = Pick<HomePrimaryData, "ongoingBooks" | "onDeck">;

export interface InProgressItem {
  series: NormalizedSeries;
  /** Tome actuellement commencé (progression partielle). */
  currentBook: NormalizedBook | null;
  /** Prochain tome non lu proposé par le provider. */
  nextBook: NormalizedBook | null;
  /** Tome à ouvrir pour reprendre : le tome en cours, sinon le prochain. */
  resumeBook: NormalizedBook | null;
  /** Nombre de tomes encore non lus, borné à zéro. */
  remainingBooks: number;
  /** Avancement de la série, de 0 à 100. */
  progressPercent: number;
  /** Dernière activité connue, série ou tome en cours. */
  lastReadAt: string | null;
}

export type InProgressFilter = "all" | "favorites" | "almost-done" | "paused";

export type InProgressSort = "recent" | "progress" | "remaining" | "title";

export const DEFAULT_IN_PROGRESS_SORT: InProgressSort = "recent";

export interface InProgressStats {
  total: number;
  remaining: number;
  almostDone: number;
  paused: number;
  favorites: number;
}

function parseTimestamp(value: string | null | undefined): number | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : timestamp;
}

function bookTimestamp(book: NormalizedBook): number {
  return parseTimestamp(book.readProgress?.lastReadAt) ?? 0;
}

/**
 * Un tome « on deck » peut déjà avoir été ouvert : Stripstream renvoie le
 * tome en cours dans ce flux, sans le dupliquer dans `ongoingBooks`.
 */
function isBookInProgress(book: NormalizedBook): boolean {
  const progress = book.readProgress;
  if (!progress || progress.completed) return false;
  return progress.page !== null || Boolean(progress.lastReadAt);
}

function pickMostRecentBook(
  current: NormalizedBook | null,
  candidate: NormalizedBook
): NormalizedBook {
  if (!current) return candidate;
  return bookTimestamp(candidate) > bookTimestamp(current) ? candidate : current;
}

function sortTitle(a: InProgressItem, b: InProgressItem): number {
  return a.series.name.localeCompare(b.series.name, undefined, { sensitivity: "base" });
}

/**
 * Fusionne les séries en cours avec les tomes en cours / à suivre.
 *
 * Les séries entièrement lues et les séries sans tome sont écartées. Les
 * séries mises de côté sont conservées : elles restent visibles dans le
 * filtre « En pause » et peuvent être reprises depuis la page.
 */
export function buildInProgressItems(
  series: NormalizedSeries[],
  source: InProgressSource
): InProgressItem[] {
  const uniqueSeries: NormalizedSeries[] = [];
  const seenSeries = new Set<string>();
  for (const item of series) {
    if (seenSeries.has(item.id)) continue;
    seenSeries.add(item.id);
    uniqueSeries.push(item);
  }

  const index = indexSeries(uniqueSeries);
  const currentBySeries = new Map<string, NormalizedBook>();
  const nextBySeries = new Map<string, NormalizedBook>();

  for (const book of source.ongoingBooks ?? []) {
    const matched = matchSeries(bookSeriesRef(book), book.libraryId, index);
    if (!matched) continue;
    currentBySeries.set(
      matched.id,
      pickMostRecentBook(currentBySeries.get(matched.id) ?? null, book)
    );
  }

  for (const book of source.onDeck ?? []) {
    const matched = matchSeries(bookSeriesRef(book), book.libraryId, index);
    if (!matched) continue;
    if (isBookInProgress(book)) {
      currentBySeries.set(
        matched.id,
        pickMostRecentBook(currentBySeries.get(matched.id) ?? null, book)
      );
      continue;
    }
    if (!nextBySeries.has(matched.id)) nextBySeries.set(matched.id, book);
  }

  const items: InProgressItem[] = [];
  for (const item of uniqueSeries) {
    const bookCount = Math.max(0, item.bookCount);
    const booksReadCount = Math.max(0, item.booksReadCount);
    if (bookCount <= 0 || booksReadCount >= bookCount) continue;

    const currentBook = currentBySeries.get(item.id) ?? null;
    const nextBook = nextBySeries.get(item.id) ?? null;
    const remainingBooks = Math.max(0, bookCount - booksReadCount);

    items.push({
      series: item,
      currentBook,
      nextBook,
      resumeBook: currentBook ?? nextBook,
      remainingBooks,
      progressPercent: getSeriesProgressPercent(item),
      lastReadAt:
        item.lastReadAt ?? currentBook?.readProgress?.lastReadAt ?? null,
    });
  }

  return items;
}

/**
 * Charge les séries en cours de la connexion active.
 *
 * Le flux de reprise et les séries mises de côté sont des bonus : s'ils
 * échouent, la liste des séries reste exploitable (les cartes renvoient alors
 * vers la page de la série). En revanche, l'échec de la liste des séries doit
 * remonter à la page.
 */
export async function getInProgressItems(
  provider: IMediaProvider
): Promise<InProgressItem[]> {
  const [series, shelvedSeries, continueReading] = await Promise.all([
    provider.getHomeOngoingSeries(IN_PROGRESS_LIMIT),
    provider.getShelvedSeries(IN_PROGRESS_LIMIT).catch(() => []),
    provider
      .getHomeContinueReadingData(IN_PROGRESS_LIMIT)
      .catch(() => null),
  ]);

  return sortInProgressItems(
    buildInProgressItems(
      [...series, ...shelvedSeries],
      continueReading ?? { ongoingBooks: [], onDeck: [] }
    ),
    DEFAULT_IN_PROGRESS_SORT
  );
}

/** Vrai si la série a été mise de côté par le lecteur courant. */
export function isPaused(item: InProgressItem): boolean {
  return item.series.shelvedAt != null;
}

export function filterInProgressItems(
  items: InProgressItem[],
  query: string,
  filter: InProgressFilter,
  favoriteIds: Iterable<string>
): InProgressItem[] {
  const normalizedQuery = seriesKey(query);
  const favorites = new Set(favoriteIds);

  return items.filter((item) => {
    if (filter === "favorites" && !favorites.has(item.series.id)) return false;
    if (filter === "almost-done" && item.remainingBooks > 2) return false;
    if (filter === "paused" && !isPaused(item)) return false;
    return (
      !normalizedQuery ||
      seriesKey(item.series.name).includes(normalizedQuery)
    );
  });
}

export function sortInProgressItems(
  items: InProgressItem[],
  sort: InProgressSort = DEFAULT_IN_PROGRESS_SORT
): InProgressItem[] {
  const sorted = [...items];

  if (sort === "title") return sorted.sort(sortTitle);

  if (sort === "progress") {
    return sorted.sort((a, b) => {
      if (a.progressPercent !== b.progressPercent) {
        return b.progressPercent - a.progressPercent;
      }
      return sortTitle(a, b);
    });
  }

  if (sort === "remaining") {
    return sorted.sort((a, b) => {
      if (a.remainingBooks !== b.remainingBooks) {
        return a.remainingBooks - b.remainingBooks;
      }
      return sortTitle(a, b);
    });
  }

  return sorted.sort((a, b) => {
    const aTime = parseTimestamp(a.lastReadAt);
    const bTime = parseTimestamp(b.lastReadAt);

    if (aTime === null || bTime === null) {
      if (aTime === bTime) return sortTitle(a, b);
      return aTime === null ? 1 : -1;
    }
    if (aTime !== bTime) return bTime - aTime;
    return sortTitle(a, b);
  });
}

export function getInProgressStats(
  items: InProgressItem[],
  favoriteIds: Iterable<string>
): InProgressStats {
  const favorites = new Set(favoriteIds);
  let remaining = 0;
  let almostDone = 0;
  let paused = 0;
  let favoriteCount = 0;

  for (const item of items) {
    remaining += item.remainingBooks;
    if (item.remainingBooks <= 2) almostDone += 1;
    if (isPaused(item)) paused += 1;
    if (favorites.has(item.series.id)) favoriteCount += 1;
  }

  return {
    total: items.length,
    remaining,
    almostDone,
    paused,
    favorites: favoriteCount,
  };
}
