"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Arrivée de vignette : la couverture se pose au lieu d'apparaître d'un coup
 * quand le proxy livre l'image.
 *
 * Le test `complete` couvre le cas d'une vignette sortie du cache HTTP avant
 * que React n'attache `onLoad` : sans lui, l'image resterait invisible.
 */
export function useCoverLoaded() {
  const ref = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (ref.current?.complete) {
      setLoaded(true);
    }
  }, []);

  const onLoad = useCallback(() => setLoaded(true), []);

  return { ref, loaded, onLoad };
}
