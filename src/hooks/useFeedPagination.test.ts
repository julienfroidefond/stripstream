// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useFeedPagination } from "./useFeedPagination";

describe("useFeedPagination", () => {
  it("slices the initial page and infers hasMore", () => {
    const loadPage = vi.fn(async () => ({ items: [], hasMore: false }));

    const { result } = renderHook(() =>
      useFeedPagination({
        initialItems: ["a", "b", "c"],
        pageSize: 2,
        loadPage,
      })
    );

    expect(result.current.items).toEqual(["a", "b"]);
    expect(result.current.hasMore).toBe(true);
    expect(result.current.isPending).toBe(false);
  });

  it("appends the next page instead of replacing the list", async () => {
    const loadPage = vi.fn(async (offset: number) => {
      expect(offset).toBe(2);
      return { items: ["c", "d"], hasMore: false };
    });
    const onPageAppended = vi.fn();

    const { result } = renderHook(() =>
      useFeedPagination({
        initialItems: ["a", "b"],
        initialHasMore: true,
        pageSize: 2,
        loadPage,
        onPageAppended,
      })
    );

    act(() => result.current.loadMore());

    await waitFor(() =>
      expect(result.current.items).toEqual(["a", "b", "c", "d"])
    );

    expect(result.current.hasMore).toBe(false);
    expect(onPageAppended).toHaveBeenCalledWith(
      { items: ["c", "d"], hasMore: false },
      ["a", "b"]
    );
  });

  it("does not call the loader once the last page is reached", () => {
    const loadPage = vi.fn(async () => ({ items: [], hasMore: false }));

    const { result } = renderHook(() =>
      useFeedPagination({
        initialItems: ["a", "b"],
        initialHasMore: false,
        pageSize: 2,
        loadPage,
      })
    );

    act(() => result.current.loadMore());

    expect(loadPage).not.toHaveBeenCalled();
  });

  it("keeps the current page when the loader fails", async () => {
    const loadPage = vi.fn(async () => {
      throw new Error("network down");
    });

    const { result } = renderHook(() =>
      useFeedPagination({
        initialItems: ["a", "b"],
        initialHasMore: true,
        pageSize: 2,
        loadPage,
      })
    );

    act(() => result.current.loadMore());

    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current.items).toEqual(["a", "b"]);
    expect(result.current.hasMore).toBe(true);
  });
});
