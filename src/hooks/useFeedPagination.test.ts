// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useFeedPagination } from "./useFeedPagination";

function ok<T>(items: T[], hasMore: boolean) {
  return { success: true as const, code: "OK" as const, message: "OK", items, hasMore };
}

describe("useFeedPagination", () => {
  it("slices the initial page and infers hasMore", () => {
    const loadPage = vi.fn(async () => ok<string>([], false));

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
      return ok(["c", "d"], false);
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
    const loadPage = vi.fn(async () => ok<string>([], false));

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

  it("keeps the current page when the action reports a failure", async () => {
    const loadPage = vi.fn(async () => ({
      success: false as const,
      code: "HOME_FETCH_ERROR" as const,
      message: "provider down",
    }));

    const { result } = renderHook(() =>
      useFeedPagination<string>({
        initialItems: ["a", "b"],
        initialHasMore: true,
        pageSize: 2,
        loadPage,
      })
    );

    act(() => result.current.loadMore());

    await waitFor(() => expect(loadPage).toHaveBeenCalledWith(2));
    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current.items).toEqual(["a", "b"]);
    expect(result.current.hasMore).toBe(true);
  });

  it("replaces the state when the server delivers a new first page", async () => {
    const loadPage = vi.fn(async () => ok(["c", "d"], true));
    const { result, rerender } = renderHook(
      ({ initialItems }: { initialItems: string[] }) =>
        useFeedPagination({ initialItems, initialHasMore: true, pageSize: 2, loadPage }),
      { initialProps: { initialItems: ["a", "b"] } }
    );

    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.items).toEqual(["a", "b", "c", "d"]));

    // router.refresh() : nouvelle première page.
    rerender({ initialItems: ["x", "y", "z"] });

    expect(result.current.items).toEqual(["x", "y"]);
    expect(result.current.hasMore).toBe(true);
  });

  it("drops a page that was in flight when the first page was replaced", async () => {
    let resolveLoad: (value: ReturnType<typeof ok<string>>) => void = () => undefined;
    const loadPage = vi.fn(
      () => new Promise<ReturnType<typeof ok<string>>>((resolve) => (resolveLoad = resolve))
    );
    const { result, rerender } = renderHook(
      ({ initialItems }: { initialItems: string[] }) =>
        useFeedPagination({ initialItems, initialHasMore: true, pageSize: 2, loadPage }),
      { initialProps: { initialItems: ["a", "b"] } }
    );

    act(() => result.current.loadMore());
    rerender({ initialItems: ["x", "y"] });
    await act(async () => resolveLoad(ok(["c", "d"], false)));
    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current.items).toEqual(["x", "y"]);
    expect(result.current.hasMore).toBe(true);
  });
});
