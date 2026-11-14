/**
 * Gardes clavier partagées par les surfaces à raccourcis (lecteur, mur).
 *
 * Une seule définition de « l'utilisateur est en train de saisir » et de
 * « l'élément focalisé consomme Espace », pour que deux surfaces ne divergent
 * pas sur ce qui avale un raccourci (ADR 0010).
 */

const EDITABLE_SELECTOR = [
  'input:not([type="button"]):not([type="submit"]):not([type="reset"])',
  "textarea",
  "select",
  '[contenteditable]:not([contenteditable="false"])',
].join(",");

/**
 * Éléments pour lesquels `Espace` déclenche une action native (activation du
 * contrôle focalisé). Le lecteur ne doit pas confisquer la touche.
 */
const ACTIVATABLE_SELECTOR = [
  "button",
  "a[href]",
  "summary",
  '[role="button"]',
  '[role="link"]',
  '[role="checkbox"]',
  '[role="menuitem"]',
  '[role="menuitemradio"]',
  '[role="option"]',
  '[role="radio"]',
  '[role="switch"]',
  '[role="tab"]',
].join(",");

function closestMatch(target: EventTarget | null, selector: string): boolean {
  const element = target as Element | null;
  if (!element || typeof element.closest !== "function") return false;
  return element.closest(selector) !== null;
}

/** Vrai pendant la saisie d'un numéro de page ou dans un champ de dialogue. */
export function isEditableTarget(target: EventTarget | null): boolean {
  return closestMatch(target, EDITABLE_SELECTOR);
}

/** Vrai quand `Espace` appartient à l'élément focalisé (bouton, lien, onglet…). */
export function isActivableTarget(target: EventTarget | null): boolean {
  return closestMatch(target, ACTIVATABLE_SELECTOR);
}
