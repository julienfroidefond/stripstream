import { describe, expect, it } from "vitest";

import {
  nextBookKey,
  planPrefetch,
  PREFETCH_CONCURRENCY,
  SPREAD_PREFETCH_CONCURRENCY,
  type PrefetchKey,
  type PrefetchPlanInput,
  type PrefetchStatus,
} from "./prefetch-plan";

function input(
  overrides: Partial<PrefetchPlanInput> = {},
  statuses: Record<string, PrefetchStatus> = {}
): PrefetchPlanInput {
  return {
    currentPage: 1,
    totalPages: 20,
    isSpread: false,
    prefetchCount: 5,
    hasNextBook: false,
    statusOf: (key: PrefetchKey) => statuses[String(key)] ?? "idle",
    ...overrides,
  };
}

describe("planPrefetch", () => {
  it("fetches the visible page and the window ahead in single-page mode", () => {
    expect(planPrefetch(input({ currentPage: 3 }))).toEqual({
      visible: [3],
      ahead: [4, 5, 6, 7],
      aheadConcurrency: PREFETCH_CONCURRENCY,
      nextBook: [],
      nextBookConcurrency: PREFETCH_CONCURRENCY,
    });
  });

  it("shows both pages of a spread and extends the window by one page", () => {
    const plan = planPrefetch(input({ currentPage: 4, isSpread: true }));
    expect(plan.visible).toEqual([4, 5]);
    expect(plan.ahead).toEqual([6, 7, 8, 9]);
    expect(plan.aheadConcurrency).toBe(SPREAD_PREFETCH_CONCURRENCY);
  });

  it("stops the window at the last page", () => {
    expect(planPrefetch(input({ currentPage: 18 })).ahead).toEqual([19, 20]);
    expect(planPrefetch(input({ currentPage: 20 })).ahead).toEqual([]);
    expect(planPrefetch(input({ currentPage: 19, isSpread: true })).ahead).toEqual([]);
  });

  it("skips loaded, pending and failed upcoming pages", () => {
    const plan = planPrefetch(
      input({ currentPage: 1 }, { 2: "loaded", 3: "pending", 4: "failed" })
    );
    expect(plan.ahead).toEqual([5]);
  });

  it("always requests the visible pages, even after a failure", () => {
    const plan = planPrefetch(input({ currentPage: 2 }, { 2: "failed" }));
    expect(plan.visible).toEqual([2]);
  });

  it("does not plan the next book far from the end", () => {
    const plan = planPrefetch(input({ currentPage: 10, hasNextBook: true }));
    expect(plan.nextBook).toEqual([]);
  });

  it("plans the first pages of the next book near the end", () => {
    const plan = planPrefetch(input({ currentPage: 17, prefetchCount: 3, hasNextBook: true }));
    expect(plan.nextBook).toEqual([
      { key: "next-1", page: 1 },
      { key: "next-2", page: 2 },
      { key: "next-3", page: 3 },
    ]);
  });

  it("never asks for a page past the end of a short next book", () => {
    const plan = planPrefetch(
      input({ currentPage: 18, prefetchCount: 5, hasNextBook: true, nextBookPageCount: 2 })
    );
    expect(plan.nextBook).toEqual([
      { key: "next-1", page: 1 },
      { key: "next-2", page: 2 },
    ]);
    expect(
      planPrefetch(input({ currentPage: 18, hasNextBook: true, nextBookPageCount: 0 })).nextBook
    ).toEqual([]);
  });

  it("ignores the next book when there is none", () => {
    expect(planPrefetch(input({ currentPage: 20 })).nextBook).toEqual([]);
  });

  it("never re-plans a failed next-book page", () => {
    // Regression: a failed `next-*` page was retried on every page turn.
    const plan = planPrefetch(
      input(
        { currentPage: 19, prefetchCount: 3, hasNextBook: true },
        { [nextBookKey(1)]: "failed", [nextBookKey(2)]: "pending", [nextBookKey(3)]: "loaded" }
      )
    );
    expect(plan.nextBook).toEqual([]);
  });

  it("returns an empty window when prefetching is disabled", () => {
    const plan = planPrefetch(input({ currentPage: 5, prefetchCount: 0, hasNextBook: true }));
    expect(plan).toMatchObject({ visible: [5], ahead: [], nextBook: [] });
  });
});
