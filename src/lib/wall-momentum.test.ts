import { describe, expect, it } from "vitest";

import {
  MOMENTUM_FRAME_MS,
  MOMENTUM_STOP,
  capMomentum,
  decayMomentum,
  isMomentumDying,
  signedVelocity,
} from "./wall-momentum";

describe("signedVelocity", () => {
  it("follows the direction of the last delta", () => {
    expect(signedVelocity([0.5, 0.4], [-1, 1], [-40, 18])).toEqual([
      -0.5, 0.4,
    ]);
  });

  it("keeps both axes independent", () => {
    expect(signedVelocity([0.9, 0.2], [1, -1], [12, -6])).toEqual([0.9, -0.2]);
  });

  it("falls back to the movement sign when the last delta is null", () => {
    expect(signedVelocity([0.5, 0.4], [0, 0], [-10, 4])).toEqual([
      -0.5, 0.4,
    ]);
  });

  it("cancels a velocity with no direction at all", () => {
    expect(signedVelocity([0.5, 0.4], [0, 0], [0, 0])).toEqual([0, 0]);
  });
});

describe("decayMomentum", () => {
  it("slows the wall down as time passes", () => {
    const first = decayMomentum(1, 16);
    const second = decayMomentum(first, 16);
    expect(first).toBeLessThan(1);
    expect(second).toBeLessThan(first);
  });

  it("is independent of the frame rate", () => {
    const atOnce = decayMomentum(1, 32);
    const bySteps = decayMomentum(decayMomentum(1, 16), 16);
    expect(atOnce).toBeCloseTo(bySteps, 12);
  });

  it("keeps the sign of the velocity", () => {
    expect(decayMomentum(-1, MOMENTUM_FRAME_MS)).toBeLessThan(0);
  });

  it("does not move for a zero or negative elapsed time", () => {
    expect(decayMomentum(1, 0)).toBe(1);
    expect(decayMomentum(1, -8)).toBe(1);
  });

  it("is negligible after a second", () => {
    expect(Math.abs(decayMomentum(1, 1000))).toBeLessThan(0.05);
  });
});

describe("capMomentum", () => {
  it("keeps reasonable velocities untouched", () => {
    expect(capMomentum(0.8, -0.4, 2.6)).toEqual([0.8, -0.4]);
  });

  it("caps the magnitude without changing the direction", () => {
    const [vx, vy] = capMomentum(30, -40, 2.5);
    expect(Math.hypot(vx, vy)).toBeCloseTo(2.5, 12);
    expect(vx).toBeGreaterThan(0);
    expect(vy).toBeLessThan(0);
  });

  it("handles a null velocity", () => {
    expect(capMomentum(0, 0)).toEqual([0, 0]);
  });

  it("discards a non-finite velocity", () => {
    expect(capMomentum(Number.POSITIVE_INFINITY, 0)).toEqual([0, 0]);
    expect(capMomentum(Number.NaN, 1)).toEqual([0, 0]);
  });
});

describe("isMomentumDying", () => {
  it("stops below the threshold", () => {
    expect(isMomentumDying(MOMENTUM_STOP / 2, 0)).toBe(true);
  });

  it("keeps going above the threshold", () => {
    expect(isMomentumDying(MOMENTUM_STOP * 2, MOMENTUM_STOP * 2)).toBe(false);
  });
});
