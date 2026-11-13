/**
 * Politique de geste du carrousel tactile, sans DOM ni GSAP.
 *
 * `SwipeTrack` ne fait plus que traduire les événements pointeur en appels de
 * ces transitions et appliquer le résultat à la piste ; le seuil, la direction,
 * le verrouillage d'axe et le calcul d'inertie sont testables en isolation.
 */

/** Déplacement minimal avant de décider de l'axe du geste (px). */
export const AXIS_SLOP = 6;
/** Part du mouvement instantané dans la vitesse lissée. */
export const VELOCITY_SMOOTHING = 0.3;
/** Au-delà de cette pause avant le relâchement, l'élan est ignoré (ms). */
export const VELOCITY_STALE_MS = 80;
/** Projection de l'élan du doigt en pixels, pour décider d'un changement (ms). */
export const VELOCITY_PROJECTION_MS = 120;
/** Seuil proportionnel à la largeur de la piste. */
export const SWIPE_THRESHOLD_RATIO = 0.12;
/** Seuil minimal en pixels, même sur une piste étroite. */
export const SWIPE_THRESHOLD_MIN = 40;
/** Vitesse au-delà de laquelle un geste court change quand même de page (px/ms). */
export const VELOCITY_THRESHOLD = 0.35;
/** Durée du retour au centre quand le geste n'aboutit pas (s). */
export const SETTLE_DURATION = 0.3;

export type DragAxis = "pending" | "horizontal" | "vertical";

export interface DragState {
  pointerId: number;
  startX: number;
  startY: number;
  /** Position de la piste au moment de l'appui. */
  baseX: number;
  /** Déplacement horizontal courant, signé. */
  offsetX: number;
  axis: DragAxis;
  lastX: number;
  lastTime: number;
  velocity: number;
}

export interface BeginDragInput {
  /** Faux quand le geste est désactivé ou que l'utilisateur réduit le mouvement. */
  enabled: boolean;
  pointerId: number;
  x: number;
  y: number;
  baseX: number;
  time: number;
}

/** Ouvre un geste ; `null` quand la piste n'accepte pas de balayage. */
export function beginDrag(input: BeginDragInput): DragState | null {
  if (!input.enabled) return null;

  return {
    pointerId: input.pointerId,
    startX: input.x,
    startY: input.y,
    baseX: input.baseX,
    offsetX: 0,
    axis: "pending",
    lastX: input.x,
    lastTime: input.time,
    velocity: 0,
  };
}

export interface DragMove {
  x: number;
  y: number;
  time: number;
}

export interface DragMoveResult {
  state: DragState;
  /** Le geste vient d'être confirmé horizontal : capturer le pointeur. */
  capture: boolean;
  /** Déplacement horizontal courant, signé. */
  offsetX: number;
}

/**
 * Avance le geste : verrouille l'axe au-delà du seuil, met à jour l'offset et
 * la vitesse lissée. Un geste vertical est abandonné sans résistance.
 */
export function moveDrag(state: DragState, move: DragMove): DragMoveResult {
  if (state.axis === "vertical") {
    return { state, capture: false, offsetX: state.offsetX };
  }

  const deltaX = move.x - state.startX;
  const deltaY = move.y - state.startY;

  if (state.axis === "pending") {
    if (Math.abs(deltaX) < AXIS_SLOP && Math.abs(deltaY) < AXIS_SLOP) {
      return { state, capture: false, offsetX: state.offsetX };
    }
    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      return { state: { ...state, axis: "vertical" }, capture: false, offsetX: state.offsetX };
    }
  }

  const capture = state.axis === "pending";
  const elapsed = move.time - state.lastTime;
  const velocity =
    elapsed > 0
      ? state.velocity * (1 - VELOCITY_SMOOTHING) +
        ((move.x - state.lastX) / elapsed) * VELOCITY_SMOOTHING
      : state.velocity;

  return {
    state: {
      ...state,
      axis: capture ? "horizontal" : state.axis,
      offsetX: deltaX,
      lastX: move.x,
      lastTime: move.time,
      velocity,
    },
    capture,
    offsetX: deltaX,
  };
}

export interface ReleaseDragInput {
  time: number;
  /** Largeur d'une diapositive (px). */
  width: number;
}

export interface DragRelease {
  offset: number;
  /** Élan retenu pour la décision (0 après une pause). */
  velocity: number;
  projected: number;
  threshold: number;
  advance: boolean;
  /** Page suivante (`1`) ou précédente (`-1`). */
  direction: 1 | -1;
}

/** Décide du sort du geste au relâchement. */
export function releaseDrag(state: DragState, input: ReleaseDragInput): DragRelease {
  const offset = state.offsetX;
  const sinceLastMove = input.time - state.lastTime;
  const velocity = sinceLastMove > VELOCITY_STALE_MS ? 0 : state.velocity;
  const projected = offset + velocity * VELOCITY_PROJECTION_MS;
  const threshold = Math.max(SWIPE_THRESHOLD_MIN, input.width * SWIPE_THRESHOLD_RATIO);
  const advance =
    state.axis === "horizontal" &&
    (Math.abs(projected) > threshold || Math.abs(velocity) > VELOCITY_THRESHOLD);

  return {
    offset,
    velocity,
    projected,
    threshold,
    advance,
    direction: projected < 0 ? 1 : -1,
  };
}

/** Durée du tween qui termine un geste accepté (s). */
export function snapDuration(distance: number): number {
  return Math.min(0.42, Math.max(0.22, distance / 2200));
}

/** Un déplacement non nul doit annuler le clic qui suivrait le geste. */
export function shouldSuppressClick(offsetX: number): boolean {
  return Math.abs(offsetX) > AXIS_SLOP;
}

export interface PressInput {
  /** Position courante de la piste (px), `NaN` si inconnue. */
  trackX: number;
  /** Largeur d'une diapositive (px). */
  width: number;
  /** Un tween de fin de balayage tourne : son changement n'est pas appliqué. */
  pendingSwipe: boolean;
}

export interface PressPlan {
  /**
   * Terminer le tween de fin avant d'ouvrir le nouveau geste : son
   * `onSwipe` doit partir, sinon le premier balayage est perdu.
   */
  commitSwipe: boolean;
  /** Position de départ du nouveau geste. */
  baseX: number;
}

/**
 * Appui pendant un tween. Pendant le retour au centre, le doigt reprend la
 * piste là où elle est. Pendant la fin d'un balayage, le changement est
 * appliqué d'abord et la piste repart du centre de la nouvelle diapositive,
 * jamais d'une position intermédiaire.
 */
export function planPress(input: PressInput): PressPlan {
  const center = -input.width;
  if (input.pendingSwipe) return { commitSwipe: true, baseX: center };
  return {
    commitSwipe: false,
    baseX: Number.isFinite(input.trackX) && input.trackX !== 0 ? input.trackX : center,
  };
}

/** Seul le doigt qui a ouvert le geste le fait avancer ou le termine. */
export function ownsDrag(drag: DragState | null, pointerId: number): drag is DragState {
  return drag !== null && drag.pointerId === pointerId;
}
