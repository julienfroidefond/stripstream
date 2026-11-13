export const READ_PROGRESS_DEBOUNCE_MS = 500;

export interface ReadProgressTarget {
  bookId: string;
  seriesId: string | null;
  totalPages: number;
}

export interface ReadProgressUpdate extends ReadProgressTarget {
  page: number;
  completed: boolean;
}

export type PersistReadProgress = (update: ReadProgressUpdate) => void | Promise<void>;

export interface ReadProgressScheduler {
  schedule: (callback: () => void, delayMs: number) => unknown;
  cancel: (handle: unknown) => void;
}

export interface ReadProgressSessionOptions extends ReadProgressTarget {
  initialPage: number;
  anonymous: boolean;
  persist: PersistReadProgress;
  debounceMs?: number;
  scheduler?: ReadProgressScheduler;
}

interface PendingWrite extends ReadProgressTarget {
  page: number;
}

interface WrittenPage {
  bookId: string;
  page: number;
}

const defaultScheduler: ReadProgressScheduler = {
  schedule: (callback, delayMs) => setTimeout(callback, delayMs),
  cancel: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

/**
 * Owns the reader's progress-write policy: the last trackable page, the
 * debounce, the immediate last-page completion and the final flush.
 *
 * Navigation only calls `track(page)`; persistence is injected, so the write
 * sequence can be unit-tested without React or a server action. Writes are
 * serialized: a page reached while another write is in flight waits for it,
 * which keeps the provider's last received progress equal to the last page seen.
 */
export class ReadProgressSession {
  private target: ReadProgressTarget;
  private readonly persist: PersistReadProgress;
  private readonly debounceMs: number;
  private readonly scheduler: ReadProgressScheduler;

  private anonymous: boolean;
  private cursor: number | null;
  private pending: PendingWrite | null;
  private pendingReady = true;
  private timer: unknown = null;
  private inFlight: WrittenPage | null = null;
  private lastImmediate: WrittenPage | null = null;
  private lastFlushed: WrittenPage | null = null;

  constructor(options: ReadProgressSessionOptions) {
    this.target = {
      bookId: options.bookId,
      seriesId: options.seriesId,
      totalPages: options.totalPages,
    };
    this.persist = options.persist;
    this.debounceMs = options.debounceMs ?? READ_PROGRESS_DEBOUNCE_MS;
    this.scheduler = options.scheduler ?? defaultScheduler;
    this.anonymous = options.anonymous;
    this.cursor = options.anonymous ? null : options.initialPage;
    this.pending = this.cursor === null ? null : this.snapshot(this.cursor);
  }

  /** Updates the book the next write belongs to without touching pending work. */
  updateTarget(target: ReadProgressTarget): void {
    this.target = target;
  }

  /**
   * Anonymous mode disables both pending and future writes for this session.
   * Leaving anonymous mode does not resurrect the previous cursor: the next
   * navigation starts tracking again, matching the previous reader behaviour.
   */
  setAnonymous(anonymous: boolean): void {
    if (this.anonymous === anonymous) return;
    this.anonymous = anonymous;
    if (!anonymous) return;

    this.cancelTimer();
    this.cursor = null;
    this.pending = null;
    this.lastFlushed = null;
  }

  /** Records a page reached by the reader and schedules its write. */
  track(page: number): void {
    if (this.anonymous) return;
    // The book is already recorded as finished on this page: a second
    // "completed" write (e.g. "next" on the final spread) would be redundant.
    if (this.cursor === page && this.pending === null && this.isImmediateCompletion(page)) {
      return;
    }

    this.cursor = page;
    this.lastFlushed = null;
    this.cancelTimer();
    this.pending = this.snapshot(page);

    if (page === this.target.totalPages) {
      // Reaching the last page completes the book: write now, because a hard
      // navigation (reload, tab close, page.goto) would cancel the debounce.
      this.lastImmediate = { bookId: this.target.bookId, page };
      this.pendingReady = true;
      this.pump();
      return;
    }

    this.pendingReady = false;
    this.timer = this.scheduler.schedule(() => {
      this.timer = null;
      this.pendingReady = true;
      this.pump();
    }, this.debounceMs);
  }

  /** Flushes the latest page, for unmount or an explicit reader close. */
  flush(): void {
    if (this.anonymous || this.cursor === null) return;

    const page = this.cursor;
    if (this.lastFlushed?.bookId === this.target.bookId && this.lastFlushed.page === page) {
      return;
    }

    this.cancelTimer();
    if (this.pending === null) {
      if (this.isImmediateCompletion(page)) {
        this.lastFlushed = { bookId: this.target.bookId, page };
        return;
      }
      this.pending = this.snapshot(page);
    }

    this.lastFlushed = { bookId: this.target.bookId, page };
    this.pendingReady = true;
    this.pump();
  }

  private snapshot(page: number): PendingWrite {
    return {
      bookId: this.target.bookId,
      seriesId: this.target.seriesId,
      totalPages: this.target.totalPages,
      page,
    };
  }

  private cancelTimer(): void {
    if (this.timer === null) return;
    this.scheduler.cancel(this.timer);
    this.timer = null;
  }

  private isImmediateCompletion(page: number): boolean {
    return (
      this.lastImmediate !== null &&
      this.lastImmediate.bookId === this.target.bookId &&
      this.lastImmediate.page === page &&
      page === this.target.totalPages
    );
  }

  private pump(): void {
    if (this.anonymous || this.pending === null || this.inFlight !== null) return;

    const write = this.pending;
    this.pending = null;
    this.pendingReady = false;
    this.inFlight = { bookId: write.bookId, page: write.page };

    const update: ReadProgressUpdate = {
      ...write,
      completed: write.page === write.totalPages,
    };

    let result: void | Promise<void>;
    try {
      result = this.persist(update);
    } catch {
      this.finish(write);
      return;
    }

    void Promise.resolve(result).then(
      () => this.finish(write),
      () => this.finish(write)
    );
  }

  private finish(write: PendingWrite): void {
    if (
      this.inFlight?.bookId === write.bookId &&
      this.inFlight.page === write.page
    ) {
      this.inFlight = null;
    }
    if (this.pending !== null && this.pendingReady) {
      this.pump();
    }
  }
}
