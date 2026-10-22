/**
 * Le pinch du Wall.
 *
 * `@use-gesture` v10 expose, pour un pinch, `movement[0]` comme le rapport
 * entre la distance courante des doigts et celle du début du geste : 1 quand
 * les doigts n'ont pas bougé, 1,5 quand ils se sont écartés de moitié. Ce
 * n'est pas un delta autour de 0 : l'échelle de départ se multiplie donc
 * directement par ce rapport.
 */
export const MIN_WALL_ZOOM = 0.28;
export const MAX_WALL_ZOOM = 2.4;

export function pinchScale(startScale: number, ratio: number): number {
  if (!Number.isFinite(ratio) || ratio <= 0) return startScale;
  return startScale * ratio;
}

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
