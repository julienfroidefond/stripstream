import type { IMediaProvider } from "@/lib/providers/provider.interface";
import type { NormalizedBook, NormalizedSeries } from "@/lib/providers/types";
import type { HomePrimaryData } from "@/types/home";
import { normalizeSeriesSearch } from "@/lib/services/read-series.service";

/** Les endpoints « en cours » du provider sont bornés à 50 éléments. */
export const IN_PROGRESS_LIMIT = 50;

/** Une série est considérée en pause après trois semaines sans lecture. */
export const PAUSED_AFTER_DAYS = 21;

const DAY_MS = 24 * 60 * 60 * 1000;

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

export type RelativeTimeUnit = "second" | "minute" | "hour" | "day" | "month" | "year";

export interface RelativeTimeParts {
  unit: RelativeTimeUnit;
  value: number;
}

function normalizedKey(value: string): string {
  return normalizeSeriesSearch(value.trim());
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

function seriesIndex(series: NormalizedSeries[]): {
  byId: Map<string, NormalizedSeries>;
  byName: Map<string, NormalizedSeries[]>;
} {
  const byId = new Map<string, NormalizedSeries>();
  const byName = new Map<string, NormalizedSeries[]>();

  for (const item of series) {
    byId.set(item.id, item);
    const key = normalizedKey(item.name);
    const bucket = byName.get(key);
    if (bucket) bucket.push(item);
    else byName.set(key, [item]);
  }

  return { byId, byName };
}

/**
 * Retrouve la série d'un tome. `seriesId` peut être un identifiant ou, pour
 * Stripstream, le nom de la série quand la liste de tomes ne fournit pas
 * `series_id`. La bibliothèque départage les homonymes.
 */
function resolveSeries(
  book: NormalizedBook,
  index: ReturnType<typeof seriesIndex>
): NormalizedSeries | null {
  const target = book.seriesId?.trim();
  if (!target) return null;

  const byId = index.byId.get(target);
  if (byId) return byId;

  const candidates = index.byName.get(normalizedKey(target));
  if (!candidates || candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  const exactLibrary = candidates.find(
    (item) => item.libraryId && book.libraryId && item.libraryId === book.libraryId
  );
  if (exactLibrary) return exactLibrary;

  const unknownLibrary = candidates.find(
    (item) => !item.libraryId || !book.libraryId
  );
  return unknownLibrary ?? candidates[0];
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
 * Avancement du tome en cours, en pourcentage. Retourne `null` quand le tome
 * n'a pas de pagination exploitable (le pourcentage de série prend le relais).
 */
export function getBookProgressPercent(book: NormalizedBook | null): number | null {
  const page = book?.readProgress?.page ?? 0;
  const total = book?.pageCount ?? 0;
  if (page <= 0 || total <= 0) return null;
  return Math.min(100, Math.round((page / total) * 100));
}

/**
 * Fusionne les séries en cours avec les tomes en cours / à suivre.
 *
 * Les séries entièrement lues et les séries sans tome sont écartées : cette
 * page ne doit montrer que ce qui peut encore être repris.
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

  const index = seriesIndex(uniqueSeries);
  const currentBySeries = new Map<string, NormalizedBook>();
  const nextBySeries = new Map<string, NormalizedBook>();

  for (const book of source.ongoingBooks ?? []) {
    const matched = resolveSeries(book, index);
    if (!matched) continue;
    currentBySeries.set(
      matched.id,
      pickMostRecentBook(currentBySeries.get(matched.id) ?? null, book)
    );
  }

  for (const book of source.onDeck ?? []) {
    const matched = resolveSeries(book, index);
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
      progressPercent: Math.min(
        100,
        Math.max(0, Math.round((booksReadCount / bookCount) * 100))
      ),
      lastReadAt:
        item.lastReadAt ?? currentBook?.readProgress?.lastReadAt ?? null,
    });
  }

  return items;
}

/**
 * Charge les séries en cours de la connexion active.
 *
 * Le flux de reprise est un bonus : s'il échoue, la liste des séries reste
 * exploitable (les cartes renvoient alors vers la page de la série). En
 * revanche, l'échec de la liste des séries doit remonter à la page.
 */
export async function getInProgressItems(
  provider: IMediaProvider
): Promise<InProgressItem[]> {
  const [series, continueReading] = await Promise.all([
    provider.getHomeOngoingSeries(IN_PROGRESS_LIMIT),
    provider
      .getHomeContinueReadingData(IN_PROGRESS_LIMIT)
      .catch(() => null),
  ]);

  return sortInProgressItems(
    buildInProgressItems(series, continueReading ?? { ongoingBooks: [], onDeck: [] }),
    DEFAULT_IN_PROGRESS_SORT
  );
}

/** Vrai si la dernière lecture connue remonte à plus de trois semaines. */
export function isPaused(
  item: InProgressItem,
  now: number = Date.now(),
  pausedAfterDays: number = PAUSED_AFTER_DAYS
): boolean {
  const timestamp = parseTimestamp(item.lastReadAt);
  if (timestamp === null) return false;
  return now - timestamp > pausedAfterDays * DAY_MS;
}

export function filterInProgressItems(
  items: InProgressItem[],
  query: string,
  filter: InProgressFilter,
  favoriteIds: Iterable<string>,
  now: number = Date.now()
): InProgressItem[] {
  const normalizedQuery = normalizedKey(query);
  const favorites = new Set(favoriteIds);

  return items.filter((item) => {
    if (filter === "favorites" && !favorites.has(item.series.id)) return false;
    if (filter === "almost-done" && item.remainingBooks > 2) return false;
    if (filter === "paused" && !isPaused(item, now)) return false;
    return (
      !normalizedQuery ||
      normalizedKey(item.series.name).includes(normalizedQuery)
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
  favoriteIds: Iterable<string>,
  now: number = Date.now()
): InProgressStats {
  const favorites = new Set(favoriteIds);
  let remaining = 0;
  let almostDone = 0;
  let paused = 0;
  let favoriteCount = 0;

  for (const item of items) {
    remaining += item.remainingBooks;
    if (item.remainingBooks <= 2) almostDone += 1;
    if (isPaused(item, now)) paused += 1;
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

/**
 * Découpe une date en unité relative, sans dépendre de la locale.
 * Le rendu (`Intl.RelativeTimeFormat`) reste côté client.
 */
export function getRelativeTimeParts(
  value: string | null | undefined,
  now: number
): RelativeTimeParts | null {
  const timestamp = parseTimestamp(value);
  if (timestamp === null) return null;

  const diffSeconds = Math.round((timestamp - now) / 1000);
  const absolute = Math.abs(diffSeconds);

  if (absolute < 60) return { unit: "second", value: diffSeconds };

  const diffMinutes = Math.round(diffSeconds / 60);
  if (Math.abs(diffMinutes) < 60) return { unit: "minute", value: diffMinutes };

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return { unit: "hour", value: diffHours };

  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 30) return { unit: "day", value: diffDays };

  const diffMonths = Math.round(diffDays / 30);
  if (Math.abs(diffMonths) < 12) return { unit: "month", value: diffMonths };

  return { unit: "year", value: Math.round(diffMonths / 12) };
}
