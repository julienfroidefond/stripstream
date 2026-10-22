"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Arrivée d'une vignette : la couverture se pose au lieu d'apparaître d'un coup
 * quand le proxy livre l'image.
 *
 * Le test `complete` couvre le cas d'une vignette sortie du cache HTTP avant
 * que React n'attache `onLoad` : sans lui, l'image resterait invisible.
 *
 * En production, deux pannes distinctes laissaient une tuile noire :
 * - une vignette qui échoue ponctuellement (proxy occupé, coupure réseau) ;
 * - une requête qui reste bloquée côté amont, sans `error` ni `load`.
 *
 * On relance donc l'image jusqu'à deux fois avec un backoff jitteré. Pour les
 * couvertures réellement affichées (`eager`), un watchdog relance aussi une
 * requête qui n'a rien renvoyé au bout de quelques secondes. Le drapeau
 * `failed` permet à l'appelant d'afficher un repli lisible plutôt qu'un trou
 * noir définitif.
 */

const MAX_RETRIES = 2;
const RETRY_DELAYS_MS = [600, 1800] as const;
const RETRY_JITTER_MS = 250;
/** Une vignette de mur doit répondre vite ; au-delà, on relance la requête. */
const WATCHDOG_MS = 20000;

export interface UseCoverLoadedOptions {
  /** Couverture immédiatement visible : chargement prioritaire et watchdog. */
  eager?: boolean;
  /** Délai avant de relancer une requête bloquée (0 désactive le watchdog). */
  watchdogMs?: number;
}

export type CoverLoadStatus = "loading" | "loaded" | "failed";

interface LoadState {
  src: string;
  status: CoverLoadStatus;
}

export function useCoverLoaded(
  src: string,
  { eager = false, watchdogMs = WATCHDOG_MS }: UseCoverLoadedOptions = {}
) {
  const ref = useRef<HTMLImageElement>(null);
  const [state, setState] = useState<LoadState>({
    src,
    status: "loading",
  });
  // Nouvelle source : on repart de zéro sans passer par un setState dans un
  // effet. Ce motif est celui recommandé par React pour ajuster un état dérivé
  // d'une prop entre deux rendus.
  if (state.src !== src) {
    setState({ src, status: "loading" });
  }
  const status: CoverLoadStatus = !src
    ? "failed"
    : state.src === src
      ? state.status
      : "loading";
  const loaded = status === "loaded";
  const failed = status === "failed";
  const attemptRef = useRef(0);
  const sourceRef = useRef(src);
  const requestedSrcRef = useRef("");
  const retryTimerRef = useRef<number | null>(null);
  const watchdogTimerRef = useRef<number | null>(null);
  const retryRef = useRef<() => void>(() => undefined);
  const armWatchdogRef = useRef<() => void>(() => undefined);

  const clearRetryTimer = useCallback(() => {
    if (retryTimerRef.current !== null) {
      window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const clearWatchdog = useCallback(() => {
    if (watchdogTimerRef.current !== null) {
      window.clearTimeout(watchdogTimerRef.current);
      watchdogTimerRef.current = null;
    }
  }, []);

  const clearTimers = useCallback(() => {
    clearRetryTimer();
    clearWatchdog();
  }, [clearRetryTimer, clearWatchdog]);

  /**
   * Relance la source avec un cache-buster. Le backoff évite que toutes les
   * tuiles ratées repartent ensemble et re-saturent le proxy.
   */
  const retry = useCallback(
    (delayMs?: number) => {
      const image = ref.current;
      if (!image || !sourceRef.current) return;

      if (attemptRef.current >= MAX_RETRIES) {
        clearTimers();
        setState((current) =>
          current.src === sourceRef.current
            ? { ...current, status: "failed" }
            : current
        );
        return;
      }

      const attempt = attemptRef.current;
      attemptRef.current += 1;
      clearTimers();

      const delay =
        delayMs ??
        (RETRY_DELAYS_MS[attempt] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1]) +
          Math.random() * RETRY_JITTER_MS;

      retryTimerRef.current = window.setTimeout(() => {
        retryTimerRef.current = null;
        const current = ref.current;
        if (!current || !sourceRef.current) return;

        const url = new URL(sourceRef.current, window.location.href);
        url.searchParams.set(
          "retry",
          `${attemptRef.current}-${Date.now().toString(36)}`
        );
        requestedSrcRef.current = url.toString();
        current.src = url.toString();
        armWatchdogRef.current();
      }, delay);
    },
    [clearTimers]
  );

  const armWatchdog = useCallback(() => {
    clearWatchdog();
    if (!eager || watchdogMs <= 0) return;

    watchdogTimerRef.current = window.setTimeout(() => {
      watchdogTimerRef.current = null;
      retryRef.current();
    }, watchdogMs);
  }, [clearWatchdog, eager, watchdogMs]);

  // Les deux fonctions se rappellent mutuellement : on passe par des refs pour
  // garder des callbacks stables et éviter une boucle de dépendances.
  useEffect(() => {
    retryRef.current = () => retry(0);
    armWatchdogRef.current = armWatchdog;
  }, [armWatchdog, retry]);

  // Nouvelle source : on repart de zéro, y compris après un changement de
  // filtre sur le mur (la même tuile réutilise son <img>).
  useEffect(() => {
    sourceRef.current = src;
    attemptRef.current = 0;
    clearTimers();

    if (!src) {
      requestedSrcRef.current = "";
      return clearTimers;
    }

    const image = ref.current;
    if (!image) return clearTimers;

    requestedSrcRef.current = new URL(src, window.location.href).toString();

    if (image.complete) {
      if (image.naturalWidth > 0) {
        setState((current) =>
          current.src === src ? { ...current, status: "loaded" } : current
        );
      } else if (attemptRef.current === 0) {
        // Échec survenu avant l'attachement de `onError` (souvent une image
        // servie depuis le cache) : on relance la même procédure. Si `onError`
        // a déjà planifié une relance, on la laisse faire.
        retry(120);
      }
    }
    return clearTimers;
  }, [clearTimers, retry, src]);

  // Le watchdog suit la visibilité réelle de la tuile, sans réinitialiser son
  // état de chargement quand elle entre ou sort simplement du cadre.
  useEffect(() => {
    if (!eager || loaded || failed) {
      clearWatchdog();
      return;
    }

    const image = ref.current;
    if (!image || image.complete) return;

    armWatchdog();
    return clearWatchdog;
  }, [armWatchdog, clearWatchdog, eager, failed, loaded]);

  const onLoad = useCallback(
    (event: React.SyntheticEvent<HTMLImageElement>) => {
      if (!sourceRef.current) return;
      // Une requête précédente peut se terminer après une relance : seule la
      // source courante fait foi.
      if (
        requestedSrcRef.current &&
        event.currentTarget.src !== requestedSrcRef.current
      ) {
        return;
      }
      clearTimers();
      attemptRef.current = 0;
      setState({ src: sourceRef.current, status: "loaded" });
    },
    [clearTimers]
  );

  const onError = useCallback(
    (event: React.SyntheticEvent<HTMLImageElement>) => {
      if (!sourceRef.current) return;
      if (
        requestedSrcRef.current &&
        event.currentTarget.src !== requestedSrcRef.current
      ) {
        return;
      }
      setState((current) =>
        current.src === src ? { ...current, status: "loading" } : current
      );
      retry();
    },
    [retry, src]
  );

  return { ref, loaded, failed, onLoad, onError };
}
