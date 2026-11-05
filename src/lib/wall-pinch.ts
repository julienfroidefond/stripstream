/**
 * Le pinch du Wall.
 *
 * La géométrie du geste (échelle, ancre sous les doigts) vit dans
 * `wall-gesture.ts` ; ce module ne garde que les bornes de zoom et la garde
 * qui empêche le clic synthétique de WebKit d'ouvrir une œuvre après un pinch.
 */
export const MIN_WALL_ZOOM = 0.28;
export const MAX_WALL_ZOOM = 2.4;

export function clampWallZoom(value: number, minScale: number): number {
  return Math.min(MAX_WALL_ZOOM, Math.max(minScale, value));
}

/** Durée pendant laquelle le clic synthétique de WebKit est ignoré. */
export const PINCH_CLICK_GUARD_MS = 500;

export interface WallClickGuardState {
  /** Instant jusqu'auquel les clics sont ignorés. */
  guardUntil: number;
  /** Un pinch a eu lieu dans la séquence de touches courante. */
  pinchHappened: boolean;
}

export function createWallClickGuardState(): WallClickGuardState {
  return { guardUntil: 0, pinchHappened: false };
}

/** Nouvelle séquence de touches : le geste précédent n'a plus de clic en attente. */
export function beginWallPress(state: WallClickGuardState): void {
  state.guardUntil = 0;
  state.pinchHappened = false;
}

export function armWallClickGuard(
  state: WallClickGuardState,
  now: number,
  duration: number
): void {
  state.guardUntil = now + duration;
}

export function beginWallPinch(
  state: WallClickGuardState,
  now: number
): void {
  state.pinchHappened = true;
  armWallClickGuard(state, now, PINCH_CLICK_GUARD_MS);
}

/** Une activation clavier est une intention explicite : elle rouvre les clics. */
export function clearWallClickGuard(state: WallClickGuardState): void {
  state.guardUntil = 0;
}

export function endWallPinch(state: WallClickGuardState, now: number): void {
  armWallClickGuard(state, now, PINCH_CLICK_GUARD_MS);
}

/**
 * WebKit relâche parfois le dernier doigt bien après le premier : c'est ce
 * relâchement final qui peut émettre le clic synthétique.
 */
export function releaseWallTouch(
  state: WallClickGuardState,
  now: number,
  remainingTouches: number
): void {
  if (remainingTouches === 0 && state.pinchHappened) {
    armWallClickGuard(state, now, PINCH_CLICK_GUARD_MS);
  }
}

export function isWallClickGuarded(
  state: WallClickGuardState,
  now: number
): boolean {
  return now < state.guardUntil;
}
