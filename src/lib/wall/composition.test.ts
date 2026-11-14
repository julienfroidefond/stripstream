import { describe, expect, it } from "vitest";

import { pickRandomWallTile, wallDimRect } from "./composition";

const tile = (key: string, x: number, y: number, width = 100, height = 150) => ({
  key,
  x,
  y,
  width,
  height,
});

describe("wallDimRect", () => {
  it("covers every rendered copy", () => {
    expect(
      wallDimRect([tile("a", 100, 50), tile("b", -200, 400, 300, 450)])
    ).toEqual({ left: -200, top: 50, width: 400, height: 800 });
  });

  it("has nothing to cover without tiles", () => {
    expect(wallDimRect([])).toBeNull();
  });
});

describe("pickRandomWallTile", () => {
  const view = { left: 0, top: 0, right: 500, bottom: 500 };
  const onScreen = tile("on", 100, 100);
  const edge = tile("edge", 450, 450);
  const off = tile("off", 600, 0);
  const active = tile("active", 200, 200);

  it("draws only among tiles really on screen", () => {
    const tiles = [off, onScreen, edge];
    expect(pickRandomWallTile(tiles, view, null, () => 0)).toBe(onScreen);
    expect(pickRandomWallTile(tiles, view, null, () => 0.99)).toBe(edge);
  });

  it("never draws the cover already open", () => {
    const tiles = [active, onScreen];
    expect(pickRandomWallTile(tiles, view, "active", () => 0)).toBe(onScreen);
  });

  it("treats a tile that only touches the edge as off screen", () => {
    const touching = tile("touch", 500, 0);
    expect(
      pickRandomWallTile([touching, onScreen], view, null, () => 0)
    ).toBe(onScreen);
  });

  it("falls back to every rendered tile when none is on screen", () => {
    const tiles = [off, active];
    expect(pickRandomWallTile(tiles, view, "active", () => 0.6)).toBe(active);
  });

  it("returns null when there is nothing to draw", () => {
    expect(pickRandomWallTile([], view, null, () => 0)).toBeNull();
  });
});
