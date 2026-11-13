/**
 * The reader's side policy: which logical move ("previous" / "next") a
 * screen side triggers, whether that move can turn a page, and how the
 * reading direction places pages and gestures on screen.
 *
 * Every spatial input of the reader — the edge buttons, the swipe, the arrow
 * keys, the spread order, the start-of-book bump and the shortcuts dialog —
 * reads this module instead of re-deriving `isRTL ? next : previous`. The rule
 * is one sentence: in LTR the left side goes back, in RTL it goes forward.
 */

import type { PageMoveDirection } from "./page-navigation";

export type ReadingDirection = "ltr" | "rtl";
export type ReaderSide = "left" | "right";

export interface SideActionState {
  direction: ReadingDirection;
  currentPage: number;
  totalPages: number;
}

export interface SideAction {
  side: ReaderSide;
  action: PageMoveDirection;
  /**
   * True when the action turns a page inside the book. It matches the
   * `kind: "page"` outcome of `planPageMove`: the edge buttons hide on a
   * start bump or an end-of-book transition, which stay keyboard/swipe only.
   */
  visible: boolean;
  /** i18n key of the button tooltip, named after the action, not the side. */
  labelKey: SideActionLabelKey;
}

export type SideActionLabelKey = "reader.controls.previousPage" | "reader.controls.nextPage";

/**
 * Pinch-zoom tolerance: above this `visualViewport.scale` the reader is
 * zoomed, so a swipe pans the page and a page turn is not animated. 1.15
 * absorbs the imprecision left after a de-pinch.
 */
export const ZOOM_SCALE_THRESHOLD = 1.15;

/** Minimum horizontal travel, in CSS pixels, for a touch to count as a swipe. */
export const SWIPE_MIN_DISTANCE = 50;

/** Pixels the spread is pulled by the start-of-book bump. */
const START_BUMP_PULL = 22;
/** Degrees the spread tilts during the start-of-book bump. */
const START_BUMP_TILT = 4;

const LABEL_KEYS: Record<PageMoveDirection, SideActionLabelKey> = {
  previous: "reader.controls.previousPage",
  next: "reader.controls.nextPage",
};

/** The side that leads back in the book. */
function previousSide(direction: ReadingDirection): ReaderSide {
  return direction === "rtl" ? "right" : "left";
}

export function actionForSide(side: ReaderSide, direction: ReadingDirection): PageMoveDirection {
  return side === previousSide(direction) ? "previous" : "next";
}

export function sideForAction(action: PageMoveDirection, direction: ReadingDirection): ReaderSide {
  const back = previousSide(direction);
  if (action === "previous") return back;
  return back === "left" ? "right" : "left";
}

/** True when the move lands on another page of the current book. */
export function canTurnPage(
  action: PageMoveDirection,
  { currentPage, totalPages }: Pick<SideActionState, "currentPage" | "totalPages">
): boolean {
  return action === "previous" ? currentPage > 1 : currentPage < totalPages;
}

export function resolveSideAction(side: ReaderSide, state: SideActionState): SideAction {
  const action = actionForSide(side, state.direction);
  return {
    side,
    action,
    visible: canTurnPage(action, state),
    labelKey: LABEL_KEYS[action],
  };
}

/** Maps a spatial key to its side; non-spatial keys return `null`. */
export function sideForArrowKey(key: string): ReaderSide | null {
  if (key === "ArrowLeft") return "left";
  if (key === "ArrowRight") return "right";
  return null;
}

/**
 * The side a horizontal swipe reveals. A finger moving right drags the page
 * right and brings in what sits on the left, so a positive delta selects the
 * left side. Vertical or short gestures return `null`.
 */
export function sideForSwipe(deltaX: number, deltaY: number): ReaderSide | null {
  if (Math.abs(deltaY) > Math.abs(deltaX)) return null;
  if (Math.abs(deltaX) <= SWIPE_MIN_DISTANCE) return null;
  return deltaX > 0 ? "left" : "right";
}

/** True when a pinch zoom is active; an unknown scale reads as not zoomed. */
export function isViewportZoomed(scale: number | null | undefined): boolean {
  return (scale ?? 1) > ZOOM_SCALE_THRESHOLD;
}

/**
 * Screen order of a spread, left to right, as indexes into
 * `[firstPage, secondPage]`: the earlier page sits on the previous side.
 */
export function spreadOrder(direction: ReadingDirection): readonly [0 | 1, 0 | 1] {
  return previousSide(direction) === "left" ? [0, 1] : [1, 0];
}

/**
 * The start-of-book bump pulls the spread as if the reader tried to turn back
 * a cover: toward the side the "previous" gesture drags the page.
 */
export function startBumpMotion(direction: ReadingDirection): { pull: number; tilt: number } {
  const sign = previousSide(direction) === "left" ? 1 : -1;
  return { pull: sign * START_BUMP_PULL, tilt: -sign * START_BUMP_TILT };
}

/** Arrow glyph of the key that triggers an action, for the shortcuts dialog. */
export function arrowGlyphForAction(action: PageMoveDirection, direction: ReadingDirection): "←" | "→" {
  return sideForAction(action, direction) === "left" ? "←" : "→";
}
