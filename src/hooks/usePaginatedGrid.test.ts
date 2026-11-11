// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { usePaginatedGrid } from "./usePaginatedGrid";

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

vi.mock("@/lib/logger", () => ({
  default: { error: vi.fn() },
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
    mocks.updatePreferences.mockReset().mockResolvedValue(undefined);
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
    mocks.updatePreferences.mockRejectedValueOnce(new Error("offline"));
    const { result } = renderGrid();

    await act(async () => {
      await result.current.handleViewModeToggle("list");
    });

    expect(result.current.viewMode).toBe("list");
  });
});
