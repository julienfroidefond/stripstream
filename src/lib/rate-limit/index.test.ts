import { afterEach, describe, expect, it, vi } from "vitest";

import {
  checkRateLimit,
  createMemoryRateLimitStore,
  createRateLimiter,
  peekRateLimit,
} from "./index";

// Le limiter partagé survit à la durée du module : chaque test prend ses clés.
let keyCounter = 0;
const nextKey = () => `rate-limit-test-${keyCounter++}`;
const OPTIONS = { limit: 3, windowMs: 1000 };

describe("createRateLimiter", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("decrements the remaining budget on each call", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const limit = createRateLimiter(createMemoryRateLimitStore());
    const key = nextKey();

    expect(await limit(key, OPTIONS)).toEqual({
      allowed: true,
      remaining: 2,
      resetMs: 1000,
    });
    expect((await limit(key, OPTIONS)).remaining).toBe(1);
    expect((await limit(key, OPTIONS)).remaining).toBe(0);
  });

  it("blocks once the limit is reached", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const limit = createRateLimiter(createMemoryRateLimitStore());
    const key = nextKey();
    const options = { limit: 2, windowMs: 1000 };

    await limit(key, options);
    await limit(key, options);
    const blocked = await limit(key, options);

    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("refills after the window elapses", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const limit = createRateLimiter(createMemoryRateLimitStore());
    const key = nextKey();
    const options = { limit: 1, windowMs: 1000 };

    expect((await limit(key, options)).allowed).toBe(true);
    expect((await limit(key, options)).allowed).toBe(false);

    vi.setSystemTime(new Date("2026-01-01T00:00:01.000Z"));
    expect((await limit(key, options)).allowed).toBe(true);
  });

  it("counts down the reset time inside the window", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const limit = createRateLimiter(createMemoryRateLimitStore());
    const key = nextKey();
    const options = { limit: 1, windowMs: 1000 };

    await limit(key, options);
    vi.setSystemTime(new Date("2026-01-01T00:00:00.400Z"));

    expect(await limit(key, options)).toEqual({
      allowed: false,
      remaining: 0,
      resetMs: 600,
    });
  });

  it("tracks each key independently", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const limit = createRateLimiter(createMemoryRateLimitStore());
    const options = { limit: 1, windowMs: 1000 };
    const keyA = nextKey();
    const keyB = nextKey();

    expect((await limit(keyA, options)).allowed).toBe(true);
    expect((await limit(keyA, options)).allowed).toBe(false);
    expect((await limit(keyB, options)).allowed).toBe(true);
  });

  it("passes one clock and the window to the store", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const hit = vi.fn(async () => ({ count: 2, windowStart: Date.now() - 250 }));
    const limit = createRateLimiter({ hit });
    const key = nextKey();

    const result = await limit(key, OPTIONS);

    expect(hit).toHaveBeenCalledWith(key, Date.now(), OPTIONS.windowMs);
    expect(result).toEqual({ allowed: true, remaining: 1, resetMs: 750 });
  });
});

describe("checkRateLimit", () => {
  it("uses the local store under vitest, without touching the database", async () => {
    const options = { limit: 1, windowMs: 1000 };
    const key = nextKey();

    expect((await checkRateLimit(key, options)).allowed).toBe(true);
    expect((await checkRateLimit(key, options)).allowed).toBe(false);
  });
});

describe("peekRateLimit", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("reports the next decision without consuming the budget", async () => {
    const options = { limit: 2, windowMs: 1000 };
    const key = nextKey();

    expect(await peekRateLimit(key, options)).toMatchObject({ allowed: true, remaining: 2 });
    expect(await peekRateLimit(key, options)).toMatchObject({ allowed: true, remaining: 2 });

    await checkRateLimit(key, options);
    expect(await peekRateLimit(key, options)).toMatchObject({ allowed: true, remaining: 1 });

    await checkRateLimit(key, options);
    expect(await peekRateLimit(key, options)).toMatchObject({ allowed: false, remaining: 0 });
  });

  it("reopens once the window has elapsed", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const options = { limit: 1, windowMs: 1000 };
    const key = nextKey();

    await checkRateLimit(key, options);
    expect((await peekRateLimit(key, options)).allowed).toBe(false);

    vi.setSystemTime(new Date("2026-01-01T00:00:01.000Z"));
    expect((await peekRateLimit(key, options)).allowed).toBe(true);
  });
});
