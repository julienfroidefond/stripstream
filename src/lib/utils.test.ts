import { afterEach, describe, expect, it, vi } from "vitest";

import { cn, debounce, formatDate } from "./utils";

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
