/**
 * Géométrie du tourné de page.
 *
 * La feuille est découpée en bandes verticales imbriquées : chaque bande pivote
 * autour du bord de la précédente. En donnant aux bandes éloignées de la
 * reliure un angle cumulé plus grand, le bord libre devance la reliure et la
 * feuille se courbe comme du papier, au lieu de pivoter d'un bloc.
 *
 * Module pur : le rendu (`PageTurnOverlay`) ne fait qu'appliquer ces valeurs.
 */

export interface PageRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Une place de page à l'écran : l'image affichée et son cadre mesuré. */
export interface PageSlot {
  url: string | null;
  rect: PageRect | null;
}

/** Ce que le lecteur montre à un instant donné, places dans l'ordre visuel (gauche → droite). */
export interface ReaderSnapshot {
  currentPage: number;
  slots: PageSlot[];
}

export interface TurnPlan {
  /** Côté de la feuille qui tient à la reliure. */
  hinge: "left" | "right";
  /** La feuille qui se tourne : son recto est l'ancienne page. */
  leaf: { url: string; rect: PageRect };
  /**
   * Le verso de la feuille. En double page, c'est la nouvelle page qui se pose
   * de l'autre côté de la reliure ; sinon, `null` (dos de papier, qui s'efface).
   */
  backUrl: string | null;
  /** Anciennes pages restées à plat, tenues jusqu'à ce que la feuille les recouvre. */
  under: { url: string; rect: PageRect }[];
}

/** Au-delà de deux pages d'écart (miniature, saisie), on saute sans tourner. */
const MAX_TURN_DELTA = 2;

function isVisible(slot: PageSlot): slot is { url: string; rect: PageRect } {
  return Boolean(slot.url && slot.rect && slot.rect.width > 0 && slot.rect.height > 0);
}

/**
 * Décide quelle feuille tourne, et dans quel sens.
 *
 * Avancer en lecture gauche → droite fait passer la feuille de droite vers la
 * gauche (reliure à gauche de la feuille) ; reculer, ou lire de droite à
 * gauche, inverse le geste. La feuille est toujours l'ancienne page située du
 * côté d'où part le geste.
 */
export function planTurn(prev: ReaderSnapshot, next: ReaderSnapshot, isRTL: boolean): TurnPlan | null {
  const delta = next.currentPage - prev.currentPage;
  if (delta === 0 || Math.abs(delta) > MAX_TURN_DELTA) return null;

  const visible = prev.slots.filter(isVisible);
  if (visible.length === 0) return null;

  const forward = delta > 0;
  const towardLeft = forward !== isRTL;
  const leaf = towardLeft ? visible[visible.length - 1] : visible[0];
  const under = visible.filter((slot) => slot !== leaf);

  // Le verso n'a de sens que si la feuille se pose sur une place de page :
  // d'une double page à une double page.
  const isSpread = prev.slots.length > 1 && next.slots.length > 1;
  const landing = towardLeft ? next.slots[0] : next.slots[next.slots.length - 1];
  const backUrl = isSpread ? (landing?.url ?? null) : null;

  return {
    hinge: towardLeft ? "left" : "right",
    leaf: { url: leaf.url, rect: leaf.rect },
    backUrl,
    under: under.map(({ url, rect }) => ({ url, rect })),
  };
}

/** Lever, balayer, poser : lent aux extrémités, vif au milieu. */
export function easeTurn(t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  return -(Math.cos(Math.PI * clamped) - 1) / 2;
}

/**
 * Angle cumulé (en degrés, 0 = à plat, 180 = retournée) de chaque bande.
 *
 * La bande de la reliure suit la rotation de base ; les suivantes y ajoutent
 * une courbure maximale à mi-course et nulle aux deux extrémités, pour que la
 * feuille parte et arrive à plat. Aucun angle ne dépasse 180° : la feuille ne
 * passe jamais « sous » la page.
 */
export function leafAngles(progress: number, strips: number, maxCurl = 75): number[] {
  const p = Math.min(1, Math.max(0, progress));
  const base = 180 * p;
  const curl = maxCurl * Math.sin(Math.PI * p);
  return Array.from({ length: strips }, (_, index) => {
    const reach = strips > 1 ? index / (strips - 1) : 0;
    return Math.min(180, base + curl * Math.pow(reach, 1.4));
  });
}

/**
 * Position projetée du bord libre, en fraction de la largeur de la feuille
 * depuis la reliure (1 = à plat, 0 = à la verticale, < 0 = passé la reliure).
 * Sert à placer l'ombre portée sur la page révélée.
 */
export function freeEdgeOffset(angles: number[]): number {
  if (angles.length === 0) return 1;
  const share = 1 / angles.length;
  return angles.reduce((sum, angle) => sum + share * Math.cos((angle * Math.PI) / 180), 0);
}
