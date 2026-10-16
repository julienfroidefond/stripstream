import { afterEach, describe, expect, it, vi } from "vitest";

import { cn, debounce, formatDate, runWithConcurrency } from "./utils";

describe("cn", () => {
  it("merges class names and resolves tailwind conflicts", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("text-sm", "font-bold")).toBe("text-sm font-bold");
  });

  it("drops falsy values", () => {
    expect(cn("base", false && "nope", undefined, null, "end")).toBe("base end");
  });
});

describe("formatDate", () => {
  it("formats a date in fr-FR dd/mm/yyyy", () => {
    expect(formatDate(new Date(2026, 0, 2, 12, 0, 0))).toBe("02/01/2026");
  });

  it("accepts a date string", () => {
    expect(formatDate("2026-12-25T12:00:00.000Z")).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });
});

describe("debounce", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("invokes the callback once after the wait", () => {
    vi.useFakeTimers();
    const fn = vi.fn<() => void>();
    const debounced = debounce(fn, 200);

    debounced();
    debounced();
    debounced();

    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("passes the latest arguments through", () => {
    vi.useFakeTimers();
    const fn = vi.fn<(value: string) => void>();
    const debounced = debounce(fn, 100);

    debounced("a");
    debounced("b");
    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledWith("b");
  });

  it("resets the timer on each call", () => {
    vi.useFakeTimers();
    const fn = vi.fn<() => void>();
    const debounced = debounce(fn, 100);

    debounced();
    vi.advanceTimersByTime(80);
    debounced();
    vi.advanceTimersByTime(80);

    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(20);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe("runWithConcurrency", () => {
  it("processes every item and counts successes", async () => {
    const seen: number[] = [];
    const result = await runWithConcurrency([1, 2, 3, 4, 5], 2, async (item) => {
      seen.push(item);
    });

    expect(result).toEqual({ succeeded: 5, failed: 0 });
    expect(seen.sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
  });

  it("counts failures without rejecting", async () => {
    const result = await runWithConcurrency([1, 2, 3, 4], 2, async (item) => {
      if (item % 2 === 0) throw new Error("boom");
    });

    expect(result).toEqual({ succeeded: 2, failed: 2 });
  });

  it("never exceeds the concurrency limit", async () => {
    let active = 0;
    let peak = 0;
    await runWithConcurrency(
      Array.from({ length: 10 }, (_, i) => i),
      3,
      async () => {
        active += 1;
        peak = Math.max(peak, active);
        await new Promise((resolve) => setTimeout(resolve, 1));
        active -= 1;
      }
    );

    expect(peak).toBeLessThanOrEqual(3);
    expect(peak).toBeGreaterThan(1);
  });

  it("returns zeroes for an empty list", async () => {
    await expect(runWithConcurrency([], 4, async () => undefined)).resolves.toEqual({
      succeeded: 0,
      failed: 0,
    });
  });
});
