/**
 * Inertie du Wall.
 *
 * `@use-gesture` ne publie qu'une vitesse **absolue** (pixels par milliseconde) :
 * le sens du geste vient de `state.direction` (signe du dernier delta), avec
 * `state.movement` en secours. Sans ce signe, un flick vers la gauche repartait
 * vers la droite et le mur semblait aller à l'envers.
 *
 * Le mur décélère ensuite selon une friction exponentielle : le facteur est
 * élevé à la puissance du temps écoulé, donc la glisse est identique à 60, 90
 * ou 120 Hz. Un geste rapide part vite puis ralentit progressivement, au lieu
 * de s'arrêter net comme une simple animation de durée fixe.
 */

/** Fraction de vitesse conservée par image de référence (60 Hz). */
export const MOMENTUM_FRICTION = 0.94;

/** Durée d'une image de référence, en millisecondes. */
export const MOMENTUM_FRAME_MS = 1000 / 60;

/** Sous cette vitesse (px/ms), la glisse est imperceptible : on l'arrête. */
export const MOMENTUM_STOP = 0.015;

/** Plafond de vitesse (px/ms) : un flick violent ne doit pas traverser le mur. */
export const MOMENTUM_MAX = 2.6;

type Vector = readonly [number, number];

/**
 * Vitesse signée d'un geste. `velocity` est toujours positive ; `direction`
 * donne le signe du dernier mouvement et `movement` sert de repli quand le
 * dernier delta est nul (fin de geste immobile).
 */
export function signedVelocity(
  velocity: Vector,
  direction: Vector,
  movement: Vector
): [number, number] {
  return [0, 1].map((axis) => {
    const sign = direction[axis] || Math.sign(movement[axis]);
    return velocity[axis] * sign;
  }) as [number, number];
}

/** Applique une friction indépendante de la fréquence d'affichage. */
export function decayMomentum(value: number, elapsedMs: number): number {
  if (elapsedMs <= 0) return value;
  return value * MOMENTUM_FRICTION ** (elapsedMs / MOMENTUM_FRAME_MS);
}

/** Réduit la vitesse à `max` sans changer sa direction. */
export function capMomentum(
  vx: number,
  vy: number,
  max: number = MOMENTUM_MAX
): [number, number] {
  const magnitude = Math.hypot(vx, vy);
  if (!Number.isFinite(magnitude)) return [0, 0];
  if (magnitude <= max) return [vx, vy];
  const factor = max / magnitude;
  return [vx * factor, vy * factor];
}

/** Vrai quand l'inertie est assez faible pour être coupée sans à-coup. */
export function isMomentumDying(vx: number, vy: number): boolean {
  return Math.hypot(vx, vy) < MOMENTUM_STOP;
}
