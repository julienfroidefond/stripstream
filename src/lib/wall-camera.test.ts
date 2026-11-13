import { describe, expect, it } from "vitest";

import {
  MAX_WALL_ZOOM,
  MIN_WALL_ZOOM,
  WALL_FOCUS_DURATION,
  WALL_CAMERA_SYNC_DISTANCE,
  WALL_WHEEL_LINE,
  WALL_WHEEL_ZOOM,
  clampWallZoom,
  fitWallCamera,
  wallViewRect,
  wallWheelIntent,
  initialWallCamera,
  initialWallScale,
  resizeWallCamera,
  sheetMaxHeightFor,
  shouldSyncWallCamera,
  wallCameraCenteredOn,
  wallFocusCamera,
  wallFocusRect,
  wallWorldCenter,
  wallZoomCamera,
} from "./wall-camera";
import {
  WALL_CELL_WIDTH,
  WALL_PATCH_HEIGHT,
  WALL_PATCH_WIDTH,
  WALL_TILE_ASPECT,
} from "./wall-layout";

const VIEWPORT = { width: 1000, height: 700 };
const MIN_SCALE = 0.3;

describe("initialWallScale", () => {
  it("shows more columns as the stage widens", () => {
    const columns = (width: number) =>
      width /
      (WALL_CELL_WIDTH *
        initialWallScale({ width, height: 700 }, MIN_SCALE));

    expect(columns(600)).toBeCloseTo(4.2, 6);
    expect(columns(900)).toBeCloseTo(6.4, 6);
    expect(columns(1200)).toBeCloseTo(8.4, 6);
  });

  it("never goes below the legal minimum or above 1.12", () => {
    expect(initialWallScale({ width: 320, height: 700 }, 0.9)).toBe(0.9);
    expect(initialWallScale({ width: 4000, height: 700 }, MIN_SCALE)).toBe(1.12);
  });

  it("stays neutral before the stage has been measured", () => {
    expect(initialWallScale({ width: 0, height: 0 }, MIN_SCALE)).toBe(1);
  });
});

describe("initialWallCamera", () => {
  it("centres the repeated pattern at the opening scale", () => {
    const camera = initialWallCamera(VIEWPORT, MIN_SCALE);
    const scale = initialWallScale(VIEWPORT, MIN_SCALE);

    expect(camera.scale).toBe(scale);
    expect(camera.x + (WALL_PATCH_WIDTH / 2) * scale).toBe(VIEWPORT.width / 2);
    expect(camera.y + (WALL_PATCH_HEIGHT / 2) * scale).toBe(VIEWPORT.height / 2);
  });
});

describe("wallFocusRect", () => {
  it("centres an anchor poster and keeps the cover aspect ratio", () => {
    const rect = wallFocusRect(VIEWPORT, "anchor");

    expect(rect).not.toBeNull();
    expect(Math.abs(rect!.left + rect!.width / 2 - VIEWPORT.width / 2)).toBeLessThanOrEqual(1);
    expect(Math.abs(rect!.top + rect!.height / 2 - VIEWPORT.height / 2)).toBeLessThanOrEqual(1);
    expect(rect!.width / rect!.height).toBeCloseTo(WALL_TILE_ASPECT, 1);
  });

  it("lifts the poster above a mobile sheet", () => {
    const sheet = sheetMaxHeightFor({ width: 390, height: 844 });
    const rect = wallFocusRect({ width: 390, height: 844 }, "sheet", sheet);

    expect(rect).not.toBeNull();
    expect(rect!.top + rect!.height).toBeLessThan(844 - sheet);
    expect(rect!.width / rect!.height).toBeCloseTo(2 / 3, 1);
  });

  it("refuses an unmeasured stage", () => {
    expect(wallFocusRect({ width: 0, height: 700 }, "anchor")).toBeNull();
  });
});

describe("wallFocusCamera", () => {
  const tile = { x: 500, y: 300, width: 200, height: 300 };
  const target = { left: 300, top: 100, width: 240, height: 360 };

  it("puts the clicked tile exactly inside the focus rect", () => {
    const camera = wallFocusCamera(tile, target, (scale) =>
      Math.min(2.4, Math.max(0.28, scale))
    );

    expect(camera.scale).toBeCloseTo(1.2, 6);
    expect(camera.x + (tile.x + tile.width / 2) * camera.scale).toBeCloseTo(
      target.left + target.width / 2,
      6
    );
    expect(camera.y + (tile.y + tile.height / 2) * camera.scale).toBeCloseTo(
      target.top + target.height / 2,
      6
    );
  });

  it("uses the caller's zoom clamp", () => {
    const camera = wallFocusCamera(tile, target, () => 2.4);
    expect(camera.scale).toBe(2.4);
  });
});

describe("wallZoomCamera", () => {
  it("keeps the world point under the cursor while zooming", () => {
    const camera = { x: 40, y: 20, scale: 1.2 };
    const focus = { x: 220, y: 180 };
    const before = {
      x: (focus.x - camera.x) / camera.scale,
      y: (focus.y - camera.y) / camera.scale,
    };
    const zoomed = wallZoomCamera(camera, focus, 2.1);

    expect((focus.x - zoomed.x) / zoomed.scale).toBeCloseTo(before.x, 6);
    expect((focus.y - zoomed.y) / zoomed.scale).toBeCloseTo(before.y, 6);
    expect(zoomed.scale).toBe(2.1);
  });
});

describe("resizeWallCamera", () => {
  it("keeps the point under the new stage centre while clamping the scale", () => {
    const camera = { x: -120, y: -80, scale: 1.4 };
    const resized = resizeWallCamera(camera, { width: 700, height: 500 }, 0.9);
    const before = wallWorldCenter(camera, { width: 700, height: 500 });
    const after = wallWorldCenter(resized, { width: 700, height: 500 });

    expect(after.x).toBeCloseTo(before.x, 6);
    expect(after.y).toBeCloseTo(before.y, 6);
    expect(resized.scale).toBe(0.9);
  });

  it("falls back to the pattern centre when the camera has no scale", () => {
    const resized = resizeWallCamera(
      { x: 0, y: 0, scale: 0 },
      VIEWPORT,
      MIN_SCALE
    );

    expect(resized.x + (WALL_PATCH_WIDTH / 2) * MIN_SCALE).toBeCloseTo(
      VIEWPORT.width / 2,
      6
    );
  });
});

describe("fitWallCamera", () => {
  it("uses the minimum scale without changing the world centre", () => {
    const camera = { x: -30, y: 50, scale: 1.7 };
    const fitted = fitWallCamera(camera, VIEWPORT, MIN_SCALE);

    expect(fitted.scale).toBe(MIN_SCALE);
    const before = wallWorldCenter(camera, VIEWPORT);
    const after = wallWorldCenter(fitted, VIEWPORT);
    expect(after.x).toBeCloseTo(before.x, 6);
    expect(after.y).toBeCloseTo(before.y, 6);
  });
});

describe("wallCameraCenteredOn", () => {
  it("places the given world point at the viewport centre", () => {
    const camera = wallCameraCenteredOn(VIEWPORT, { x: 150, y: 90 }, 0.8);

    expect(camera.x + 150 * 0.8).toBe(VIEWPORT.width / 2);
    expect(camera.y + 90 * 0.8).toBe(VIEWPORT.height / 2);
  });
});

describe("shouldSyncWallCamera", () => {
  it("ignores sub-threshold moves and zooms", () => {
    const previous = { x: 0, y: 0, scale: 1 };
    expect(
      shouldSyncWallCamera(previous, {
        x: WALL_CAMERA_SYNC_DISTANCE - 1,
        y: 0,
        scale: 1,
      })
    ).toBe(false);
    expect(
      shouldSyncWallCamera(previous, { x: 0, y: 0, scale: 1.005 })
    ).toBe(false);
  });

  it("wakes React when the move or zoom becomes visible", () => {
    const previous = { x: 0, y: 0, scale: 1 };
    expect(
      shouldSyncWallCamera(previous, {
        x: WALL_CAMERA_SYNC_DISTANCE,
        y: 0,
        scale: 1,
      })
    ).toBe(true);
    expect(
      shouldSyncWallCamera(previous, { x: 0, y: 0, scale: 1.02 })
    ).toBe(true);
  });

  it("can be forced by a layout or selection change", () => {
    expect(
      shouldSyncWallCamera({ x: 0, y: 0, scale: 1 }, { x: 0, y: 0, scale: 1 }, true)
    ).toBe(true);
  });
});

describe("camera timing", () => {
  it("keeps the focus flight short enough to feel immediate", () => {
    expect(WALL_FOCUS_DURATION).toBeGreaterThan(0.5);
    expect(WALL_FOCUS_DURATION).toBeLessThan(1);
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

describe("wallWheelIntent", () => {
  it("zooms multiplicatively with ctrl/meta, in for a negative delta", () => {
    const intent = wallWheelIntent({
      deltaX: 0,
      deltaY: -100,
      deltaMode: 0,
      zoom: true,
    });
    expect(intent).toEqual({
      kind: "zoom",
      factor: Math.exp(100 * WALL_WHEEL_ZOOM),
    });
    expect(intent.kind === "zoom" && intent.factor).toBeGreaterThan(1);
  });

  it("pans opposite to the wheel delta, in pixels", () => {
    expect(
      wallWheelIntent({ deltaX: 10, deltaY: 20, deltaMode: 0, zoom: false })
    ).toEqual({ kind: "pan", dx: -10, dy: -20 });
  });

  it("converts line-based deltas to pixels", () => {
    expect(
      wallWheelIntent({ deltaX: 1, deltaY: -2, deltaMode: 1, zoom: false })
    ).toEqual({ kind: "pan", dx: -WALL_WHEEL_LINE, dy: 2 * WALL_WHEEL_LINE });
  });
});

describe("wallViewRect", () => {
  it("projects the stage onto the wall", () => {
    expect(
      wallViewRect({ x: -200, y: 100, scale: 2 }, { width: 1000, height: 700 })
    ).toEqual({ left: 100, top: -50, right: 600, bottom: 300 });
  });

  it("guards against a degenerate scale", () => {
    expect(
      wallViewRect({ x: -10, y: -20, scale: 0 }, { width: 100, height: 50 })
    ).toEqual({ left: 10, top: 20, right: 110, bottom: 70 });
  });
});
