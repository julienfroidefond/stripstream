/**
 * Règles de composition du Wall — politique pure.
 *
 * Ce que `WallExperience` décidait inline à partir des tuiles rendues : la
 * surface du voile de focus, le tirage au sort du bouton « hasard » et les
 * durées de la vague d'entrée et du flash.
 */
import type { WallViewRect } from "./wall-camera";
import type { WallRect, WallRenderTile } from "@/types/wall";

/**
 * Durée de la vague d'entrée des affiches, à l'ouverture du mur comme quand
 * un changement de filtre la rejoue.
 */
export const WALL_ENTRANCE_MS = 1600;

/** Durée du flash qui signale la tuile tirée au sort. */
export const WALL_RANDOM_FLASH_MS = 1600;

type TileBox = Pick<WallRenderTile, "x" | "y" | "width" | "height">;

/**
 * Le voile de focus couvre toutes les copies rendues, pas seulement la plaque
 * d'origine : sinon il disparaît dès qu'on s'éloigne du centre du motif, et le
 * mur redevient uniformément lumineux au scroll.
 */
export function wallDimRect(tiles: readonly TileBox[]): WallRect | null {
  if (tiles.length === 0) return null;

  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const tile of tiles) {
    left = Math.min(left, tile.x);
    top = Math.min(top, tile.y);
    right = Math.max(right, tile.x + tile.width);
    bottom = Math.max(bottom, tile.y + tile.height);
  }
  return { left, top, width: right - left, height: bottom - top };
}

/**
 * Tire une tuile au sort parmi celles réellement à l'écran, sans reprendre
 * l'œuvre déjà ouverte. Si aucune ne convient (cadre vide de tuiles), le
 * tirage se fait sur toutes les tuiles rendues.
 */
export function pickRandomWallTile<T extends TileBox & { key: string }>(
  tiles: readonly T[],
  view: WallViewRect,
  activeKey: string | null | undefined,
  random: () => number
): T | null {
  const onScreen = tiles.filter(
    (candidate) =>
      candidate.key !== activeKey &&
      candidate.x + candidate.width > view.left &&
      candidate.x < view.right &&
      candidate.y + candidate.height > view.top &&
      candidate.y < view.bottom
  );
  const pool = onScreen.length > 0 ? onScreen : tiles;
  return pool[Math.floor(random() * pool.length)] ?? null;
}
