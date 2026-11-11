/**
 * Les phases d'interaction du Wall. Elles nomment ce que l'utilisateur fait
 * (regarder, déplacer, viser, lire une plaque) au lieu de laisser chaque
 * attribut DOM deviner l'état à partir de plusieurs booléens.
 */
export const WALL_PHASES = [
  "idle",
  "pan",
  "focus",
  "plaque",
  "sheet",
] as const;

export type WallPhase = (typeof WALL_PHASES)[number];

export type WallPhaseEvent =
  | "PAN_START"
  | "PAN_END"
  | "FOCUS_START"
  | "FOCUS_SETTLE_ANCHOR"
  | "FOCUS_SETTLE_SHEET"
  | "CLOSE";

const TRANSITIONS: Record<WallPhase, Partial<Record<WallPhaseEvent, WallPhase>>> = {
  idle: {
    PAN_START: "pan",
    FOCUS_START: "focus",
  },
  pan: {
    PAN_END: "idle",
    FOCUS_START: "focus",
    CLOSE: "idle",
  },
  focus: {
    PAN_START: "pan",
    FOCUS_START: "focus",
    FOCUS_SETTLE_ANCHOR: "plaque",
    FOCUS_SETTLE_SHEET: "sheet",
    CLOSE: "idle",
  },
  plaque: {
    PAN_START: "pan",
    FOCUS_START: "focus",
    CLOSE: "idle",
  },
  sheet: {
    PAN_START: "pan",
    FOCUS_START: "focus",
    CLOSE: "idle",
  },
};

/** Transition pure : un événement sans cible laisse la phase inchangée. */
export function nextWallPhase(
  phase: WallPhase,
  event: WallPhaseEvent
): WallPhase {
  return TRANSITIONS[phase][event] ?? phase;
}

/** La plaque mobile devient une feuille ; la plaque ancrée reste une plaque. */
export function phaseForPlaque(mode: "anchor" | "sheet"): WallPhase {
  return mode === "sheet" ? "sheet" : "plaque";
}

/**
 * La plaque arrive pendant le vol, quand l'affiche est déjà lancée. Le délai
 * appartient à la machine, pas au composant qui déclenche le focus.
 */
export function plaqueRevealDelay(duration: number, reduce: boolean): number {
  return reduce ? 0 : Math.max(300, duration * 1000 - 300);
}
