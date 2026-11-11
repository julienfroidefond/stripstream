import { afterEach, describe, expect, it, vi } from "vitest";

import { requestDeduplicationService } from "./request-deduplication.service";

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });

  return { promise, resolve, reject };
}

afterEach(() => {
  requestDeduplicationService.clear();
  vi.useRealTimers();
});

describe("requestDeduplicationService", () => {
  it("shares one in-flight request between concurrent callers", async () => {
    const gate = deferred<string>();
    const fetcher = vi.fn(() => gate.promise);

    const first = requestDeduplicationService.deduplicate("cover:1", fetcher);
    const second = requestDeduplicationService.deduplicate("cover:1", fetcher);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(requestDeduplicationService.getPendingCount()).toBe(1);

    gate.resolve("image");

    await expect(first).resolves.toBe("image");
    await expect(second).resolves.toBe("image");
    expect(requestDeduplicationService.getPendingCount()).toBe(0);
  });

  it("keeps different keys independent", async () => {
    const gateA = deferred<string>();
    const gateB = deferred<string>();
    const fetcherA = vi.fn(() => gateA.promise);
    const fetcherB = vi.fn(() => gateB.promise);

    const first = requestDeduplicationService.deduplicate("a", fetcherA);
    const second = requestDeduplicationService.deduplicate("b", fetcherB);

    expect(fetcherA).toHaveBeenCalledTimes(1);
    expect(fetcherB).toHaveBeenCalledTimes(1);
    expect(requestDeduplicationService.getPendingCount()).toBe(2);

    gateA.resolve("A");
    gateB.resolve("B");

    await expect(first).resolves.toBe("A");
    await expect(second).resolves.toBe("B");
    expect(requestDeduplicationService.getPendingCount()).toBe(0);
  });

  it("cleans the entry after a failure so the next call retries", async () => {
    const fetcher = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("upstream down"))
      .mockResolvedValueOnce("recovered");

    await expect(requestDeduplicationService.deduplicate("cover:2", fetcher)).rejects.toThrow(
      "upstream down"
    );
    expect(requestDeduplicationService.getPendingCount()).toBe(0);

    await expect(requestDeduplicationService.deduplicate("cover:2", fetcher)).resolves.toBe(
      "recovered"
    );
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("forgets an entry once its safety TTL expires", async () => {
    vi.useFakeTimers();

    const gate = deferred<string>();
    const fetcher = vi.fn(() => gate.promise);

    const request = requestDeduplicationService.deduplicate("cover:3", fetcher, 1_000);
    expect(requestDeduplicationService.getPendingCount()).toBe(1);

    vi.advanceTimersByTime(1_000);
    expect(requestDeduplicationService.getPendingCount()).toBe(0);

    gate.resolve("late result");
    await expect(request).resolves.toBe("late result");
  });

  it("does not let a stale request delete a newer one with the same key", async () => {
    vi.useFakeTimers();

    const staleGate = deferred<string>();
    const freshGate = deferred<string>();

    const stale = requestDeduplicationService.deduplicate(
      "cover:4",
      () => staleGate.promise,
      1_000
    );
    vi.advanceTimersByTime(1_000);

    const fresh = requestDeduplicationService.deduplicate(
      "cover:4",
      () => freshGate.promise,
      10_000
    );
    expect(requestDeduplicationService.getPendingCount()).toBe(1);

    staleGate.resolve("stale");
    await expect(stale).resolves.toBe("stale");
    expect(requestDeduplicationService.getPendingCount()).toBe(1);

    freshGate.resolve("fresh");
    await expect(fresh).resolves.toBe("fresh");
    expect(requestDeduplicationService.getPendingCount()).toBe(0);
  });
});
