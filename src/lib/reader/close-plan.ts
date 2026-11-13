/**
 * Where the reader goes when it closes.
 *
 * Closing goes back in history when the reader was reached from inside the
 * app. Opened in a new tab, from a shared link or as the PWA start URL there
 * is nothing to go back to, and `router.back()` would leave the reader stuck
 * on its closing screen: the close then replaces the page with the book's
 * series (or home). "Back to series" always lands on the series.
 */

export type ReaderCloseIntent = "close" | "series";

export type ReaderClosePlan = { kind: "back" } | { kind: "replace"; href: string };

export interface HistoryProbe {
  /**
   * `navigation.currentEntry.index` when the Navigation API exists: it only
   * counts same-origin entries of this tab, so `> 0` means an in-app page
   * precedes the reader. `null` when the API is unavailable.
   */
  navigationIndex: number | null;
  /** `history.length`, the fallback when the Navigation API is missing. */
  historyLength: number;
}

export function hasInAppHistory(probe: HistoryProbe): boolean {
  if (probe.navigationIndex !== null) return probe.navigationIndex > 0;
  return probe.historyLength > 1;
}

export function readerExitHref(seriesId: string | null | undefined): string {
  return seriesId ? `/series/${encodeURIComponent(seriesId)}` : "/";
}

export function planReaderClose(
  intent: ReaderCloseIntent,
  probe: HistoryProbe,
  seriesId: string | null | undefined
): ReaderClosePlan {
  if (intent === "series" && seriesId) {
    return { kind: "replace", href: readerExitHref(seriesId) };
  }
  if (hasInAppHistory(probe)) return { kind: "back" };
  return { kind: "replace", href: readerExitHref(seriesId) };
}

interface NavigationLike {
  currentEntry?: { index?: number } | null;
}

/** Reads the history probe from a browser window. */
export function readHistoryProbe(win: Window): HistoryProbe {
  const navigation = (win as Window & { navigation?: NavigationLike }).navigation;
  const index = navigation?.currentEntry?.index;
  return {
    navigationIndex: typeof index === "number" && index >= 0 ? index : null,
    historyLength: win.history.length,
  };
}
