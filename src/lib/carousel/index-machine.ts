/**
 * Transitions pures de l'index d'un carrousel cyclique.
 *
 * `SpotlightCarousel` ne garde que l'état React et les effets visuels ; le
 * bouclage, le refus d'un changement vers la diapositive courante et la pose
 * sur le premier nouvel élément après un chargement incrémental vivent ici.
 */

/** Ramène un index dans `[0, total)` ; `0` sans diapositive. */
export function wrapIndex(index: number, total: number): number {
  if (total <= 0) return 0;
  return ((index % total) + total) % total;
}

export interface GoToResult {
  index: number;
  changed: boolean;
}

/** Cible d'une pastille ou d'un balayage, modulo le nombre de diapositives. */
export function resolveGoTo(index: number, target: number, total: number): GoToResult {
  if (total === 0) return { index, changed: false };

  const next = wrapIndex(target, total);
  return { index: next, changed: next !== wrapIndex(index, total) };
}

export interface SlidesChange {
  index: number;
  moved: boolean;
  /** Index occupé avant le changement, pour le fondu du fond. */
  fromIndex: number;
}

/**
 * Nouvel index quand la rangée charge ou retire des diapositives : une rangée
 * qui grandit se pose sur le premier nouvel élément, une rangée qui rétrécit
 * ramène l'index dans ses bornes.
 */
export function resolveSlidesChange(
  index: number,
  previousTotal: number,
  total: number
): SlidesChange {
  if (total > previousTotal) {
    return { index: previousTotal, moved: true, fromIndex: index };
  }

  if (total > 0 && index >= total) {
    return { index: Math.max(0, total - 1), moved: true, fromIndex: index };
  }

  return { index, moved: false, fromIndex: index };
}
