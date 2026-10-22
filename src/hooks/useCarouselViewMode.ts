"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useUserScope } from "@/contexts/UserScopeContext";
import { buildStorageKey } from "@/lib/storage";

/**
 * Deux façons de parcourir une rangée de l'accueil :
 * - `classic` : le rail horizontal historique (défaut) ;
 * - `spotlight` : un élément à la fois, avec balayage et pastilles.
 */
export type CarouselViewMode = "classic" | "spotlight";

const VALID_VIEW_MODES: ReadonlySet<string> = new Set<CarouselViewMode>([
  "classic",
  "spotlight",
]);

/** Événement local : `storage` ne se déclenche pas dans l'onglet qui écrit. */
const VIEW_MODE_CHANGE_EVENT = "stripstream:carousel-view-mode";

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(VIEW_MODE_CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(VIEW_MODE_CHANGE_EVENT, onStoreChange);
  };
}

interface CarouselViewModeOptions {
  /**
   * Mode rendu côté serveur et utilisé quand aucune préférence n'est
   * enregistrée. « Pour vous » part en spotlight, les autres rangées en rail.
   */
  defaultMode?: CarouselViewMode;
}

/**
 * Préférence d'affichage d'un carrousel, mémorisée par utilisateur.
 *
 * Le snapshot serveur reprend le mode par défaut de la rangée ; le client lit
 * ensuite la valeur enregistrée via `useSyncExternalStore`, ce qui évite tout
 * écart d'hydratation. La clé est scopée par utilisateur : deux comptes
 * partageant le même navigateur ne doivent pas hériter de la vue de l'autre.
 */
export function useCarouselViewMode(
  storageSuffix: string,
  { defaultMode = "classic" }: CarouselViewModeOptions = {}
) {
  const scope = useUserScope();
  const storageKey = buildStorageKey(scope, storageSuffix);

  const getSnapshot = useCallback((): CarouselViewMode => {
    const stored = window.localStorage.getItem(storageKey);
    return stored && VALID_VIEW_MODES.has(stored)
      ? (stored as CarouselViewMode)
      : defaultMode;
  }, [storageKey, defaultMode]);

  const getServerSnapshot = useCallback(() => defaultMode, [defaultMode]);

  const viewMode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggleViewMode = useCallback(() => {
    const next: CarouselViewMode = getSnapshot() === "classic" ? "spotlight" : "classic";
    window.localStorage.setItem(storageKey, next);
    window.dispatchEvent(new Event(VIEW_MODE_CHANGE_EVENT));
  }, [getSnapshot, storageKey]);

  return { viewMode, toggleViewMode };
}
