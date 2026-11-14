/**
 * Mise au point sur une œuvre — politique pure.
 *
 * Quand une affiche est ouverte, il faut décider de la présentation (plaque
 * ancrée à côté de l'affiche ou feuille en bas d'écran), du rectangle final de
 * l'affiche et, pour la plaque, de son côté et de sa position. `WallExperience`
 * mesure le cadre et applique le plan ; la géométrie vit ici.
 */
import {
  sheetMaxHeightFor,
  wallFocusRect,
  type WallFocusMode,
  type WallViewport,
} from "./camera";
import type { WallPlaqueAnchor, WallRect } from "@/types/wall";

/** Sous cette largeur de cadre, la plaque devient une feuille. */
export const WALL_SHEET_BREAKPOINT = 900;
/** Sous cette hauteur de cadre, la plaque ancrée n'a pas la place. */
export const WALL_ANCHOR_MIN_HEIGHT = 460;
export const WALL_PANEL_MIN_WIDTH = 300;
export const WALL_PANEL_MAX_WIDTH = 376;
/** Écart entre l'affiche et la plaque ancrée. */
export const WALL_PANEL_GAP = 26;
/** Marge minimale de la plaque aux bords du cadre. */
const PANEL_EDGE = 16;
const PANEL_VERTICAL_EDGE = 14;
const PANEL_HALF_MIN = 90;
const PANEL_HALF_MAX = 230;

/**
 * Plaque ancrée seulement avec un pointeur fin (souris, trackpad) et un cadre
 * assez grand ; tout le reste (tactile, cadre étroit ou bas) prend la feuille.
 */
export function chooseWallFocusMode(
  stage: WallViewport,
  fineHover: boolean
): WallFocusMode {
  return fineHover &&
    stage.width >= WALL_SHEET_BREAKPOINT &&
    stage.height >= WALL_ANCHOR_MIN_HEIGHT
    ? "anchor"
    : "sheet";
}

/**
 * Pose la plaque du côté où il reste le plus de place, alignée sur le centre
 * vertical de l'affiche, sans sortir du cadre.
 */
export function wallPlaqueAnchor(
  stage: WallViewport,
  target: WallRect
): WallPlaqueAnchor {
  const coverLeft = target.left;
  const coverRight = coverLeft + target.width;
  const panelWidth = Math.min(
    WALL_PANEL_MAX_WIDTH,
    Math.max(WALL_PANEL_MIN_WIDTH, stage.width * 0.3)
  );
  const roomRight = stage.width - coverRight;
  const roomLeft = coverLeft;
  const side: WallPlaqueAnchor["side"] = roomRight >= roomLeft ? "right" : "left";
  const desiredLeft =
    side === "right"
      ? coverRight + WALL_PANEL_GAP
      : coverLeft - panelWidth - WALL_PANEL_GAP;
  const left = Math.max(
    PANEL_EDGE,
    Math.min(stage.width - panelWidth - PANEL_EDGE, desiredLeft)
  );
  const half = Math.min(
    PANEL_HALF_MAX,
    Math.max(PANEL_HALF_MIN, stage.height / 2 - 18)
  );
  const minTop = half + PANEL_VERTICAL_EDGE;
  const maxTop = stage.height - half - PANEL_VERTICAL_EDGE;
  const centerY = target.top + target.height / 2;
  const top =
    maxTop <= minTop
      ? stage.height / 2
      : Math.max(minTop, Math.min(maxTop, centerY));

  return { left, top, width: panelWidth, side };
}

export interface WallFocusPlan {
  mode: WallFocusMode;
  /** Rectangle final de l'affiche, dans le repère du cadre. */
  target: WallRect;
  /** Plaque ancrée ; `null` en mode feuille. */
  anchor: WallPlaqueAnchor | null;
  /** Hauteur réservée à la feuille ; absente en mode ancré. */
  sheetMaxHeight: number | undefined;
}

/** Plan complet d'une mise au point ; `null` quand le cadre n'a pas de taille. */
export function planWallFocus(
  stage: WallViewport,
  fineHover: boolean
): WallFocusPlan | null {
  const mode = chooseWallFocusMode(stage, fineHover);
  const sheetMaxHeight =
    mode === "sheet" ? sheetMaxHeightFor(stage) : undefined;
  const target = wallFocusRect(stage, mode, sheetMaxHeight);
  if (!target) return null;

  return {
    mode,
    target,
    anchor: mode === "anchor" ? wallPlaqueAnchor(stage, target) : null,
    sheetMaxHeight,
  };
}
