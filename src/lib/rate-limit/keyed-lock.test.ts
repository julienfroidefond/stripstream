import { describe, expect, it } from "vitest";

import { KeyedLock } from "./keyed-lock";

describe("KeyedLock", () => {
  it("runs tasks of one key one after the other, even when one fails", async () => {
    const lock = new KeyedLock();
    const order: string[] = [];
    let active = 0;
    let maxActive = 0;

    const task = (name: string, fail = false) =>
      lock.run("alice", async () => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await new Promise((resolve) => setTimeout(resolve, 5));
        order.push(name);
        active -= 1;
        if (fail) throw new Error(name);
      });

    const results = await Promise.allSettled([task("a"), task("b", true), task("c")]);

    expect(order).toEqual(["a", "b", "c"]);
    expect(maxActive).toBe(1);
    expect(results.map((result) => result.status)).toEqual(["fulfilled", "rejected", "fulfilled"]);
  });

  it("does not make different keys wait for each other", async () => {
    const lock = new KeyedLock();
    let releaseAlice!: () => void;
    const alice = lock.run("alice", () => new Promise<void>((resolve) => (releaseAlice = resolve)));

    await expect(lock.run("bob", async () => "bob")).resolves.toBe("bob");
    releaseAlice();
    await alice;
  });
});
