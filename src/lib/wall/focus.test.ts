import { describe, expect, it } from "vitest";

import { sheetMaxHeightFor, wallFocusRect } from "./camera";
import {
  WALL_PANEL_GAP,
  WALL_PANEL_MAX_WIDTH,
  WALL_PANEL_MIN_WIDTH,
  chooseWallFocusMode,
  planWallFocus,
  wallPlaqueAnchor,
} from "./focus";

describe("chooseWallFocusMode", () => {
  it("anchors the plaque on a large stage with a fine pointer", () => {
    expect(chooseWallFocusMode({ width: 1280, height: 800 }, true)).toBe(
      "anchor"
    );
    expect(chooseWallFocusMode({ width: 900, height: 460 }, true)).toBe(
      "anchor"
    );
  });

  it("falls back to the sheet for touch, narrow or short stages", () => {
    expect(chooseWallFocusMode({ width: 1280, height: 800 }, false)).toBe(
      "sheet"
    );
    expect(chooseWallFocusMode({ width: 899, height: 800 }, true)).toBe("sheet");
    expect(chooseWallFocusMode({ width: 1280, height: 459 }, true)).toBe(
      "sheet"
    );
  });
});

describe("wallPlaqueAnchor", () => {
  const stage = { width: 1280, height: 800 };

  it("puts the plaque on the roomier side, a gap away from the cover", () => {
    const right = wallPlaqueAnchor(stage, {
      left: 300,
      top: 200,
      width: 200,
      height: 300,
    });
    expect(right.side).toBe("right");
    expect(right.left).toBe(500 + WALL_PANEL_GAP);
    expect(right.width).toBe(WALL_PANEL_MAX_WIDTH);

    const left = wallPlaqueAnchor(stage, {
      left: 900,
      top: 200,
      width: 200,
      height: 300,
    });
    expect(left.side).toBe("left");
    expect(left.left).toBe(900 - WALL_PANEL_MAX_WIDTH - WALL_PANEL_GAP);
  });

  it("keeps the plaque inside the stage", () => {
    const anchor = wallPlaqueAnchor(stage, {
      left: 1100,
      top: 0,
      width: 100,
      height: 150,
    });
    expect(anchor.left).toBeGreaterThanOrEqual(16);
    expect(anchor.left + anchor.width).toBeLessThanOrEqual(stage.width - 16);
  });

  it("scales the panel width between its bounds", () => {
    const narrow = wallPlaqueAnchor(
      { width: 900, height: 800 },
      { left: 100, top: 200, width: 200, height: 300 }
    );
    expect(narrow.width).toBe(WALL_PANEL_MIN_WIDTH);

    const mid = wallPlaqueAnchor(
      { width: 1100, height: 800 },
      { left: 100, top: 200, width: 200, height: 300 }
    );
    expect(mid.width).toBeCloseTo(330, 6);
  });

  it("follows the cover centre vertically, clamped to the stage", () => {
    const centred = wallPlaqueAnchor(stage, {
      left: 300,
      top: 200,
      width: 200,
      height: 300,
    });
    expect(centred.top).toBe(350);

    const high = wallPlaqueAnchor(stage, {
      left: 300,
      top: -400,
      width: 200,
      height: 300,
    });
    // Demi-hauteur bornée à 230, plus 14 px de marge.
    expect(high.top).toBe(244);
  });

  it("centres the plaque when the stage is too short to clamp", () => {
    const anchor = wallPlaqueAnchor(
      { width: 1280, height: 200 },
      { left: 300, top: 0, width: 100, height: 150 }
    );
    expect(anchor.top).toBe(100);
  });
});

describe("planWallFocus", () => {
  it("plans an anchored focus with the shared focus rectangle", () => {
    const stage = { width: 1280, height: 800 };
    const plan = planWallFocus(stage, true);

    expect(plan?.mode).toBe("anchor");
    expect(plan?.target).toEqual(wallFocusRect(stage, "anchor"));
    expect(plan?.anchor).toEqual(
      wallPlaqueAnchor(stage, wallFocusRect(stage, "anchor")!)
    );
    expect(plan?.sheetMaxHeight).toBeUndefined();
  });

  it("plans a sheet with its reserved height and no anchor", () => {
    const stage = { width: 390, height: 800 };
    const plan = planWallFocus(stage, false);
    const sheetMaxHeight = sheetMaxHeightFor(stage);

    expect(plan).toEqual({
      mode: "sheet",
      target: wallFocusRect(stage, "sheet", sheetMaxHeight),
      anchor: null,
      sheetMaxHeight,
    });
  });

  it("returns null while the stage has no size", () => {
    expect(planWallFocus({ width: 0, height: 0 }, true)).toBeNull();
  });
});
