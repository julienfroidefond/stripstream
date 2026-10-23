"use client";

import { useSyncExternalStore } from "react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const media = window.matchMedia(REDUCED_MOTION_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function getSnapshot() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function getServerSnapshot() {
  return false;
}

/**
 * Préférence système `prefers-reduced-motion`, réactive et compatible SSR.
 *
 * Pendant l'hydratation, React utilise le snapshot serveur (`false`) puis
 * resynchronise avant la peinture. Les callbacks GSAP doublent donc toujours
 * ce hook avec `prefersReducedMotion()` pour ne jamais animer par erreur.
 */
export function usePrefersReducedMotion() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
