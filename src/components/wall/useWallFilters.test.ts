// @vitest-environment jsdom

import { StrictMode, createElement } from "react";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { buildStorageKey } from "@/lib/storage";
import type { WallItem } from "@/types/wall";

import {
  useWallFilters,
  type WallFilterStorage,
} from "./useWallFilters";

const SCOPE = "user-1";
const FILTERS_KEY = buildStorageKey(SCOPE, "wall-libraries");
const HIDE_READ_KEY = buildStorageKey(SCOPE, "wall-hide-read");

class FakeWallStorage implements WallFilterStorage {
  readonly reads: string[] = [];
  readonly writes: Array<{ key: string; value: string }> = [];
  failRead = false;
  failWrite = false;

  private readonly values = new Map<string, string>();
  private frames: Array<() => void> = [];

  constructor(initial: Record<string, string> = {}) {
    for (const [key, value] of Object.entries(initial)) {
      this.values.set(key, value);
    }
  }

  getItem(key: string): string | null {
    if (this.failRead) throw new Error("storage unavailable");
    this.reads.push(key);
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.failWrite) throw new Error("storage full");
    this.writes.push({ key, value });
    this.values.set(key, value);
  }

  requestFrame(callback: () => void): void {
    this.frames.push(callback);
  }

  pendingFrames(): number {
    return this.frames.length;
  }

  flushFrame(): void {
    const frames = this.frames;
    this.frames = [];
    for (const frame of frames) frame();
  }
}

function item(overrides: Partial<WallItem> = {}): WallItem {
  return {
    id: "series-1",
    name: "Les Naufragés",
    thumbnailUrl: "/cover",
    summary: null,
    authors: [],
    genres: [],
    libraryName: "Bacs à sable",
    bookCount: 3,
    booksReadCount: 0,
    startYear: null,
    seriesStatus: null,
    missingCount: null,
    communityScore: null,
    ...overrides,
  };
}

const sandboxUnread = item({ id: "sandbox-unread" });
const archiveUnread = item({
  id: "archive-unread",
  libraryName: "Archives",
});
const archiveRead = item({
  id: "archive-read",
  libraryName: "Archives",
  bookCount: 2,
  booksReadCount: 2,
});
const items = [sandboxUnread, archiveUnread, archiveRead];

function renderFilters(
  storage: FakeWallStorage,
  wallItems: readonly WallItem[] = items
) {
  return renderHook(() =>
    useWallFilters({
      items: wallItems,
      scope: SCOPE,
      language: "en",
      storage,
    })
  );
}

afterEach(cleanup);

describe("useWallFilters", () => {
  it("hydrates defaults immediately and writes them once", () => {
    const storage = new FakeWallStorage();
    const { result } = renderFilters(storage);

    expect(result.current.selectedLibraries.size).toBe(0);
    expect(result.current.hideRead).toBe(false);
    expect(result.current.visibleItems).toEqual(items);
    expect(result.current.selectionKey).toBe("all");
    expect(result.current.consumeEntranceSkip()).toBe(false);
    expect(storage.pendingFrames()).toBe(0);
    expect(storage.writes).toEqual([
      { key: FILTERS_KEY, value: "[]" },
      { key: HIDE_READ_KEY, value: "false" },
    ]);
  });

  it("restores filters in a frame, writes only after, and skips the entrance", () => {
    const storage = new FakeWallStorage({
      [FILTERS_KEY]: JSON.stringify(["Archives", "Bibliothèque supprimée"]),
      [HIDE_READ_KEY]: "true",
    });
    const { result } = renderFilters(storage);

    expect(storage.pendingFrames()).toBe(1);
    expect(storage.writes).toEqual([]);
    expect(result.current.hideRead).toBe(false);

    act(() => storage.flushFrame());

    expect([...result.current.selectedLibraries]).toEqual(["Archives"]);
    expect(result.current.hideRead).toBe(true);
    expect(result.current.visibleItems).toEqual([archiveUnread]);
    expect(result.current.visibleLibraryCount).toBe(1);
    expect(result.current.completedCount).toBe(1);
    expect(result.current.selectionKey).toBe(
      JSON.stringify({ libraries: ["Archives"], hideRead: true })
    );
    expect(storage.writes).toEqual([
      { key: FILTERS_KEY, value: JSON.stringify(["Archives"]) },
      { key: HIDE_READ_KEY, value: "true" },
    ]);

    expect(result.current.consumeEntranceSkip()).toBe(true);
    expect(result.current.consumeEntranceSkip()).toBe(false);
  });

  it("reads each storage key once under StrictMode", () => {
    const storage = new FakeWallStorage({
      [FILTERS_KEY]: JSON.stringify(["Archives"]),
    });
    const { result } = renderHook(
      () =>
        useWallFilters({
          items,
          scope: SCOPE,
          language: "en",
          storage,
        }),
      {
        wrapper: ({ children }) => createElement(StrictMode, null, children),
      }
    );

    expect(storage.reads).toEqual([FILTERS_KEY, HIDE_READ_KEY]);
    expect(storage.pendingFrames()).toBe(1);

    act(() => storage.flushFrame());

    expect([...result.current.selectedLibraries]).toEqual(["Archives"]);
  });

  it("keeps the wall usable when storage throws", () => {
    const storage = new FakeWallStorage();
    storage.failRead = true;
    storage.failWrite = true;

    const { result } = renderFilters(storage);

    expect(result.current.visibleItems).toEqual(items);
    expect(result.current.selectionKey).toBe("all");
    expect(storage.writes).toEqual([]);
  });

  it("toggles libraries, clears the selection and resets every filter", () => {
    const storage = new FakeWallStorage();
    const { result } = renderFilters(storage);

    act(() => result.current.toggleLibrary("Archives"));
    expect([...result.current.selectedLibraries]).toEqual(["Archives"]);
    expect(result.current.visibleItems).toEqual([archiveUnread, archiveRead]);

    act(() => result.current.toggleLibrary("Bacs à sable"));
    expect([...result.current.selectedLibraries].sort()).toEqual([
      "Archives",
      "Bacs à sable",
    ]);

    act(() => result.current.showAllLibraries());
    expect(result.current.selectedLibraries.size).toBe(0);

    act(() => result.current.toggleHideRead());
    expect(result.current.hideRead).toBe(true);
    expect(result.current.selectionKey).not.toBe("all");

    act(() => result.current.showAllItems());
    expect(result.current.hideRead).toBe(false);
    expect(result.current.selectionKey).toBe("all");
  });

  it("closes the panel when a filter empties the wall", () => {
    const storage = new FakeWallStorage();
    const { result } = renderFilters(storage, [archiveRead]);

    act(() => result.current.togglePanel());
    expect(result.current.panelOpen).toBe(true);

    act(() => result.current.toggleHideRead());

    expect(result.current.visibleItems).toEqual([]);
    expect(result.current.panelOpen).toBe(false);
    expect(storage.writes.at(-1)).toEqual({
      key: HIDE_READ_KEY,
      value: "true",
    });
  });
});
