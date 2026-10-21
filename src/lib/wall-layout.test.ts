import { describe, expect, it } from "vitest";

import {
  buildWallLayout,
  hashId,
  orderForWall,
  visibleWallTiles,
  WALL_COLUMNS,
  WALL_GAP,
  WALL_MAX_HEIGHT,
  WALL_MAX_WIDTH,
  WALL_MIN_HEIGHT,
  WALL_MIN_WIDTH,
  WALL_PATCH_HEIGHT,
  WALL_PATCH_WIDTH,
  WALL_PITCH_X,
  WALL_PITCH_Y,
  WALL_ROWS,
  WALL_SPANS,
  type WallCamera,
} from "./wall-layout";

function spanOf(value: number, pitch: number): number {
  return (value + WALL_GAP) / pitch;
}

function overlaps(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
): boolean {
  return (
    a.x < b.x + b.width &&
    b.x < a.x + a.width &&
    a.y < b.y + b.height &&
    b.y < a.y + a.height
  );
}

function camera(overrides: Partial<WallCamera> = {}): WallCamera {
  return { x: 0, y: 0, scale: 1, width: 1200, height: 720, ...overrides };
}

describe("buildWallLayout", () => {
  it("is deterministic", () => {
    expect(buildWallLayout("all")).toEqual(buildWallLayout("all"));
  });

  it("redraws the wall when the filter seed changes", () => {
    const all = buildWallLayout("all");
    const filtered = buildWallLayout("Bande dessinée");
    expect(filtered.tiles).not.toEqual(all.tiles);
  });

  it("uses only three cover sizes, all divisible by the base cell", () => {
    const layout = buildWallLayout("all");
    expect(layout.width).toBe(WALL_PATCH_WIDTH);
    expect(layout.height).toBe(WALL_PATCH_HEIGHT);

    for (const tile of layout.tiles) {
      const columns = spanOf(tile.width, WALL_PITCH_X);
      const rows = spanOf(tile.height, WALL_PITCH_Y);
      expect(columns).toBe(rows);
      expect(WALL_SPANS).toContain(columns);
      expect(tile.x % WALL_PITCH_X).toBe(0);
      expect(tile.y % WALL_PITCH_Y).toBe(0);
      expect(tile.width).toBeGreaterThanOrEqual(WALL_MIN_WIDTH);
      expect(tile.width).toBeLessThanOrEqual(WALL_MAX_WIDTH);
      expect(tile.height).toBeGreaterThanOrEqual(WALL_MIN_HEIGHT);
      expect(tile.height).toBeLessThanOrEqual(WALL_MAX_HEIGHT);
    }
  });

  it("leaves exactly one gutter between every pair of neighbours", () => {
    const layout = buildWallLayout("gouttières");
    for (const tile of layout.tiles) {
      const columns = spanOf(tile.width, WALL_PITCH_X);
      const rows = spanOf(tile.height, WALL_PITCH_Y);
      expect(tile.x + columns * WALL_PITCH_X - WALL_GAP).toBe(
        tile.x + tile.width
      );
      expect(tile.y + rows * WALL_PITCH_Y - WALL_GAP).toBe(
        tile.y + tile.height
      );
    }
  });

  it("never overlaps two covers", () => {
    const layout = buildWallLayout("all");
    for (let index = 0; index < layout.tiles.length; index += 1) {
      for (let other = index + 1; other < layout.tiles.length; other += 1) {
        expect(overlaps(layout.tiles[index], layout.tiles[other])).toBe(false);
      }
    }
  });

  it("tiles the patch exactly, without holes", () => {
    const layout = buildWallLayout("all");
    const occupied = new Uint8Array(WALL_COLUMNS * WALL_ROWS);

    for (const tile of layout.tiles) {
      const column = tile.x / WALL_PITCH_X;
      const row = tile.y / WALL_PITCH_Y;
      const span = spanOf(tile.width, WALL_PITCH_X);

      for (let dy = 0; dy < span; dy += 1) {
        for (let dx = 0; dx < span; dx += 1) {
          const cell = (row + dy) * WALL_COLUMNS + column + dx;
          expect(occupied[cell]).toBe(0);
          occupied[cell] = 1;
        }
      }
    }

    expect(Array.from(occupied).every((cell) => cell === 1)).toBe(true);
  });

  it("keeps every tile inside the patch", () => {
    const layout = buildWallLayout("all");
    for (const tile of layout.tiles) {
      expect(tile.x).toBeGreaterThanOrEqual(0);
      expect(tile.y).toBeGreaterThanOrEqual(0);
      expect(tile.x + tile.width).toBeLessThanOrEqual(layout.width);
      expect(tile.y + tile.height).toBeLessThanOrEqual(layout.height);
    }
  });

  it("gives every tile a stable slot index", () => {
    const layout = buildWallLayout("all");
    expect(layout.tiles.map((tile) => tile.index)).toEqual(
      layout.tiles.map((_, index) => index)
    );
  });
});

describe("visibleWallTiles", () => {
  const layout = buildWallLayout("all");

  it("returns deterministic, uniquely keyed copies", () => {
    const first = visibleWallTiles(layout, camera(), 60, 7);
    const second = visibleWallTiles(layout, camera(), 60, 7);

    expect(first).toEqual(second);
    expect(new Set(first.map((tile) => tile.key)).size).toBe(first.length);
  });

  it("maps every copy to a valid item", () => {
    const tiles = visibleWallTiles(layout, camera(), 17, 3);
    expect(tiles.length).toBeGreaterThan(0);
    for (const tile of tiles) {
      expect(tile.itemIndex).toBeGreaterThanOrEqual(0);
      expect(tile.itemIndex).toBeLessThan(17);
    }
  });

  it("covers the viewport and only adds bounded preload margin", () => {
    const tiles = visibleWallTiles(layout, camera(), 60, 0, 0.3);
    expect(tiles.length).toBeGreaterThan(0);
    expect(tiles.length).toBeLessThan(500);
  });

  it("still renders when the camera is far from the origin", () => {
    const left = 94812;
    const top = -60231;
    const tiles = visibleWallTiles(
      layout,
      camera({ x: -left, y: -top }),
      60,
      0
    );

    expect(tiles.length).toBeGreaterThan(0);
    const onScreen = tiles.filter(
      (tile) =>
        tile.x + tile.width > left &&
        tile.x < left + 1200 &&
        tile.y + tile.height > top &&
        tile.y < top + 720
    );
    expect(onScreen.length).toBeGreaterThan(0);
  });

  it("repeats the same geometry one patch away", () => {
    const first = visibleWallTiles(
      layout,
      camera({ x: -120, y: -80 }),
      60,
      0
    );
    const second = visibleWallTiles(
      layout,
      camera({
        x: -120 - layout.width,
        y: -80 - layout.height,
      }),
      60,
      0
    );

    const relative = (tiles: typeof first) =>
      tiles
        .map((tile) => ({
          x: ((tile.x % layout.width) + layout.width) % layout.width,
          y: ((tile.y % layout.height) + layout.height) % layout.height,
          width: tile.width,
          height: tile.height,
        }))
        .sort((a, b) => a.x - b.x || a.y - b.y);

    expect(relative(second)).toEqual(relative(first));
  });

  it("shows duplicated covers when there are fewer items than slots", () => {
    const tiles = visibleWallTiles(layout, camera(), 2, 0);
    const indices = new Set(tiles.map((tile) => tile.itemIndex));
    expect(indices).toEqual(new Set([0, 1]));
  });

  it("returns nothing without items or a measured viewport", () => {
    expect(visibleWallTiles(layout, camera(), 0, 0)).toEqual([]);
    expect(
      visibleWallTiles(layout, camera({ width: 0 }), 60, 0)
    ).toEqual([]);
  });
});

describe("orderForWall", () => {
  it("is stable and independent of the input order", () => {
    const items = [{ id: "zeta" }, { id: "alpha" }, { id: "mike" }, { id: "bravo" }];
    const first = orderForWall(items);
    const second = orderForWall([...items].reverse());
    expect(second).toEqual(first);
  });

  it("does not rely on alphabetical order", () => {
    const ordered = orderForWall([{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }]);
    expect(ordered.map((item) => item.id)).not.toEqual(["a", "b", "c", "d"]);
  });
});

describe("hashId", () => {
  it("returns a stable unsigned 32-bit integer", () => {
    expect(hashId("hello")).toBe(hashId("hello"));
    expect(hashId("hello")).toBeGreaterThanOrEqual(0);
    expect(hashId("hello")).toBeLessThan(2 ** 32);
    expect(hashId("hello")).not.toBe(hashId("hellp"));
  });
});
