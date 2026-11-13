import { describe, expect, it } from "vitest";

import { advanceWindow, toRateLimitResult } from "./fixed-window";

const WINDOW_MS = 1000;
const OPTIONS = { limit: 3, windowMs: WINDOW_MS };

describe("advanceWindow", () => {
  it("opens a window on the first call", () => {
    expect(advanceWindow(null, 1000, WINDOW_MS)).toEqual({
      count: 1,
      windowStart: 1000,
    });
  });

  it("increments inside the window and keeps its start", () => {
    expect(advanceWindow({ count: 1, windowStart: 1000 }, 1400, WINDOW_MS)).toEqual({
      count: 2,
      windowStart: 1000,
    });
  });

  it("keeps counting past the quota without moving the window", () => {
    expect(advanceWindow({ count: 3, windowStart: 1000 }, 1100, WINDOW_MS)).toEqual({
      count: 4,
      windowStart: 1000,
    });
  });

  it("refills as soon as the window elapses", () => {
    expect(advanceWindow({ count: 9, windowStart: 1000 }, 2000, WINDOW_MS)).toEqual({
      count: 1,
      windowStart: 2000,
    });
  });
});

describe("toRateLimitResult", () => {
  it("reports the remaining budget of a fresh window", () => {
    expect(toRateLimitResult({ count: 1, windowStart: 1000 }, 1000, OPTIONS)).toEqual({
      allowed: true,
      remaining: 2,
      resetMs: 1000,
    });
  });

  it("counts down the reset time inside the window", () => {
    expect(toRateLimitResult({ count: 1, windowStart: 1000 }, 1600, OPTIONS)).toEqual({
      allowed: true,
      remaining: 2,
      resetMs: 400,
    });
  });

  it("allows the call that consumes the last slot", () => {
    expect(toRateLimitResult({ count: 3, windowStart: 1000 }, 1100, OPTIONS)).toEqual({
      allowed: true,
      remaining: 0,
      resetMs: 900,
    });
  });

  it("blocks the next one with no remaining budget", () => {
    expect(toRateLimitResult({ count: 4, windowStart: 1000 }, 1100, OPTIONS)).toEqual({
      allowed: false,
      remaining: 0,
      resetMs: 900,
    });
  });
});
