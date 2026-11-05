/**
 * Inertie du Wall.
 *
 * Le mur décélère selon une friction exponentielle : le facteur est élevé à la
 * puissance du temps écoulé, donc la glisse est identique à 60, 90 ou 120 Hz.
 * Un geste rapide part vite puis ralentit progressivement, au lieu de s'arrêter
 * net comme une simple animation de durée fixe.
 *
 * La vitesse signée est mesurée sur les derniers échantillons du doigt
 * (`wall-gesture.ts`) : elle garde donc le sens du geste, contrairement à une
 * vitesse absolue qu'il faudrait réorienter après coup.
 */

/**
 * Fraction de vitesse conservée par image de référence (60 Hz). Calée sur le
 * ralentissement d'une page web (~460 ms de constante de temps) : un flick
 * ordinaire parcourt plusieurs centaines de pixels avant de s'immobiliser.
 */
export const MOMENTUM_FRICTION = 0.965;

/** Durée d'une image de référence, en millisecondes. */
export const MOMENTUM_FRAME_MS = 1000 / 60;

/** Sous cette vitesse (px/ms), la glisse est imperceptible : on l'arrête. */
export const MOMENTUM_STOP = 0.02;

/** Plafond de vitesse (px/ms) : un flick violent ne doit pas traverser le mur. */
export const MOMENTUM_MAX = 2.6;

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
