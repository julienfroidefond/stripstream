import { describe, expect, it } from "vitest";

import { ImageRequestLimiter } from "./image-request-limiter";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe("ImageRequestLimiter", () => {
  it("keeps the number of in-flight tasks under the limit", async () => {
    const limiter = new ImageRequestLimiter(2);
    const gates = Array.from({ length: 5 }, () => deferred());
    let active = 0;
    let peak = 0;

    const runs = gates.map((gate) =>
      limiter.run(async () => {
        active += 1;
        peak = Math.max(peak, active);
        await gate.promise;
        active -= 1;
      })
    );

    await Promise.resolve();
    expect(limiter.activeCount).toBe(2);
    expect(limiter.waitingCount).toBe(3);

    for (const gate of gates) {
      gate.resolve();
      await Promise.resolve();
      await Promise.resolve();
    }

    await Promise.all(runs);
    expect(peak).toBe(2);
    expect(limiter.activeCount).toBe(0);
    expect(limiter.waitingCount).toBe(0);
  });

  it("releases its slot when the task throws", async () => {
    const limiter = new ImageRequestLimiter(1);

    await expect(
      limiter.run(async () => {
        throw new Error("provider down");
      })
    ).rejects.toThrow("provider down");

    await expect(limiter.run(async () => "ok")).resolves.toBe("ok");
    expect(limiter.activeCount).toBe(0);
  });
});
