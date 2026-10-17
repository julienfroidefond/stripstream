"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Arrivée de vignette : la couverture se pose au lieu d'apparaître d'un coup
 * quand le proxy livre l'image.
 *
 * Le test `complete` couvre le cas d'une vignette sortie du cache HTTP avant
 * que React n'attache `onLoad` : sans lui, l'image resterait invisible.
 *
 * Une vignette peut aussi échouer ponctuellement (proxy occupé pendant un
 * changement de format, coupure réseau, quota). Sans relance, elle resterait
 * invisible pour toujours — c'est le « certaines images sont ko ». On retente
 * une fois avec un cache-buster : l'échec transitoire disparaît, et le drapeau
 * `retried` empêche toute boucle si l'image est réellement absente.
 */
export function useCoverLoaded() {
  const ref = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);

  const retry = useCallback(() => {
    const image = ref.current;
    if (!image || image.dataset.retried === "1") return;
    image.dataset.retried = "1";
    const url = new URL(image.src, window.location.href);
    url.searchParams.set("retry", Date.now().toString(36));
    image.src = url.toString();
  }, []);

  useEffect(() => {
    const image = ref.current;
    if (!image?.complete) return;
    if (image.naturalWidth > 0) {
      setLoaded(true);
      return;
    }
    // Échec survenu avant l'attachement de `onError` (souvent une image servie
    // depuis le cache) : on relance la même procédure.
    retry();
  }, [retry]);

  const onLoad = useCallback(() => setLoaded(true), []);
  const onError = useCallback(() => retry(), [retry]);

  return { ref, loaded, onLoad, onError };
}
