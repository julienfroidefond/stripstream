import { describe, expect, it, vi } from "vitest";

import { defaultPreferences, type UserPreferences } from "@/types/preferences";
import {
  PreferencesWriter,
  mergePreferencePatches,
  mergePreferences,
  type PreferencesPatch,
  type ScheduleFlush,
} from "./preferences-writer";

function basePreferences(overrides: Partial<UserPreferences> = {}): UserPreferences {
  return mergePreferences(defaultPreferences, overrides);
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function manualScheduler(): {
  schedule: ScheduleFlush;
  run: () => void;
  pending: () => number;
} {
  let nextId = 0;
  const callbacks = new Map<number, () => void>();

  return {
    schedule: (callback) => {
      const id = nextId++;
      callbacks.set(id, callback);
      return () => {
        callbacks.delete(id);
      };
    },
    run: () => {
      const pending = [...callbacks.values()];
      callbacks.clear();
      pending.forEach((callback) => callback());
    },
    pending: () => callbacks.size,
  };
}

describe("PreferencesWriter", () => {
  it("applies a patch optimistically and keeps unmodified fields", async () => {
    const initial = basePreferences();
    const pending = deferred<UserPreferences>();
    const persist = vi.fn(() => pending.promise);
    const writer = new PreferencesWriter({ initial, persist });

    const patch: PreferencesPatch = {
      showThumbnails: false,
      background: { ...initial.background, opacity: 50 },
    };
    const write = writer.update(patch);

    expect(writer.getSnapshot().showThumbnails).toBe(false);
    expect(writer.getSnapshot().background).toEqual({
      ...initial.background,
      opacity: 50,
    });
    expect(writer.getSnapshot().readingDirection).toBe(initial.readingDirection);
    expect(persist).toHaveBeenCalledWith(patch);

    pending.resolve({ ...initial, ...patch });
    await expect(write).resolves.toBe(true);
    expect(writer.getSnapshot().showThumbnails).toBe(false);
  });

  it("rolls back to the confirmed snapshot and emits one failure event", async () => {
    const initial = basePreferences();
    const error = new Error("offline");
    const persist = vi.fn().mockRejectedValueOnce(error);
    const events: string[] = [];
    const writer = new PreferencesWriter({
      initial,
      persist,
      notify: (event) => events.push(event.type),
    });

    const write = writer.update({ showThumbnails: false }, { feedback: "all" });

    expect(writer.getSnapshot().showThumbnails).toBe(false);
    await expect(write).resolves.toBe(false);
    expect(writer.getSnapshot()).toBe(initial);
    expect(events).toEqual(["failed"]);
  });

  it("coalesces continuous updates into one request and one feedback event", async () => {
    const initial = basePreferences();
    const scheduler = manualScheduler();
    const persist = vi.fn(async (patch: PreferencesPatch) =>
      mergePreferences(initial, patch)
    );
    const notify = vi.fn();
    const writer = new PreferencesWriter({
      initial,
      persist,
      notify,
      schedule: scheduler.schedule,
    });

    const first = writer.update(
      { readerPrefetchCount: 7 },
      { coalesce: true, feedback: "errors" }
    );
    const second = writer.update(
      { readerPageTurn: false },
      { coalesce: true, feedback: "errors" }
    );

    expect(scheduler.pending()).toBe(1);
    expect(persist).not.toHaveBeenCalled();
    expect(writer.getSnapshot().readerPrefetchCount).toBe(7);
    expect(writer.getSnapshot().readerPageTurn).toBe(false);

    scheduler.run();
    await expect(Promise.all([first, second])).resolves.toEqual([true, true]);

    expect(persist).toHaveBeenCalledTimes(1);
    expect(persist).toHaveBeenCalledWith({
      readerPrefetchCount: 7,
      readerPageTurn: false,
    });
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ type: "saved", feedback: "errors" })
    );
  });

  it("serializes writes and reapplies patches queued during a request", async () => {
    const initial = basePreferences();
    const first = deferred<UserPreferences>();
    const second = deferred<UserPreferences>();
    const scheduler = manualScheduler();
    const persist = vi
      .fn()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);
    const writer = new PreferencesWriter({
      initial,
      persist,
      schedule: scheduler.schedule,
    });

    const write1 = writer.update({ readingDirection: "rtl" }, { feedback: "all" });
    const write2 = writer.update(
      { readerPageTurn: false },
      { coalesce: true, feedback: "errors" }
    );
    const write3 = writer.update({ readerPrefetchCount: 9 }, { coalesce: true });

    expect(persist).toHaveBeenCalledTimes(1);
    scheduler.run();
    expect(persist).toHaveBeenCalledTimes(1);

    first.resolve({ ...initial, readingDirection: "rtl" });
    await vi.waitFor(() => expect(persist).toHaveBeenCalledTimes(2));
    expect(persist.mock.calls[1][0]).toEqual({
      readerPageTurn: false,
      readerPrefetchCount: 9,
    });
    expect(writer.getSnapshot().readerPageTurn).toBe(false);
    expect(writer.getSnapshot().readerPrefetchCount).toBe(9);

    second.resolve({
      ...initial,
      readingDirection: "rtl",
      readerPageTurn: false,
      readerPrefetchCount: 9,
    });
    await expect(Promise.all([write1, write2, write3])).resolves.toEqual([
      true,
      true,
      true,
    ]);
  });

  it("rolls back a failed batch while keeping the next queued patch", async () => {
    const initial = basePreferences();
    const first = deferred<UserPreferences>();
    const second = deferred<UserPreferences>();
    const persist = vi
      .fn()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);
    const writer = new PreferencesWriter({ initial, persist });

    const write1 = writer.update({ readingDirection: "rtl" });
    const write2 = writer.update({ readerPageTurn: false });

    first.reject(new Error("offline"));
    await expect(write1).resolves.toBe(false);
    await vi.waitFor(() => expect(persist).toHaveBeenCalledTimes(2));

    expect(writer.getSnapshot().readingDirection).toBe(initial.readingDirection);
    expect(writer.getSnapshot().readerPageTurn).toBe(false);

    second.resolve({ ...initial, readerPageTurn: false });
    await expect(write2).resolves.toBe(true);
    expect(writer.getSnapshot().readingDirection).toBe(initial.readingDirection);
  });

  it("flushes a coalesced patch immediately", async () => {
    const initial = basePreferences();
    const scheduler = manualScheduler();
    const persist = vi.fn(async (patch: PreferencesPatch) =>
      mergePreferences(initial, patch)
    );
    const writer = new PreferencesWriter({
      initial,
      persist,
      schedule: scheduler.schedule,
    });

    void writer.update({ readerPrefetchCount: 8 }, { coalesce: true });
    await writer.flush();

    expect(scheduler.pending()).toBe(0);
    expect(persist).toHaveBeenCalledTimes(1);
    expect(writer.getSnapshot().readerPrefetchCount).toBe(8);
  });

  it("ignores an in-flight response after a session reset", async () => {
    const initial = basePreferences();
    const pending = deferred<UserPreferences>();
    const persist = vi.fn(() => pending.promise);
    const events: string[] = [];
    const writer = new PreferencesWriter({
      initial,
      persist,
      notify: (event) => events.push(event.type),
    });

    const write = writer.update({ showThumbnails: false }, { feedback: "all" });
    const resetState = basePreferences({ readingDirection: "rtl" });
    writer.reset(resetState);

    expect(writer.getSnapshot()).toBe(resetState);
    await expect(write).resolves.toBe(false);

    pending.resolve({ ...initial, showThumbnails: false });
    await Promise.resolve();
    await Promise.resolve();

    expect(writer.getSnapshot()).toBe(resetState);
    expect(events).toEqual([]);
  });

  it("does not call the server for an empty patch", async () => {
    const initial = basePreferences();
    const persist = vi.fn(async () => initial);
    const writer = new PreferencesWriter({ initial, persist });

    await expect(writer.update({}, { feedback: "all" })).resolves.toBe(true);
    expect(persist).not.toHaveBeenCalled();
  });
});

describe("preference merge helpers", () => {
  it("merges nested display and background patches without dropping fields", () => {
    const initial = basePreferences();
    const merged = mergePreferencePatches(
      {
        displayMode: { ...initial.displayMode, compact: true },
        background: { ...initial.background, opacity: 50 },
      },
      {
        background: { blur: 4 } as PreferencesPatch["background"],
      }
    );

    expect(merged.displayMode?.compact).toBe(true);
    expect(merged.background).toEqual({
      ...initial.background,
      opacity: 50,
      blur: 4,
    });
  });
});
