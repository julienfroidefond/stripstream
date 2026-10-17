/**
 * Raccourcis clavier du lecteur.
 *
 * Module pur : la table de décodage vit ici (donc testable sans navigateur) et
 * `useReaderState` ne fait qu'exécuter l'action retournée. Les flèches suivent
 * le sens de lecture (inversées en RTL) comme les boutons à l'écran ; les
 * touches non spatiales (`PageUp` / `PageDown` / `Espace` / `Home` / `End`)
 * gardent un sens logique — « suivant » reste la page suivante.
 */

export type ReaderShortcutAction =
  | "previous-page"
  | "next-page"
  | "first-page"
  | "last-page"
  | "toggle-fullscreen"
  | "toggle-double-page"
  | "toggle-thumbnails"
  | "toggle-info"
  | "toggle-direction"
  | "toggle-shortcuts"
  | "close-reader";

export interface ReaderKeyEvent {
  key: string;
  target: EventTarget | null;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
}

export interface ReaderShortcutContext {
  /** Sens de lecture courant : inverse les flèches uniquement. */
  isRTL?: boolean;
  /** Sur iOS, l'API Fullscreen n'existe pas : la touche est alors ignorée. */
  isFullscreenAvailable?: boolean;
}

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

export function resolveReaderShortcut(
  event: ReaderKeyEvent,
  context: ReaderShortcutContext = {}
): ReaderShortcutAction | null {
  // Les raccourcis combinés à un modificateur restent au navigateur ou à l'OS.
  if (event.ctrlKey || event.metaKey || event.altKey) return null;

  // Ne jamais piloter le lecteur pendant la saisie d'un numéro de page.
  if (isEditableTarget(event.target)) return null;

  switch (event.key) {
    case "ArrowLeft":
      return context.isRTL ? "next-page" : "previous-page";
    case "ArrowRight":
      return context.isRTL ? "previous-page" : "next-page";
    case "PageUp":
      return "previous-page";
    case "PageDown":
      return "next-page";
    case " ":
    case "Spacebar":
      // Espace active le contrôle focalisé : ne pas le transformer en navigation.
      if (isActivableTarget(event.target)) return null;
      return event.shiftKey ? "previous-page" : "next-page";
    case "Home":
      return "first-page";
    case "End":
      return "last-page";
    case "Escape":
      return "close-reader";
    case "?":
      return "toggle-shortcuts";
    case "f":
    case "F":
      return context.isFullscreenAvailable ? "toggle-fullscreen" : null;
    case "d":
    case "D":
      return "toggle-double-page";
    case "t":
    case "T":
      return "toggle-thumbnails";
    case "i":
    case "I":
      return "toggle-info";
    case "r":
    case "R":
      return "toggle-direction";
    default:
      return null;
  }
}
