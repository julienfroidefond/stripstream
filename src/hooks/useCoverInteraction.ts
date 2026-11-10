"use client";

import { useState } from "react";
import type {
  FocusEvent as ReactFocusEvent,
  PointerEvent as ReactPointerEvent,
} from "react";

/**
 * État d'ouverture d'une couverture pilotée par la carte qui la contient.
 *
 * `BookCoverScene` gère déjà le survol, le focus et l'appui directement sur
 * son propre arbre. Ce hook sert quand un lien ou un bouton englobe la scène :
 * il permet de propager le même état à la couverture sans imbriquer deux
 * éléments interactifs.
 */
export function useCoverInteraction<T extends HTMLElement>() {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);

  const handlePointerEnter = (event: ReactPointerEvent<T>) => {
    if (event.pointerType === "mouse") setHovered(true);
  };

  const handlePointerLeave = (event: ReactPointerEvent<T>) => {
    if (event.pointerType === "mouse") setHovered(false);
    setPressed(false);
  };

  const handlePointerDown = (event: ReactPointerEvent<T>) => {
    if (event.pointerType !== "mouse") setPressed(true);
  };

  const handlePointerUp = (event: ReactPointerEvent<T>) => {
    if (event.pointerType !== "mouse") setPressed(false);
  };

  const handleFocus = (event: ReactFocusEvent<T>) => {
    if (event.currentTarget.matches(":focus-visible")) setFocused(true);
  };

  const handleBlur = (event: ReactFocusEvent<T>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    setFocused(false);
  };

  return {
    active: hovered || focused || pressed,
    handlers: {
      onPointerEnter: handlePointerEnter,
      onPointerLeave: handlePointerLeave,
      onPointerDown: handlePointerDown,
      onPointerUp: handlePointerUp,
      onPointerCancel: () => setPressed(false),
      onFocus: handleFocus,
      onBlur: handleBlur,
    },
  };
}
