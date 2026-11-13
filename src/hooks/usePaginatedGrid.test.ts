// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { usePaginatedGrid } from "./usePaginatedGrid";
import { parseSeriesCollectionQuery } from "@/lib/collections/query";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  capture: vi.fn(),
  updatePreferences: vi.fn(),
  searchParams: new URLSearchParams(),
  preferences: {
    displayMode: {
      compact: false,
      itemsPerPage: 30,
      viewMode: "grid" as const,
      booksViewMode: "grid" as const,
    },
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, replace: mocks.replace }),
  usePathname: () => "/libraries/lib-a",
  useSearchParams: () => mocks.searchParams,
}));

vi.mock("@/components/motion", () => ({
  useGridFlip: () => ({
    containerRef: { current: null },
    capture: mocks.capture,
    take: vi.fn(),
  }),
  useGridFlipPlayback: vi.fn(),
}));

vi.mock("@/contexts/PreferencesContext", () => ({
  usePreferences: () => ({
    preferences: mocks.preferences,
    updatePreferences: mocks.updatePreferences,
  }),
}));

function renderGrid(overrides: Partial<Parameters<typeof usePaginatedGrid>[0]> = {}) {
  return renderHook(() =>
    usePaginatedGrid({
      contentKey: "series-a,series-b",
      showOnlyUnread: false,
      defaultShowOnlyUnread: false,
      pageSize: 30,
      initialCompact: false,
      initialViewMode: "grid",
      viewModePreference: "viewMode",
      ...overrides,
    })
  );
}

describe("usePaginatedGrid", () => {
  beforeEach(() => {
    mocks.push.mockReset();
    mocks.replace.mockReset();
    mocks.capture.mockReset();
    mocks.updatePreferences.mockReset().mockResolvedValue(true);
    mocks.searchParams = new URLSearchParams();
  });

  it("applies the default unread filter with a replace", async () => {
    renderGrid({ defaultShowOnlyUnread: true });

    await waitFor(() =>
      expect(mocks.replace).toHaveBeenCalledWith(
        "/libraries/lib-a?page=1&unread=true",
        { scroll: false }
      )
    );
  });

  it("moves to another page through the URL", async () => {
    const { result } = renderGrid();

    await act(async () => {
      await result.current.handlePageChange(2);
    });

    await waitFor(() =>
      expect(mocks.push).toHaveBeenCalledWith("/libraries/lib-a?page=2", { scroll: false })
    );
    expect(mocks.capture).not.toHaveBeenCalled();
  });

  it("persists the page size and resets the page without dimming", async () => {
    const { result } = renderGrid();

    await act(async () => {
      await result.current.handlePageSizeChange(60);
    });

    expect(mocks.capture).toHaveBeenCalledTimes(1);
    expect(mocks.updatePreferences).toHaveBeenCalledWith({
      displayMode: { ...mocks.preferences.displayMode, itemsPerPage: 60 },
    });
    expect(mocks.push).toHaveBeenCalledWith("/libraries/lib-a?page=1&size=60", {
      scroll: false,
    });
  });

  it("normalizes the page size when enabling compact and targets the grid's view mode key", async () => {
    const { result } = renderGrid({
      initialViewMode: "list",
      viewModePreference: "booksViewMode",
    });

    await act(async () => {
      await result.current.handleCompactModeToggle(true);
    });

    expect(result.current.isCompact).toBe(true);
    expect(result.current.effectivePageSize).toBe(24);
    expect(mocks.updatePreferences).toHaveBeenCalledWith({
      displayMode: {
        compact: true,
        itemsPerPage: 24,
        viewMode: "grid",
        booksViewMode: "list",
      },
    });
    expect(mocks.push).toHaveBeenCalledWith("/libraries/lib-a?page=1&size=24", {
      scroll: false,
    });
  });

  it("toggles unread state and persists it", async () => {
    const { result } = renderGrid({ showOnlyUnread: true });

    await act(async () => {
      await result.current.handleUnreadFilter();
    });

    expect(result.current.showOnlyUnread).toBe(false);
    expect(mocks.capture).toHaveBeenCalledTimes(1);
    expect(mocks.updatePreferences).toHaveBeenCalledWith({ showOnlyUnread: false });
    expect(mocks.push).toHaveBeenCalledWith("/libraries/lib-a?page=1&unread=false", {
      scroll: false,
    });
  });

  it("keeps the local view mode when preference persistence fails", async () => {
    mocks.updatePreferences.mockResolvedValueOnce(false);
    const { result } = renderGrid();

    await act(async () => {
      await result.current.handleViewModeToggle("list");
    });

    expect(result.current.viewMode).toBe("list");
  });

  it("hides missing-book placeholders locally without touching the URL", async () => {
    const { result } = renderGrid({ initialHideMissingBooks: false });

    await act(async () => {
      await result.current.handleHideMissingToggle();
    });

    expect(result.current.hideMissingBooks).toBe(true);
    expect(mocks.capture).toHaveBeenCalledTimes(1);
    expect(mocks.updatePreferences).toHaveBeenCalledWith({ hideMissingBooks: true });
    expect(mocks.push).not.toHaveBeenCalled();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("filters the series grid on missing books through the URL", async () => {
    const { result } = renderGrid();

    await act(async () => {
      await result.current.handleMissingToggle();
    });

    expect(result.current.showMissing).toBe(true);
    expect(mocks.updatePreferences).toHaveBeenCalledWith({ showMissingBooks: false });
    expect(mocks.push).toHaveBeenCalledWith("/libraries/lib-a?page=1&missing=true", {
      scroll: false,
    });
  });

  it("persists a missing filter that the next visit reads back in the same sense", async () => {
    for (const initialHasMissing of [false, true]) {
      mocks.updatePreferences.mockClear();
      mocks.push.mockClear();
      const { result, unmount } = renderGrid({ initialHasMissing });

      await act(async () => {
        await result.current.handleMissingToggle();
      });

      const active = !initialHasMissing;
      expect(result.current.showMissing).toBe(active);
      const [[written]] = mocks.updatePreferences.mock.calls as [[{ showMissingBooks: boolean }]];
      // Visite suivante sans paramètre `missing` : la préférence écrite doit
      // redonner le filtre que l'utilisateur vient de choisir.
      const nextVisit = parseSeriesCollectionQuery(
        {},
        {
          itemsPerPage: 30,
          compact: false,
          unreadOnly: false,
          defaultSortOrder: "title",
          showMissingBooks: written.showMissingBooks,
          canSortByRating: false,
        }
      );
      expect(nextVisit.missing).toBe(active);
      expect(mocks.push).toHaveBeenCalledWith(
        `/libraries/lib-a?page=1&missing=${active}`,
        { scroll: false }
      );
      unmount();
    }
  });

  it("resyncs the controls when back/forward delivers new server values", () => {
    const { result, rerender } = renderHook((props: Parameters<typeof usePaginatedGrid>[0]) =>
      usePaginatedGrid(props),
      {
        initialProps: {
          contentKey: "a",
          showOnlyUnread: true,
          defaultShowOnlyUnread: false,
          pageSize: 30,
          initialCompact: false,
          initialViewMode: "grid" as const,
          viewModePreference: "viewMode" as const,
          initialSearch: "akira",
          initialSort: "latest",
          initialHasMissing: true,
        },
      }
    );

    expect(result.current.showOnlyUnread).toBe(true);
    expect(result.current.sort).toBe("latest");

    rerender({
      contentKey: "b",
      showOnlyUnread: false,
      defaultShowOnlyUnread: false,
      pageSize: 30,
      initialCompact: false,
      initialViewMode: "grid",
      viewModePreference: "viewMode",
      initialSearch: "",
      initialSort: "title",
      initialHasMissing: false,
    });

    expect(result.current.showOnlyUnread).toBe(false);
    expect(result.current.sort).toBe("title");
    expect(result.current.searchTerm).toBe("");
    expect(result.current.showMissing).toBe(false);
  });

  it("keeps the characters typed while its own search round-trips", () => {
    vi.useFakeTimers();
    try {
      const base = {
        contentKey: "a",
        showOnlyUnread: false,
        defaultShowOnlyUnread: false,
        pageSize: 30,
        initialCompact: false,
        initialViewMode: "grid" as const,
        viewModePreference: "viewMode" as const,
      };
      const { result, rerender } = renderHook(
        (props: Parameters<typeof usePaginatedGrid>[0]) => usePaginatedGrid(props),
        { initialProps: { ...base, initialSearch: "" } }
      );

      act(() => result.current.handleSearchChange("ak"));
      act(() => {
        vi.advanceTimersByTime(400);
      });
      act(() => result.current.handleSearchChange("aki"));
      // Le serveur répond à la première saisie pendant que l'on tape encore.
      rerender({ ...base, initialSearch: "ak" });

      expect(result.current.searchTerm).toBe("aki");
    } finally {
      vi.useRealTimers();
    }
  });
});
