/**
 * Raccourcis clavier du lecteur.
 *
 * Module pur : la table de décodage vit ici (donc testable sans navigateur) et
 * `useReaderState` ne fait qu'exécuter l'action retournée. Les flèches sont
 * spatiales : leur action vient de la politique de côtés partagée avec les
 * boutons, le swipe et l'aide (`@/lib/reader/side-actions`) ; les
 * touches non spatiales (`PageUp` / `PageDown` / `Espace` / `Home` / `End`)
 * gardent un sens logique — « suivant » reste la page suivante.
 */

import { isActivableTarget, isEditableTarget } from "@/lib/keyboard-targets";
import { actionForSide, sideForArrowKey } from "@/lib/reader/side-actions";

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

/**
 * Calques qui possèdent le clavier tant qu'ils ont le focus : menus Radix
 * (fond du lecteur), listes, popovers et dialogues. `Échap` doit les fermer et
 * les lettres ou `Home`/`End` y naviguer, sans piloter le lecteur dessous.
 */
const OVERLAY_SELECTOR = [
  '[role="menu"]',
  '[role="menubar"]',
  '[role="listbox"]',
  '[role="dialog"]',
  '[role="alertdialog"]',
  "[data-radix-popper-content-wrapper]",
].join(",");

/** Vrai quand la touche part d'un menu, d'une liste ou d'un dialogue ouvert. */
export function isOverlayTarget(target: EventTarget | null): boolean {
  const element = target as Element | null;
  if (!element || typeof element.closest !== "function") return false;
  return element.closest(OVERLAY_SELECTOR) !== null;
}

export function resolveReaderShortcut(
  event: ReaderKeyEvent,
  context: ReaderShortcutContext = {}
): ReaderShortcutAction | null {
  // Les raccourcis combinés à un modificateur restent au navigateur ou à l'OS.
  if (event.ctrlKey || event.metaKey || event.altKey) return null;

  // Ne jamais piloter le lecteur pendant la saisie d'un numéro de page.
  if (isEditableTarget(event.target)) return null;

  // Un menu ou un dialogue focalisé garde ses touches (Échap le ferme).
  if (isOverlayTarget(event.target)) return null;

  const side = sideForArrowKey(event.key);
  if (side) {
    const action = actionForSide(side, context.isRTL ? "rtl" : "ltr");
    return action === "previous" ? "previous-page" : "next-page";
  }

  switch (event.key) {
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
