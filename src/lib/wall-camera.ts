import {
  WALL_CELL_WIDTH,
  WALL_PATCH_HEIGHT,
  WALL_PATCH_WIDTH,
  WALL_TILE_ASPECT,
} from "@/lib/wall-layout";
import type { WallPoint } from "@/lib/wall-gesture";
import type { WallRect, WallRenderTile } from "@/types/wall";

/**
 * Caméra du Wall — géométrie pure.
 *
 * Le composant ne garde que le branchement : l'échelle d'ouverture, le vol
 * vers une affiche, l'ancrage d'un zoom et le cadrage après un changement de
 * taille sont calculés ici, hors de React, pour rester testables. Les
 * `MotionNumber` et les abonnements DOM vivent dans `useWallCamera`.
 */

export interface WallViewport {
  width: number;
  height: number;
}

export interface WallCameraState {
  x: number;
  y: number;
  scale: number;
}

export type WallFocusMode = "anchor" | "sheet";

/** Durée du vol de la tuile vers son plein cadre. */
export const WALL_FOCUS_DURATION = 0.72;

/** Seuils de recalcul de la liste des tuiles visibles pendant un geste. */
export const WALL_CAMERA_SYNC_DISTANCE = 18;
export const WALL_CAMERA_SYNC_ZOOM = 0.02;

/**
 * Taille de l'affiche une fois centrée : 52 % de la hauteur du cadre, sans
 * dépasser 480 px ni 42 % de la largeur. Sur un cadre étroit, la feuille prend
 * le bas de l'écran : l'affiche monte un peu et s'élargit pour rester lisible.
 */
const FOCUS_HEIGHT_RATIO = 0.52;
const FOCUS_SHEET_HEIGHT_RATIO = 0.4;
const FOCUS_MAX_HEIGHT = 480;
const FOCUS_MAX_WIDTH_RATIO = 0.42;
const FOCUS_SHEET_MAX_WIDTH_RATIO = 0.68;
/**
 * Feuille tactile : on lui réserve 46 % de la hauteur (sans jamais dépasser
 * 74 % de l'écran), et l'affiche se centre dans l'espace restant. Ainsi la
 * feuille ne recouvre jamais la couverture, même quand le résumé est long.
 */
const SHEET_MAX_RATIO = 0.46;
const SHEET_ABSOLUTE_RATIO = 0.74;
const SHEET_MIN_HEIGHT = 220;
const SHEET_GAP = 16;

/**
 * Échelle d'ouverture : on ne cherche pas à faire tenir tout le motif dans le
 * cadre (les couvertures seraient illisibles), mais à en montrer quelques
 * colonnes à taille d'affiche. La couverture reste le sujet.
 */
export function initialWallScale(
  viewport: WallViewport,
  minScale: number
): number {
  if (!viewport.width || !viewport.height) return 1;
  const targetColumns =
    viewport.width < 680 ? 4.2 : viewport.width < 1100 ? 6.4 : 8.4;
  const target = viewport.width / (WALL_CELL_WIDTH * targetColumns);
  return Math.min(1.12, Math.max(minScale, target));
}

/** Place `scale` autour du centre du motif, comme à l'ouverture du mur. */
export function wallCameraCenteredOn(
  viewport: WallViewport,
  world: WallPoint,
  scale: number
): WallCameraState {
  return {
    x: viewport.width / 2 - world.x * scale,
    y: viewport.height / 2 - world.y * scale,
    scale,
  };
}

/** Centre du regard exprimé dans le repère du mur, avant transformation. */
export function wallWorldCenter(
  camera: WallCameraState,
  viewport: WallViewport
): WallPoint {
  const scale = camera.scale > 0 ? camera.scale : 1;
  return {
    x: (viewport.width / 2 - camera.x) / scale,
    y: (viewport.height / 2 - camera.y) / scale,
  };
}

/** Cadrage d'ouverture (et de remise à zéro) : centre du motif, colonnes lisibles. */
export function initialWallCamera(
  viewport: WallViewport,
  minScale: number
): WallCameraState {
  return wallCameraCenteredOn(
    viewport,
    { x: WALL_PATCH_WIDTH / 2, y: WALL_PATCH_HEIGHT / 2 },
    initialWallScale(viewport, minScale)
  );
}

/** Recalcule l'échelle sans perdre le centre du regard (resize du cadre). */
export function resizeWallCamera(
  camera: WallCameraState,
  viewport: WallViewport,
  nextScale: number
): WallCameraState {
  const world =
    camera.scale > 0
      ? wallWorldCenter(camera, viewport)
      : { x: WALL_PATCH_WIDTH / 2, y: WALL_PATCH_HEIGHT / 2 };
  return wallCameraCenteredOn(viewport, world, nextScale);
}

/** Vue d'ensemble : toute la plaque au zoom minimal, centre du regard conservé. */
export function fitWallCamera(
  camera: WallCameraState,
  viewport: WallViewport,
  minScale: number
): WallCameraState {
  return resizeWallCamera(camera, viewport, minScale);
}

/** Hauteur maximale réservée à la feuille mobile pour que l'affiche reste visible. */
export function sheetMaxHeightFor(viewport: WallViewport): number {
  return Math.round(
    Math.min(
      viewport.height * SHEET_ABSOLUTE_RATIO,
      Math.max(SHEET_MIN_HEIGHT, viewport.height * SHEET_MAX_RATIO)
    )
  );
}

/**
 * Rect final de l'affiche centrée, dans le repère du cadre. C'est la même
 * géométrie qui sert à calculer la caméra et à poser la plaque : la tuile
 * cliquée est la seule à bouger, elle devient elle-même l'affiche.
 */
export function wallFocusRect(
  viewport: WallViewport,
  mode: WallFocusMode,
  sheetMaxHeight = 0
): WallRect | null {
  if (viewport.width <= 0 || viewport.height <= 0) return null;

  const aspect = WALL_TILE_ASPECT;
  const availableHeight =
    mode === "sheet"
      ? Math.max(120, viewport.height - sheetMaxHeight - SHEET_GAP * 2)
      : viewport.height;
  let height = Math.min(
    FOCUS_MAX_HEIGHT,
    availableHeight,
    viewport.height *
      (mode === "sheet" ? FOCUS_SHEET_HEIGHT_RATIO : FOCUS_HEIGHT_RATIO)
  );
  let width = height * aspect;
  const maxWidth =
    viewport.width *
    (mode === "sheet" ? FOCUS_SHEET_MAX_WIDTH_RATIO : FOCUS_MAX_WIDTH_RATIO);
  if (width > maxWidth) {
    width = maxWidth;
    height = width / aspect;
  }

  width = Math.round(width);
  height = Math.round(height);
  const centerY =
    mode === "sheet"
      ? SHEET_GAP + availableHeight / 2
      : viewport.height / 2;
  return {
    left: Math.round((viewport.width - width) / 2),
    top: Math.round(centerY - height / 2),
    width,
    height,
  };
}

/** Caméra qui amène exactement la tuile cliquée dans le rect de focus. */
export function wallFocusCamera(
  tile: Pick<WallRenderTile, "x" | "y" | "width" | "height">,
  target: WallRect,
  clampZoom: (scale: number) => number
): WallCameraState {
  const scale = clampZoom(target.width / tile.width);
  return {
    x: target.left + target.width / 2 - (tile.x + tile.width / 2) * scale,
    y: target.top + target.height / 2 - (tile.y + tile.height / 2) * scale,
    scale,
  };
}

/** Zoom autour d'un point du cadre : le point saisi reste sous le curseur. */
export function wallZoomCamera(
  camera: WallCameraState,
  focus: WallPoint,
  nextScale: number
): WallCameraState {
  const currentScale = camera.scale > 0 ? camera.scale : 1;
  const worldX = (focus.x - camera.x) / currentScale;
  const worldY = (focus.y - camera.y) / currentScale;
  return {
    x: focus.x - worldX * nextScale,
    y: focus.y - worldY * nextScale,
    scale: nextScale,
  };
}

/**
 * Faut-il réveiller React pour recalculer les tuiles visibles ? Le canvas suit
 * les MotionValues à chaque frame ; la liste des tuiles, elle, n'a pas besoin
 * de suivre un déplacement imperceptible.
 */
export function shouldSyncWallCamera(
  previous: WallCameraState,
  next: WallCameraState,
  force = false
): boolean {
  if (force) return true;
  const moved =
    Math.abs(next.x - previous.x) + Math.abs(next.y - previous.y);
  const zoomed =
    previous.scale > 0
      ? Math.abs(next.scale - previous.scale) / previous.scale
      : 1;
  return moved >= WALL_CAMERA_SYNC_DISTANCE || zoomed >= WALL_CAMERA_SYNC_ZOOM;
}
