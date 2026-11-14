import { describe, expect, it, vi } from "vitest";
import { MotionNumber } from "./motion-value";

describe("MotionNumber", () => {
  it("notifies listeners on change only", () => {
    const value = new MotionNumber(1);
    const listener = vi.fn();
    value.on(listener);

    value.set(1);
    value.set(2);

    expect(value.get()).toBe(2);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(2);
  });

  it("stops notifying after unsubscribe", () => {
    const value = new MotionNumber(0);
    const listener = vi.fn();
    const unsubscribe = value.on(listener);

    unsubscribe();
    value.set(5);

    expect(listener).not.toHaveBeenCalled();
  });

  it("jumps to the target when the duration is zero", () => {
    const value = new MotionNumber(0);
    value.animateTo(10, { duration: 0 });

    expect(value.get()).toBe(10);
    expect(value.isAnimating()).toBe(false);
  });

  it("tracks and stops a running animation", () => {
    const value = new MotionNumber(0);
    value.animateTo(10, { duration: 1, ease: "none" });
    expect(value.isAnimating()).toBe(true);

    value.stop();

    expect(value.isAnimating()).toBe(false);
    expect(value.get()).toBeLessThan(10);
  });
});
