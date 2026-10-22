import { describe, expect, it } from "vitest";

import {
  MAX_WALL_ZOOM,
  MIN_WALL_ZOOM,
  PINCH_CLICK_GUARD_MS,
  beginWallPinch,
  beginWallPress,
  clampWallZoom,
  clearWallClickGuard,
  createWallClickGuardState,
  endWallPinch,
  isWallClickGuarded,
  pinchScale,
  releaseWallTouch,
} from "./wall-pinch";

describe("pinchScale", () => {
  it("multiplies the scale at pinch start by the finger ratio", () => {
    expect(pinchScale(0.8, 1.5)).toBeCloseTo(1.2);
  });

  it("keeps the scale unchanged when the fingers do not move", () => {
    expect(pinchScale(0.8, 1)).toBe(0.8);
  });

  it("ignores a zero or non-finite ratio", () => {
    expect(pinchScale(1, 0)).toBe(1);
    expect(pinchScale(1, Number.NaN)).toBe(1);
    expect(pinchScale(1, Number.POSITIVE_INFINITY)).toBe(1);
  });
});

describe("clampWallZoom", () => {
  it("pins the issue's zoom contract", () => {
    expect(MIN_WALL_ZOOM).toBe(0.28);
    expect(MAX_WALL_ZOOM).toBe(2.4);
  });

  it("clamps to the wall bounds", () => {
    expect(clampWallZoom(0.1, MIN_WALL_ZOOM)).toBe(MIN_WALL_ZOOM);
    expect(clampWallZoom(10, MIN_WALL_ZOOM)).toBe(MAX_WALL_ZOOM);
  });

  it("respects a higher dynamic floor", () => {
    expect(clampWallZoom(0.4, 0.6)).toBe(0.6);
  });

  it("keeps values already inside the bounds", () => {
    expect(clampWallZoom(1.2, MIN_WALL_ZOOM)).toBe(1.2);
  });
});

describe("WallClickGuardState", () => {
  it("opens the guard when the pinch starts and closes it after the window", () => {
    const guard = createWallClickGuardState();
    beginWallPinch(guard, 1000);

    expect(guard.pinchHappened).toBe(true);
    expect(isWallClickGuarded(guard, 1000)).toBe(true);
    expect(isWallClickGuarded(guard, 1000 + PINCH_CLICK_GUARD_MS)).toBe(false);
  });

  it("re-opens the guard when the pinch ends", () => {
    const guard = createWallClickGuardState();
    beginWallPinch(guard, 1000);
    endWallPinch(guard, 2000);

    expect(isWallClickGuarded(guard, 2000 + PINCH_CLICK_GUARD_MS - 1)).toBe(
      true
    );
  });

  it("re-opens the guard on the last finger, however late it lifts", () => {
    const guard = createWallClickGuardState();
    beginWallPinch(guard, 1000);

    releaseWallTouch(guard, 5000, 1);
    expect(isWallClickGuarded(guard, 5500)).toBe(false);

    releaseWallTouch(guard, 5000, 0);
    expect(isWallClickGuarded(guard, 5000 + PINCH_CLICK_GUARD_MS - 1)).toBe(
      true
    );
  });

  it("does not arm on a normal tap without a pinch", () => {
    const guard = createWallClickGuardState();
    releaseWallTouch(guard, 1000, 0);

    expect(isWallClickGuarded(guard, 1000)).toBe(false);
  });

  it("lets a tap after a pinch through because a new press resets the guard", () => {
    const guard = createWallClickGuardState();
    beginWallPinch(guard, 1000);
    endWallPinch(guard, 1000);
    releaseWallTouch(guard, 1000, 0);

    beginWallPress(guard);
    releaseWallTouch(guard, 2000, 0);

    expect(guard.pinchHappened).toBe(false);
    expect(isWallClickGuarded(guard, 2000)).toBe(false);
  });

  it("lets a keyboard activation through without forgetting the pinch", () => {
    const guard = createWallClickGuardState();
    beginWallPinch(guard, 1000);

    clearWallClickGuard(guard);

    expect(isWallClickGuarded(guard, 1000)).toBe(false);
    expect(guard.pinchHappened).toBe(true);
  });
});
