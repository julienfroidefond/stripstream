/**
 * Where an installed PWA lands when it comes back while the reader is open.
 *
 * iPadOS can suspend a standalone PWA for a long time and then resume its
 * in-memory snapshot or evict it and reload the reader from the server. In both
 * cases the reader is rebuilt with transient state the app does not control
 * (a stale history stack, an unhydrated close button, images being re-fetched).
 * The reader therefore sends the user home when the absence was long enough.
 * The reading progress is flushed when the app goes hidden, so leaving loses
 * nothing; a short app switch keeps the reader in place.
 *
 * The "hidden at" timestamp lives in `sessionStorage`: the document iOS evicts
 * writes it on `visibilitychange`/`pagehide`, and the reloaded document reads it
 * back. It is cleared as soon as the user stays, leaves normally, or lands
 * anywhere outside the reader.
 */

/** How long the reader may stay hidden before the app returns to home. */
export const READER_RESUME_HOME_AFTER_MS = 10 * 60 * 1000;

/** Per-tab timestamp of the last time the reader went hidden. */
export const READER_HIDDEN_AT_STORAGE_KEY = "stripstream:reader-hidden-at";

export type ReaderResumeDecision = "stay" | "home";

export interface ReaderResumeClock {
  /** When the reader last went hidden, or `null` when it never did. */
  hiddenAt: number | null;
  /** Current time, injected so the policy stays pure. */
  now: number;
}

export function planReaderResume({ hiddenAt, now }: ReaderResumeClock): ReaderResumeDecision {
  if (hiddenAt === null || !Number.isFinite(hiddenAt)) return "stay";
  return now - hiddenAt >= READER_RESUME_HOME_AFTER_MS ? "home" : "stay";
}

/** The subset of `sessionStorage` the resume policy needs. */
export type ReaderResumeStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** The current tab's session storage, or `null` when the browser blocks it. */
export function readerSessionStorage(): ReaderResumeStorage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function readReaderHiddenAt(storage: ReaderResumeStorage | null): number | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(READER_HIDDEN_AT_STORAGE_KEY);
    if (!raw) return null;
    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

export function writeReaderHiddenAt(storage: ReaderResumeStorage | null, now: number): void {
  if (!storage) return;
  try {
    storage.setItem(READER_HIDDEN_AT_STORAGE_KEY, String(now));
  } catch {
    // A full or blocked storage only loses the cross-reload check; the
    // in-memory timestamp still covers a resume without a page reload.
  }
}

export function clearReaderHiddenAt(storage: ReaderResumeStorage | null): void {
  if (!storage) return;
  try {
    storage.removeItem(READER_HIDDEN_AT_STORAGE_KEY);
  } catch {
    // Nothing to clear when the browser blocks storage.
  }
}
