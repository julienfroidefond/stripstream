/**
 * The reader's prefetch plan: which pages to fetch for a reader position, in
 * which order and with which concurrency.
 *
 * It is pure so `useImageLoader` keeps only the execution (fetch, retry,
 * abort) and the blob lifetime (ADR 0011). The loader reports what it already
 * knows about each key through `statusOf`; the plan never schedules a key
 * that is loaded, in flight or has already failed. Visible pages are the one
 * exception: they are always requested, because the loader deduplicates them
 * and a visible page is what the reader is waiting for.
 */

export type PrefetchKey = number | string;

export type PrefetchStatus = "idle" | "pending" | "loaded" | "failed";

/** Concurrency of the upcoming-page queue in single-page mode. */
export const PREFETCH_CONCURRENCY = 4;
/** A spread fetches two images per step, so the queue runs narrower. */
export const SPREAD_PREFETCH_CONCURRENCY = 2;

export interface PrefetchPlanInput {
  currentPage: number;
  totalPages: number;
  /** Whether the current position renders a spread (`shouldShowDoublePage`). */
  isSpread: boolean;
  /** Upcoming pages to keep warm, the user's `readerPrefetchCount`. */
  prefetchCount: number;
  hasNextBook: boolean;
  /**
   * Page count of the next book. The next-book window never asks for a page
   * past it: a short next book would answer those requests with 404s.
   */
  nextBookPageCount?: number;
  statusOf: (key: PrefetchKey) => PrefetchStatus;
}

export interface PrefetchPlan {
  /** Pages on screen, fetched first and unconditionally. */
  visible: number[];
  /** Upcoming pages of the current book, in reading order. */
  ahead: number[];
  aheadConcurrency: number;
  /** First pages of the next book, keyed through `nextBookKey`. */
  nextBook: { key: string; page: number }[];
  nextBookConcurrency: number;
}

/** Key of a next-book page: prefixed so it never collides with the current book. */
export function nextBookKey(page: number): string {
  return `next-${page}`;
}

export function planPrefetch(input: PrefetchPlanInput): PrefetchPlan {
  const { currentPage, totalPages, isSpread, prefetchCount, hasNextBook, nextBookPageCount, statusOf } =
    input;
  const visible = isSpread ? [currentPage, currentPage + 1] : [currentPage];
  const visibleSet = new Set(visible);

  // In a spread the window reaches one page further, so the last spread of
  // the window arrives with both of its pages.
  const windowEnd = Math.min(totalPages, currentPage + prefetchCount - 1 + (isSpread ? 1 : 0));
  const ahead: number[] = [];
  for (let page = currentPage; page <= windowEnd; page++) {
    if (visibleSet.has(page)) continue;
    if (statusOf(page) === "idle") ahead.push(page);
  }

  const nextBook: PrefetchPlan["nextBook"] = [];
  const pagesFromEnd = totalPages - currentPage;
  if (hasNextBook && pagesFromEnd <= prefetchCount) {
    const nextBookEnd =
      nextBookPageCount === undefined ? prefetchCount : Math.min(prefetchCount, nextBookPageCount);
    for (let page = 1; page <= nextBookEnd; page++) {
      const key = nextBookKey(page);
      // A failed next-book page stays failed: retrying it on every page turn
      // would hammer a broken endpoint the reader is not even showing.
      if (statusOf(key) === "idle") nextBook.push({ key, page });
    }
  }

  return {
    visible,
    ahead,
    aheadConcurrency: isSpread ? SPREAD_PREFETCH_CONCURRENCY : PREFETCH_CONCURRENCY,
    nextBook,
    nextBookConcurrency: PREFETCH_CONCURRENCY,
  };
}
