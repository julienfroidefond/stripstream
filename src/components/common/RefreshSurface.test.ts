// @vitest-environment jsdom
import { createElement, type ComponentType, type ReactNode } from "react";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { RefreshResult } from "@/contexts/RefreshContext";
import type { RefreshScope } from "@/lib/cache/invalidation";

const mocks = vi.hoisted(() => ({
  revalidateForRefresh: vi.fn(),
  refresh: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock("@/app/actions/refresh", () => ({
  revalidateForRefresh: mocks.revalidateForRefresh,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

vi.mock("@/components/common/PullToRefreshIndicator", () => ({
  PullToRefreshIndicator: () => null,
}));

vi.mock("@/hooks/usePullToRefresh", () => ({
  usePullToRefresh: () => ({
    isPulling: false,
    isRefreshing: false,
    progress: 0,
    canRefresh: false,
    isHiding: false,
  }),
}));

vi.mock("@/lib/logger", () => ({
  default: { error: mocks.loggerError },
}));

import { RefreshSurface } from "./RefreshSurface";
import { useRefreshSurface } from "@/contexts/RefreshContext";

const RefreshSurfaceForTest = RefreshSurface as ComponentType<{
  scope: RefreshScope;
  id: string;
  pullToRefresh?: boolean;
}>;

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function Wrapper({ children }: { children: ReactNode }) {
  return createElement(
    RefreshSurfaceForTest,
    { scope: "series", id: "series-1", pullToRefresh: false },
    children
  );
}

function renderSurface() {
  return renderHook(() => useRefreshSurface(), { wrapper: Wrapper });
}

describe("RefreshSurface", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.revalidateForRefresh.mockReset();
    mocks.refresh.mockReset();
    mocks.loggerError.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("invalide la surface puis ne rafraîchit qu'une fois", async () => {
    const invalidation = deferred<void>();
    mocks.revalidateForRefresh.mockReturnValueOnce(invalidation.promise);
    const { result } = renderSurface();

    let cycle!: Promise<RefreshResult>;
    act(() => {
      cycle = result.current.refresh();
    });

    expect(result.current.isRefreshing).toBe(true);
    expect(mocks.revalidateForRefresh).toHaveBeenCalledWith("series", "series-1");
    expect(mocks.refresh).not.toHaveBeenCalled();

    await act(async () => {
      invalidation.resolve();
      await Promise.resolve();
    });

    expect(mocks.refresh).toHaveBeenCalledTimes(1);
    expect(result.current.isRefreshing).toBe(true);

    let settled: RefreshResult | undefined;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
      settled = await cycle;
    });

    expect(settled).toEqual({ success: true });
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
    expect(result.current.isRefreshing).toBe(false);
  });

  it("échoue sans router.refresh quand l'invalidation échoue", async () => {
    mocks.revalidateForRefresh.mockRejectedValueOnce(new Error("boom"));
    const { result } = renderSurface();

    let settled: RefreshResult | undefined;
    await act(async () => {
      settled = await result.current.refresh();
    });

    expect(settled).toEqual({ success: false });
    expect(mocks.refresh).not.toHaveBeenCalled();
    expect(result.current.isRefreshing).toBe(false);
    expect(mocks.loggerError).toHaveBeenCalledWith(
      expect.objectContaining({ scope: "series", id: "series-1" }),
      "Refresh failed"
    );
  });

  it("partage le cycle en cours au lieu d'en démarrer un second", async () => {
    const invalidation = deferred<void>();
    mocks.revalidateForRefresh.mockReturnValueOnce(invalidation.promise);
    const { result } = renderSurface();

    let first!: Promise<RefreshResult>;
    let second!: Promise<RefreshResult>;
    act(() => {
      first = result.current.refresh();
      second = result.current.refresh();
    });

    expect(second).toBe(first);
    expect(mocks.revalidateForRefresh).toHaveBeenCalledTimes(1);

    await act(async () => {
      invalidation.resolve();
      await Promise.resolve();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
      await first;
    });

    expect(mocks.refresh).toHaveBeenCalledTimes(1);
    expect(result.current.isRefreshing).toBe(false);
  });
});
