import type { WallLayout, WallRenderTile, WallTile } from "@/types/wall";

/**
 * Géométrie du mur.
 *
 * Le mur est un **motif périodique** : une plaque de 21 × 21 cellules, remplie
 * de couvertures qui occupent 1, 2 ou 3 cellules de côté. Toutes les tailles
 * partagent la même cellule de base 2:3 et la même gouttière, donc les
 * espacements restent identiques horizontalement et verticalement, quelle que
 * soit la taille de l'affiche. Le motif est répété à l'infini par
 * `visibleWallTiles` : on ne rend que les copies qui croisent le cadre, avec
 * une marge de préchargement.
 */

/** Gouttière unique, partagée par tous les bords. */
export const WALL_GAP = 16;

/** Cellule de base : une couverture 2:3. */
export const WALL_CELL_WIDTH = 148;
export const WALL_CELL_HEIGHT = 222;
export const WALL_TILE_ASPECT = WALL_CELL_WIDTH / WALL_CELL_HEIGHT;

/** Pas de la grille : cellule + gouttière. */
export const WALL_PITCH_X = WALL_CELL_WIDTH + WALL_GAP;
export const WALL_PITCH_Y = WALL_CELL_HEIGHT + WALL_GAP;

/** Dimensions du motif répété. */
export const WALL_COLUMNS = 21;
export const WALL_ROWS = 21;
export const WALL_PATCH_WIDTH = WALL_COLUMNS * WALL_PITCH_X;
export const WALL_PATCH_HEIGHT = WALL_ROWS * WALL_PITCH_Y;

/** Tailles possibles, en cellules. */
export const WALL_SPANS = [1, 2, 3] as const;

/** Largeur/hauteur d'une affiche de `span` cellules. */
export function wallTileWidth(span: number): number {
  return span * WALL_PITCH_X - WALL_GAP;
}

export function wallTileHeight(span: number): number {
  return span * WALL_PITCH_Y - WALL_GAP;
}

/** Une affiche ne dépasse jamais trois cellules. */
export const WALL_MAX_WIDTH = wallTileWidth(3);
export const WALL_MAX_HEIGHT = wallTileHeight(3);
export const WALL_MIN_WIDTH = wallTileWidth(1);
export const WALL_MIN_HEIGHT = wallTileHeight(1);

/** Poids des tailles : de grandes plaques, quelques petites respirations. */
const SPAN_WEIGHTS: ReadonlyArray<readonly [number, number]> = [
  [3, 0.44],
  [2, 0.36],
  [1, 0.2],
];

const WALL_SEED = "le-wall";

/** Au-delà, on cesse de rendre la marge : le cadre reste toujours couvert. */
const MAX_MARGIN_TILES = 240;

/** Générateur déterministe (mulberry32) : aucun aléa entre serveur et client. */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function fits(
  occupied: Uint8Array,
  column: number,
  row: number,
  span: number
): boolean {
  if (
    column + span > WALL_COLUMNS ||
    row + span > WALL_ROWS
  ) {
    return false;
  }
  for (let dy = 0; dy < span; dy += 1) {
    for (let dx = 0; dx < span; dx += 1) {
      if (occupied[(row + dy) * WALL_COLUMNS + column + dx]) return false;
    }
  }
  return true;
}

function pickSpan(
  occupied: Uint8Array,
  column: number,
  row: number,
  random: () => number
): number {
  const candidates = SPAN_WEIGHTS.filter(([span]) =>
    fits(occupied, column, row, span)
  );
  if (candidates.length === 0) return 1;

  let total = 0;
  for (const [, weight] of candidates) total += weight;

  let roll = random() * total;
  for (const [span, weight] of candidates) {
    roll -= weight;
    if (roll <= 0) return span;
  }
  return candidates[candidates.length - 1]?.[0] ?? 1;
}

/**
 * Remplit la plaque cellule par cellule. La première cellule libre reçoit une
 * affiche de 3, 2 ou 1 cellule ; on marque ensuite toute sa surface. Une
 * affiche de 1 cellule est toujours possible, donc la plaque est couverte
 * exactement, sans trou ni chevauchement.
 */
function packPatch(random: () => number): WallTile[] {
  const occupied = new Uint8Array(WALL_COLUMNS * WALL_ROWS);
  const tiles: WallTile[] = [];

  for (let row = 0; row < WALL_ROWS; row += 1) {
    for (let column = 0; column < WALL_COLUMNS; column += 1) {
      if (occupied[row * WALL_COLUMNS + column]) continue;

      const span = pickSpan(occupied, column, row, random);
      for (let dy = 0; dy < span; dy += 1) {
        for (let dx = 0; dx < span; dx += 1) {
          occupied[(row + dy) * WALL_COLUMNS + column + dx] = 1;
        }
      }

      tiles.push({
        index: tiles.length,
        x: column * WALL_PITCH_X,
        y: row * WALL_PITCH_Y,
        width: wallTileWidth(span),
        height: wallTileHeight(span),
        order: tiles.length,
      });
    }
  }

  return tiles;
}

/**
 * Construit le motif du mur. `seedKey` permet de rafraîchir la composition
 * quand le filtre change, sans jamais rendre le rendu instable.
 */
export function buildWallLayout(seedKey: string = WALL_SEED): WallLayout {
  const random = mulberry32(hashId(`wall:${seedKey}`));
  return {
    width: WALL_PATCH_WIDTH,
    height: WALL_PATCH_HEIGHT,
    tiles: packPatch(random),
  };
}

export interface WallCamera {
  /** Translation du canvas, en pixels écran. */
  x: number;
  y: number;
  /** Échelle du canvas. */
  scale: number;
  /** Taille du cadre, en pixels écran. */
  width: number;
  height: number;
}

interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

function intersects(
  tile: { x: number; y: number; width: number; height: number },
  rect: Rect
): boolean {
  return (
    tile.x + tile.width > rect.left &&
    tile.x < rect.right &&
    tile.y + tile.height > rect.top &&
    tile.y < rect.bottom
  );
}

function normalize(value: number, modulo: number): number {
  const result = value % modulo;
  return result < 0 ? result + modulo : result;
}

/**
 * Toutes les copies du motif qui croisent le cadre (et sa marge). Les clés
 * sont stables tant que la copie reste montée ; les voisines ne bougent donc
 * jamais quand la caméra glisse.
 *
 * `itemCount` est le nombre de séries visibles. Chaque copie du motif décale
 * l'ordre des séries : on retrouve les mêmes couvertures, mais jamais dans le
 * même ordre d'une copie à l'autre.
 */
export function visibleWallTiles(
  layout: WallLayout,
  camera: WallCamera,
  itemCount: number,
  seedOffset = 0,
  margin = 0.34
): WallRenderTile[] {
  if (
    itemCount <= 0 ||
    layout.tiles.length === 0 ||
    camera.scale <= 0 ||
    camera.width <= 0 ||
    camera.height <= 0
  ) {
    return [];
  }

  const left = -camera.x / camera.scale;
  const top = -camera.y / camera.scale;
  const right = left + camera.width / camera.scale;
  const bottom = top + camera.height / camera.scale;

  const padded: Rect = {
    left: left - (right - left) * margin,
    right: right + (right - left) * margin,
    top: top - (bottom - top) * margin,
    bottom: bottom + (bottom - top) * margin,
  };
  const viewport: Rect = { left, top, right, bottom };

  const startCopyX = Math.floor(padded.left / layout.width);
  const endCopyX = Math.floor((padded.right - 0.001) / layout.width);
  const startCopyY = Math.floor(padded.top / layout.height);
  const endCopyY = Math.floor((padded.bottom - 0.001) / layout.height);

  const visible: WallRenderTile[] = [];
  const marginTiles: WallRenderTile[] = [];

  for (let copyY = startCopyY; copyY <= endCopyY; copyY += 1) {
    for (let copyX = startCopyX; copyX <= endCopyX; copyX += 1) {
      const offset = normalize(
        seedOffset + copyX * 37 + copyY * 61,
        itemCount
      );
      const baseX = copyX * layout.width;
      const baseY = copyY * layout.height;

      for (const tile of layout.tiles) {
        const worldX = baseX + tile.x;
        const worldY = baseY + tile.y;
        const worldTile = {
          x: worldX,
          y: worldY,
          width: tile.width,
          height: tile.height,
        };
        if (!intersects(worldTile, padded)) continue;

        const rendered: WallRenderTile = {
          ...tile,
          x: worldX,
          y: worldY,
          key: `${copyX}_${copyY}_${tile.index}`,
          itemIndex: (tile.index + offset) % itemCount,
          visible: intersects(worldTile, viewport),
        };

        if (rendered.visible) visible.push(rendered);
        else marginTiles.push(rendered);
      }
    }
  }

  if (marginTiles.length === 0) return visible;

  const centerX = (padded.left + padded.right) / 2;
  const centerY = (padded.top + padded.bottom) / 2;
  marginTiles.sort((first, second) => {
    const firstDistance =
      Math.abs(first.x + first.width / 2 - centerX) +
      Math.abs(first.y + first.height / 2 - centerY);
    const secondDistance =
      Math.abs(second.x + second.width / 2 - centerX) +
      Math.abs(second.y + second.height / 2 - centerY);
    return (
      firstDistance - secondDistance || first.key.localeCompare(second.key)
    );
  });

  return visible.concat(marginTiles.slice(0, MAX_MARGIN_TILES));
}

/**
 * Ordre du mur : un mélange stable par identifiant, pour que deux séries
 * voisines dans la bibliothèque ne se retrouvent pas systématiquement
 * côte à côte. Le hash FNV-1a est suffisant et reste identique entre le
 * serveur et le client.
 */
export function orderForWall<T extends { id: string }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => {
    const delta = hashId(a.id) - hashId(b.id);
    return delta !== 0 ? delta : a.id.localeCompare(b.id);
  });
}

/** Hash FNV-1a 32 bits, déterministe et sans dépendance. */
export function hashId(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
