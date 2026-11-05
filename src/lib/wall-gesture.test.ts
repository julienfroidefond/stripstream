import { describe, expect, it } from "vitest";

import {
  WALL_TAP_SLOP,
  WALL_VELOCITY_MIN,
  WALL_VELOCITY_STALE_MS,
  WALL_VELOCITY_WINDOW_MS,
  pinchWallCamera,
  pushWallVelocitySample,
  startWallPinch,
  wallDistance,
  wallMidpoint,
  wallReleaseVelocity,
  type WallVelocitySample,
} from "./wall-gesture";

const clamp = (min: number, max: number) => (value: number) =>
  Math.min(max, Math.max(min, value));

describe("wallDistance / wallMidpoint", () => {
  it("measures the distance between two fingers", () => {
    expect(wallDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  it("returns the center of the two fingers", () => {
    expect(wallMidpoint({ x: 10, y: 20 }, { x: 30, y: 40 })).toEqual({
      x: 20,
      y: 30,
    });
  });
});

describe("startWallPinch", () => {
  it("captures the world point under the fingers", () => {
    const start = startWallPinch({ x: 100, y: 50, scale: 2 }, { x: 300, y: 250 });
    expect(start.scale).toBe(2);
    expect(start.worldX).toBe(100);
    expect(start.worldY).toBe(100);
  });

  it("survives a zero scale instead of dividing by zero", () => {
    const start = startWallPinch({ x: 0, y: 0, scale: 0 }, { x: 20, y: 10 });
    expect(start.scale).toBe(1);
    expect(start.worldX).toBe(20);
    expect(start.worldY).toBe(10);
  });
});

describe("pinchWallCamera", () => {
  const start = startWallPinch({ x: 0, y: 0, scale: 1 }, { x: 200, y: 100 });

  it("keeps the captured point under the fingers when they do not move", () => {
    const camera = pinchWallCamera(start, { x: 200, y: 100 }, 1.5, clamp(0.3, 2.4));
    expect(camera.scale).toBe(1.5);
    expect(camera.x).toBeCloseTo(200 - 200 * 1.5);
    expect(camera.y).toBeCloseTo(100 - 100 * 1.5);
  });

  it("pans with the center of the pinch", () => {
    const camera = pinchWallCamera(start, { x: 260, y: 140 }, 1, clamp(0.3, 2.4));
    expect(camera.scale).toBe(1);
    expect(camera.x).toBeCloseTo(60);
    expect(camera.y).toBeCloseTo(40);
  });

  it("clamps the zoom and keeps the anchor aligned", () => {
    const camera = pinchWallCamera(start, { x: 200, y: 100 }, 8, clamp(0.3, 2.4));
    expect(camera.scale).toBe(2.4);
    expect(camera.x).toBeCloseTo(200 - 200 * 2.4);
    expect(camera.y).toBeCloseTo(100 - 100 * 2.4);
  });

  it("ignores an invalid ratio", () => {
    const camera = pinchWallCamera(
      start,
      { x: 200, y: 100 },
      Number.NaN,
      clamp(0.3, 2.4)
    );
    expect(camera.scale).toBe(1);
    expect(camera.x).toBeCloseTo(0);
    expect(camera.y).toBeCloseTo(0);
  });
});

describe("pushWallVelocitySample", () => {
  it("drops samples that left the velocity window", () => {
    const samples: WallVelocitySample[] = [];
    pushWallVelocitySample(samples, { x: 0, y: 0, t: 0 });
    pushWallVelocitySample(samples, { x: 10, y: 0, t: 50 });
    pushWallVelocitySample(samples, { x: 20, y: 0, t: 220 });

    expect(samples[0].t).toBeGreaterThanOrEqual(220 - WALL_VELOCITY_WINDOW_MS);
    expect(samples[samples.length - 1].t).toBe(220);
  });

  it("always keeps at least one sample", () => {
    const samples: WallVelocitySample[] = [{ x: 0, y: 0, t: 0 }];
    pushWallVelocitySample(samples, { x: 10, y: 0, t: 1000 });
    expect(samples).toHaveLength(1);
    expect(samples[0].t).toBe(1000);
  });
});

describe("wallReleaseVelocity", () => {
  const samples: WallVelocitySample[] = [
    { x: 0, y: 0, t: 1000 },
    { x: 60, y: 30, t: 1100 },
  ];

  it("returns the signed velocity over the window", () => {
    expect(wallReleaseVelocity(samples, 1100)).toEqual([0.6, 0.3]);
  });

  it("preserves the direction of a flick", () => {
    const leftward: WallVelocitySample[] = [
      { x: 100, y: 100, t: 1000 },
      { x: 20, y: 130, t: 1080 },
    ];
    expect(wallReleaseVelocity(leftward, 1080)).toEqual([-1, 0.375]);
  });

  it("stays silent when the finger stopped before lifting", () => {
    expect(wallReleaseVelocity(samples, 1100 + WALL_VELOCITY_STALE_MS + 1)).toBe(
      null
    );
  });

  it("stays silent on a single point", () => {
    expect(wallReleaseVelocity([{ x: 0, y: 0, t: 0 }], 0)).toBeNull();
  });

  it("stays silent for an imperceptible speed", () => {
    expect(
      wallReleaseVelocity(
        [
          { x: 0, y: 0, t: 1000 },
          { x: WALL_VELOCITY_MIN / 2, y: 0, t: 1100 },
        ],
        1100
      )
    ).toBeNull();
  });

  it("never returns NaN", () => {
    expect(
      wallReleaseVelocity(
        [
          { x: 0, y: 0, t: 1000 },
          { x: Number.NaN, y: 0, t: 1100 },
        ],
        1100
      )
    ).toBeNull();
  });
});

describe("WALL_TAP_SLOP", () => {
  it("keeps a small jitter inside the tap", () => {
    expect(WALL_TAP_SLOP).toBeGreaterThan(0);
    expect(WALL_TAP_SLOP).toBeLessThanOrEqual(12);
  });
});
