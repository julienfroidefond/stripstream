import type { Variants } from "framer-motion";

/**
 * Langage de mouvement « projection ».
 *
 * Une seule famille de courbes pour toute l'application : un départ vif et une
 * arrivée posée, comme un projecteur qui se cale. Les valeurs vivent ici pour
 * que chaque surface raconte la même chose.
 *
 * Les amplitudes sont volontairement franches : un geste doit se lire, pas se
 * deviner. Le flou d'entrée fait office de mise au point — l'objectif fait le
 * point sur chaque élément au moment où il entre en scène.
 */
export const EASE_PROJECTION: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** Courbe d'appui pour les micro-interactions (survol, focus). */
export const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

/**
 * Vol de la caméra vers une œuvre : la cible est dépassée d'un rien avant que
 * l'image se pose, comme un projecteur qui corrige son cadrage.
 */
export const EASE_FOCUS: [number, number, number, number] = [0.18, 1.075, 0.32, 1];

/** Perspective commune aux gestes en 3D (cartes distribuées, affiches qui pivotent). */
export const PERSPECTIVE = 1100;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 36, filter: "blur(8px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transitionEnd: { filter: "none" },
    transition: { duration: 0.9, ease: EASE_PROJECTION },
  },
};

/** Pose d'une affiche : elle monte, grandit et fait le point. */
export const settleIn: Variants = {
  hidden: { opacity: 0, y: 48, scale: 0.9, filter: "blur(10px)" },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transitionEnd: { filter: "none" },
    transition: { duration: 1, ease: EASE_PROJECTION },
  },
};

/**
 * Carte distribuée : dans un rail horizontal, chaque affiche arrive de la
 * droite en pivotant, comme une main de cartes qu'on étale sur la table.
 */
export const dealIn: Variants = {
  hidden: {
    opacity: 0,
    x: 90,
    rotateY: -28,
    scale: 0.88,
    filter: "blur(10px)",
    transformPerspective: PERSPECTIVE,
  },
  visible: {
    opacity: 1,
    x: 0,
    rotateY: 0,
    scale: 1,
    filter: "blur(0px)",
    transformPerspective: PERSPECTIVE,
    transitionEnd: { filter: "none" },
    transition: { duration: 1.05, ease: EASE_PROJECTION },
  },
};

/** Affiche de bandeau qui se lève en pivotant vers le spectateur. */
export const liftIn: Variants = {
  hidden: {
    opacity: 0,
    y: 70,
    rotateX: 22,
    rotateZ: -4,
    scale: 0.86,
    filter: "blur(12px)",
    transformPerspective: PERSPECTIVE,
  },
  visible: {
    opacity: 1,
    y: 0,
    rotateX: 0,
    rotateZ: 0,
    scale: 1,
    filter: "blur(0px)",
    transformPerspective: PERSPECTIVE,
    transitionEnd: { filter: "none" },
    transition: { duration: 1.15, ease: EASE_PROJECTION },
  },
};

/** Titre révélé par un masque : le texte remonte depuis sous sa ligne de base. */
export const maskUp: Variants = {
  hidden: { y: "110%" },
  visible: { y: "0%", transition: { duration: 0.9, ease: EASE_PROJECTION } },
};

/** Trait d'accent qui se trace sous un titre de section. */
export const drawLine: Variants = {
  hidden: { scaleX: 0 },
  visible: { scaleX: 1, transition: { duration: 0.9, ease: EASE_PROJECTION, delay: 0.25 } },
};

/**
 * Rideau d'ouverture : la scène s'ouvre depuis un cadre resserré jusqu'à son
 * plein format, le fond se recule pendant ce temps.
 */
export const curtainOpen: Variants = {
  hidden: { clipPath: "inset(14% 10% 14% 10% round 32px)" },
  visible: {
    clipPath: "inset(0% 0% 0% 0% round 16px)",
    transition: { duration: 1.2, ease: EASE_PROJECTION },
  },
};

export function staggerContainer(stagger = 0.08, delayChildren = 0.06): Variants {
  return {
    hidden: {},
    visible: { transition: { staggerChildren: stagger, delayChildren } },
  };
}

/**
 * Carrousel d'affiches : la diapositive sortante pivote et s'éloigne, la
 * suivante entre de l'autre côté en faisant le point. `custom` = sens (+1/-1).
 * L'amplitude est franche (la diapositive venue d'ailleurs se lit d'un coup
 * d'œil) et le ressort se cale vite, pour que le geste réponde au clic.
 */
export const carouselSlide: Variants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 220 : -220,
    rotateY: dir > 0 ? -28 : 28,
    scale: 0.9,
    opacity: 0,
    filter: "blur(10px)",
    transformPerspective: PERSPECTIVE,
  }),
  center: {
    x: 0,
    rotateY: 0,
    scale: 1,
    opacity: 1,
    filter: "blur(0px)",
    transformPerspective: PERSPECTIVE,
  },
  exit: (dir: number) => ({
    x: dir > 0 ? -220 : 220,
    rotateY: dir > 0 ? 28 : -28,
    scale: 0.9,
    opacity: 0,
    filter: "blur(10px)",
    transformPerspective: PERSPECTIVE,
  }),
};

export const CAROUSEL_TRANSITION = {
  // Presque critique : la diapositive se pose en ~0,45 s au lieu de dériver.
  default: { type: "spring", stiffness: 320, damping: 30, mass: 0.75 },
  opacity: { duration: 0.22, ease: EASE_OUT },
  filter: { duration: 0.3, ease: EASE_OUT },
} as const;

/** Écran pleine largeur qui se déroule de haut en bas à l'arrivée sur la page. */
export const screenUnroll: Variants = {
  hidden: { clipPath: "inset(0% 0% 100% 0%)" },
  visible: { clipPath: "inset(0% 0% 0% 0%)", transition: { duration: 1.1, ease: EASE_PROJECTION } },
};
