import { afterEach, describe, expect, it, vi } from "vitest";

import { checkRateLimit } from "./rate-limit";

// Buckets persist for the lifetime of the module, so every test uses a fresh key.
let keyCounter = 0;
const nextKey = () => `rate-limit-test-${keyCounter++}`;
const OPTIONS = { limit: 3, windowMs: 1000 };

describe("checkRateLimit", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows the first call and reports the remaining budget", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));

    expect(checkRateLimit(nextKey(), OPTIONS)).toEqual({
      allowed: true,
      remaining: 2,
      resetMs: 1000,
    });
  });

  it("decrements the remaining budget on each call", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const key = nextKey();

    checkRateLimit(key, OPTIONS);
    checkRateLimit(key, OPTIONS);
    const third = checkRateLimit(key, OPTIONS);

    expect(third.allowed).toBe(true);
    expect(third.remaining).toBe(0);
  });

  it("blocks once the limit is reached", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const key = nextKey();
    const options = { limit: 2, windowMs: 1000 };

    checkRateLimit(key, options);
    checkRateLimit(key, options);
    const blocked = checkRateLimit(key, options);

    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("refills after the window elapses", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const key = nextKey();
    const options = { limit: 1, windowMs: 1000 };

    expect(checkRateLimit(key, options).allowed).toBe(true);
    expect(checkRateLimit(key, options).allowed).toBe(false);

    vi.setSystemTime(new Date("2026-01-01T00:00:01.000Z"));
    expect(checkRateLimit(key, options).allowed).toBe(true);
  });

  it("counts down the reset time inside the window", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const key = nextKey();
    const options = { limit: 1, windowMs: 1000 };

    checkRateLimit(key, options); // consumes the whole budget
    vi.setSystemTime(new Date("2026-01-01T00:00:00.400Z"));
    const blocked = checkRateLimit(key, options);

    expect(blocked.allowed).toBe(false);
    expect(blocked.resetMs).toBe(600);
  });

  it("tracks each key independently", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const options = { limit: 1, windowMs: 1000 };
    const keyA = nextKey();
    const keyB = nextKey();

    expect(checkRateLimit(keyA, options).allowed).toBe(true);
    expect(checkRateLimit(keyA, options).allowed).toBe(false);
    expect(checkRateLimit(keyB, options).allowed).toBe(true);
  });
});
