import type { Variants } from "framer-motion";

/**
 * Langage de mouvement « projection ».
 *
 * Une seule famille de courbes pour toute l'application : un départ vif et une
 * arrivée posée, comme un projecteur qui se cale. Les valeurs vivent ici pour
 * que chaque surface raconte la même chose.
 */
export const EASE_PROJECTION: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** Courbe d'appui pour les micro-interactions (survol, focus). */
export const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_PROJECTION } },
};

/** Affiche qui se lève : légère mise à l'échelle, jamais depuis 0. */
export const liftIn: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease: EASE_PROJECTION } },
};

/** Titre révélé par un masque qui glisse vers le haut. */
export const maskUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE_PROJECTION } },
};

export function staggerContainer(stagger = 0.05, delayChildren = 0.04): Variants {
  return {
    hidden: {},
    visible: { transition: { staggerChildren: stagger, delayChildren } },
  };
}
