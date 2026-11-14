import type { NormalizedSeries } from "@/lib/providers/types";

/** État de lecture résolu d'une série, indépendant de son affichage. */
export type SeriesReadingStatus = "no-books" | "read" | "in-progress" | "unread";

export interface SeriesReadingState {
  status: SeriesReadingStatus;
  /** Tomes lus, borné au nombre de tomes disponibles. */
  read: number;
  total: number;
  /** Progression normalisée entre 0 et 1. */
  progress: number;
  /** Progression arrondie entre 0 et 100, pour les jauges. */
  percent: number;
}

type ReadingCounts = Pick<NormalizedSeries, "bookCount" | "booksReadCount">;

function normalizeCount(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.floor(value);
}

/**
 * Seule règle de statut de lecture d'une série.
 *
 * - `0/0` est « pas de tomes », jamais « lu » ;
 * - une série sur-lue (`booksReadCount > bookCount`) est « lu », avec une
 *   progression bornée à 100 % ;
 * - une série sans tome lu est « non lu ».
 */
export function getSeriesReadingState(series: ReadingCounts): SeriesReadingState {
  const total = normalizeCount(series.bookCount);
  if (total === 0) {
    return { status: "no-books", read: 0, total: 0, progress: 0, percent: 0 };
  }

  const read = Math.min(normalizeCount(series.booksReadCount), total);
  if (read >= total) {
    return { status: "read", read: total, total, progress: 1, percent: 100 };
  }

  if (read > 0) {
    const progress = read / total;
    return {
      status: "in-progress",
      read,
      total,
      progress,
      percent: Math.round(progress * 100),
    };
  }

  return { status: "unread", read: 0, total, progress: 0, percent: 0 };
}

export function isSeriesRead(series: ReadingCounts): boolean {
  return getSeriesReadingState(series).status === "read";
}
