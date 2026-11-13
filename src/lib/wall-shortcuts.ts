/**
 * Raccourcis clavier du Wall — table pure.
 *
 * `WallExperience` n'écoute plus que `keydown` et exécute l'action retournée.
 * La garde de saisie est partagée avec le lecteur (`isEditableTarget`, `@/lib/keyboard-targets`) : un champ,
 * une zone éditable ou un `select` gardent leurs touches.
 */
import { isEditableTarget } from "@/lib/keyboard-targets";

export type WallShortcutAction =
  /** `Entrée` / `Espace` : activation explicite, la garde de clic se lève. */
  | "activate"
  /** `Échap` : referme la plaque et le panneau de filtres. */
  | "close"
  | "zoom-in"
  | "zoom-out"
  | "reset"
  | "overview"
  | "random";

export interface WallKeyEvent {
  key: string;
  target: EventTarget | null;
  defaultPrevented?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
}

export interface WallShortcutContext {
  /** Le panneau de filtres est ouvert : seules l'activation et `Échap` passent. */
  panelOpen: boolean;
}

export function resolveWallShortcut(
  event: WallKeyEvent,
  context: WallShortcutContext
): WallShortcutAction | null {
  if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) {
    return null;
  }
  if (isEditableTarget(event.target)) return null;

  // Une activation clavier ne doit pas être avalée par la garde laissée par
  // le pinch ou le drag précédent.
  if (event.key === "Enter" || event.key === " ") return "activate";
  if (event.key === "Escape") return "close";
  if (context.panelOpen) return null;

  switch (event.key) {
    case "+":
    case "=":
      return "zoom-in";
    case "-":
    case "_":
      return "zoom-out";
    case "0":
      return "reset";
    case "f":
    case "F":
      return "overview";
    case "r":
    case "R":
      return "random";
    default:
      return null;
  }
}

/** Les actions de caméra confisquent la touche ; l'activation et `Échap` non. */
export function wallShortcutPreventsDefault(action: WallShortcutAction): boolean {
  return action !== "activate" && action !== "close";
}
