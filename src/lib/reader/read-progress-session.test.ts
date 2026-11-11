import { describe, expect, it, vi } from "vitest";

import {
  READ_PROGRESS_DEBOUNCE_MS,
  ReadProgressSession,
  type PersistReadProgress,
  type ReadProgressScheduler,
  type ReadProgressSessionOptions,
} from "./read-progress-session";

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function createSession(overrides: Partial<ReadProgressSessionOptions> = {}) {
  let nextTimerId = 1;
  const timers = new Map<number, () => void>();

  const scheduler: ReadProgressScheduler = {
    schedule: vi.fn((callback: () => void) => {
      const id = nextTimerId++;
      timers.set(id, callback);
      return id;
    }),
    cancel: vi.fn((handle: unknown) => {
      timers.delete(handle as number);
    }),
  };

  const persist = vi.fn<PersistReadProgress>(async () => undefined);

  const session = new ReadProgressSession({
    bookId: "book-1",
    seriesId: "series-1",
    totalPages: 10,
    initialPage: 1,
    anonymous: false,
    persist,
    scheduler,
    ...overrides,
  });

  return {
    session,
    persist,
    scheduler,
    timers,
    runTimers: () => {
      const due = [...timers.values()];
      timers.clear();
      for (const callback of due) callback();
    },
  };
}

async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe("ReadProgressSession", () => {
  it("primes the initial page without scheduling or writing it", () => {
    const { persist, scheduler } = createSession();

    expect(persist).not.toHaveBeenCalled();
    expect(scheduler.schedule).not.toHaveBeenCalled();
  });

  it("writes the primed page once on flush", async () => {
    const { session, persist } = createSession();

    session.flush();
    expect(persist).toHaveBeenCalledTimes(1);
    expect(persist).toHaveBeenCalledWith({
      bookId: "book-1",
      seriesId: "series-1",
      totalPages: 10,
      page: 1,
      completed: false,
    });

    await settle();
    session.flush();
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it("debounces navigation and writes only the latest page", () => {
    const { session, persist, scheduler, runTimers } = createSession();

    session.track(2);
    session.track(3);

    expect(persist).not.toHaveBeenCalled();
    expect(scheduler.schedule).toHaveBeenCalledTimes(2);
    expect(scheduler.cancel).toHaveBeenCalledTimes(1);
    expect(scheduler.schedule).toHaveBeenLastCalledWith(
      expect.any(Function),
      READ_PROGRESS_DEBOUNCE_MS
    );

    runTimers();
    expect(persist).toHaveBeenCalledTimes(1);
    expect(persist).toHaveBeenCalledWith(
      expect.objectContaining({ bookId: "book-1", page: 3, completed: false })
    );
  });

  it("writes the last page immediately and cancels the pending debounce", () => {
    const { session, persist, timers } = createSession();

    session.track(2);
    expect(timers.size).toBe(1);

    session.track(10);

    expect(timers.size).toBe(0);
    expect(persist).toHaveBeenCalledTimes(1);
    expect(persist).toHaveBeenCalledWith(
      expect.objectContaining({ page: 10, completed: true })
    );
  });

  it("does not rewrite an immediate last-page write on flush", async () => {
    const { session, persist } = createSession();

    session.track(10);
    await settle();

    session.flush();
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it("does not flush an immediate last-page write still in flight", () => {
    const { session, persist } = createSession();
    const first = deferred<void>();
    persist.mockImplementationOnce(() => first.promise);

    session.track(10);
    session.flush();

    expect(persist).toHaveBeenCalledTimes(1);
  });

  it("flushes the latest unsaved page on unmount", () => {
    const { session, persist, timers } = createSession();

    session.track(2);
    session.track(4);
    session.flush();

    expect(timers.size).toBe(0);
    expect(persist).toHaveBeenCalledTimes(1);
    expect(persist).toHaveBeenCalledWith(
      expect.objectContaining({ page: 4, completed: false })
    );
  });

  it("flushes the current page again on unmount after a debounced write", async () => {
    const { session, persist, runTimers } = createSession();

    session.track(3);
    runTimers();
    await settle();

    session.flush();
    expect(persist).toHaveBeenCalledTimes(2);
    expect(persist).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ page: 3, completed: false })
    );
  });

  it("clears pending work when anonymous mode activates", () => {
    const { session, persist, timers, runTimers } = createSession();

    session.track(2);
    session.setAnonymous(true);

    expect(timers.size).toBe(0);
    runTimers();
    session.track(4);
    session.flush();

    expect(persist).not.toHaveBeenCalled();
  });

  it("starts tracking again after leaving anonymous mode", () => {
    const { session, persist, runTimers } = createSession();

    session.setAnonymous(true);
    session.track(4);
    session.setAnonymous(false);
    session.track(5);
    runTimers();

    expect(persist).toHaveBeenCalledTimes(1);
    expect(persist).toHaveBeenCalledWith(
      expect.objectContaining({ page: 5, completed: false })
    );
  });

  it("does not resurrect work when anonymous mode is left before unmount", () => {
    const { session, persist } = createSession();

    session.track(3);
    session.setAnonymous(true);
    session.setAnonymous(false);
    session.flush();

    expect(persist).not.toHaveBeenCalled();
  });

  it("serializes writes and keeps the latest page", async () => {
    const { session, persist, runTimers } = createSession();
    const first = deferred<void>();
    persist.mockImplementationOnce(() => first.promise);

    session.track(2);
    runTimers();
    session.track(3);
    runTimers();

    expect(persist).toHaveBeenCalledTimes(1);
    expect(persist).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ page: 2, completed: false })
    );

    first.resolve();
    await settle();

    expect(persist).toHaveBeenCalledTimes(2);
    expect(persist).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ page: 3, completed: false })
    );
  });

  it("sends the last page after the in-flight debounced write completes", async () => {
    const { session, persist, runTimers } = createSession();
    const first = deferred<void>();
    persist.mockImplementationOnce(() => first.promise);

    session.track(2);
    runTimers();
    session.track(10);

    expect(persist).toHaveBeenCalledTimes(1);

    first.resolve();
    await settle();

    expect(persist).toHaveBeenCalledTimes(2);
    expect(persist).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ page: 10, completed: true })
    );
  });

  it("queues the final flush behind an in-flight debounced write", async () => {
    const { session, persist, runTimers } = createSession();
    const first = deferred<void>();
    persist.mockImplementationOnce(() => first.promise);

    session.track(2);
    runTimers();
    session.flush();

    expect(persist).toHaveBeenCalledTimes(1);

    first.resolve();
    await settle();

    expect(persist).toHaveBeenCalledTimes(2);
    expect(persist).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ page: 2, completed: false })
    );
  });

  it("does not bypass the debounce when an in-flight write resolves", async () => {
    const { session, persist, runTimers } = createSession();
    const first = deferred<void>();
    persist.mockImplementationOnce(() => first.promise);

    session.track(2);
    runTimers();
    session.track(3);

    first.resolve();
    await settle();

    expect(persist).toHaveBeenCalledTimes(1);

    runTimers();
    expect(persist).toHaveBeenCalledTimes(2);
    expect(persist).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ page: 3, completed: false })
    );
  });

  it("snapshots the target when a write is scheduled", () => {
    const { session, persist, runTimers } = createSession();

    session.track(3);
    session.updateTarget({ bookId: "book-2", seriesId: "series-2", totalPages: 20 });
    runTimers();

    expect(persist).toHaveBeenCalledWith(
      expect.objectContaining({
        bookId: "book-1",
        seriesId: "series-1",
        totalPages: 10,
        page: 3,
      })
    );
  });

  it("retries a failed write on flush", async () => {
    const { session, persist, runTimers } = createSession();
    persist.mockRejectedValueOnce(new Error("write failed"));

    session.track(3);
    runTimers();
    await settle();

    expect(persist).toHaveBeenCalledTimes(1);

    session.flush();
    expect(persist).toHaveBeenCalledTimes(2);
  });
});
