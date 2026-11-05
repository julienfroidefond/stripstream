/**
 * Gestes du Wall — géométrie pure.
 *
 * Le mur se manipule comme une carte : un doigt le fait glisser au pixel près,
 * deux doigts le pincent autour de leur milieu, et le relâchement emporte
 * l'élan. Toute la trigonométrie vit ici, hors de React, pour rester testable :
 * le composant ne fait que brancher les événements pointeur sur ces fonctions.
 */

export interface WallPoint {
  x: number;
  y: number;
}

export interface WallPinchStart {
  /** Échelle de la caméra au début du pinch. */
  scale: number;
  /** Point du mur sous le milieu des doigts, dans le repère du cadre. */
  worldX: number;
  worldY: number;
}

export interface WallVelocitySample {
  x: number;
  y: number;
  /** Instant de l'échantillon, en millisecondes (`performance.now()`). */
  t: number;
}

/**
 * Déplacement sous lequel un appui reste un tap. Au-delà, le geste devient un
 * glissement : le clic de la tuile est avalé et la caméra garde son élan.
 */
export const WALL_TAP_SLOP = 8;

/** Fenêtre sur laquelle la vitesse de relâchement est mesurée. */
export const WALL_VELOCITY_WINDOW_MS = 120;

/** Doigt immobile depuis plus longtemps : pas d'élan, le mur s'arrête net. */
export const WALL_VELOCITY_STALE_MS = 80;

/** Sous cette vitesse (px/ms), le relâchement n'emporte rien. */
export const WALL_VELOCITY_MIN = 0.02;

export function wallDistance(first: WallPoint, second: WallPoint): number {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

export function wallMidpoint(first: WallPoint, second: WallPoint): WallPoint {
  return {
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
  };
}

/**
 * Capture le point du mur sous le milieu des doigts. Ce point reste collé aux
 * doigts pendant tout le pinch, y compris quand leur milieu se déplace : c'est
 * ce qui distingue un pinch-ancre d'un zoom centré sur l'écran.
 */
export function startWallPinch(
  camera: { x: number; y: number; scale: number },
  midpoint: WallPoint
): WallPinchStart {
  const scale = camera.scale > 0 ? camera.scale : 1;
  return {
    scale,
    worldX: (midpoint.x - camera.x) / scale,
    worldY: (midpoint.y - camera.y) / scale,
  };
}

/**
 * Caméra d'un pinch : l'échelle suit le rapport des distances entre les
 * doigts, puis on replace le point capturé sous leur milieu courant. Le
 * déplacement du milieu est donc absorbé par la translation, sans saut.
 */
export function pinchWallCamera(
  start: WallPinchStart,
  midpoint: WallPoint,
  distanceRatio: number,
  clampScale: (scale: number) => number
): { x: number; y: number; scale: number } {
  const ratio =
    Number.isFinite(distanceRatio) && distanceRatio > 0 ? distanceRatio : 1;
  const scale = clampScale(start.scale * ratio);
  return {
    x: midpoint.x - start.worldX * scale,
    y: midpoint.y - start.worldY * scale,
    scale,
  };
}

/**
 * Empile un échantillon et oublie ceux qui sortent de la fenêtre. On garde
 * toujours au moins un point : sans lui, aucune vitesse n'est mesurable.
 */
export function pushWallVelocitySample(
  samples: WallVelocitySample[],
  sample: WallVelocitySample,
  windowMs = WALL_VELOCITY_WINDOW_MS
): void {
  samples.push(sample);
  const cutoff = sample.t - windowMs;
  while (samples.length > 1 && samples[0].t < cutoff) samples.shift();
}

/**
 * Vitesse signée (px/ms) au relâchement. `null` quand le doigt s'est arrêté
 * avant de partir : relancer le mur dans ce cas donnerait une glisse fantôme.
 */
export function wallReleaseVelocity(
  samples: readonly WallVelocitySample[],
  now: number
): [number, number] | null {
  if (samples.length < 2) return null;

  const first = samples[0];
  const last = samples[samples.length - 1];
  if (now - last.t > WALL_VELOCITY_STALE_MS) return null;

  const elapsed = last.t - first.t;
  if (elapsed <= 0) return null;

  const vx = (last.x - first.x) / elapsed;
  const vy = (last.y - first.y) / elapsed;
  if (!Number.isFinite(vx) || !Number.isFinite(vy)) return null;
  if (Math.hypot(vx, vy) < WALL_VELOCITY_MIN) return null;

  return [vx, vy];
}
