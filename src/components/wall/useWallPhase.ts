"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  nextWallPhase,
  phaseForPlaque,
  plaqueRevealDelay,
  type WallPhase,
} from "@/lib/wall-phase";

import type { WallPlaqueAnchor } from "./WallPlaque";

export interface ActivePlaqueState {
  key: string;
  index: number;
  mode: "anchor" | "sheet";
  anchor: WallPlaqueAnchor | null;
  /** Hauteur maximale réservée à la feuille pour que l'affiche reste au-dessus. */
  sheetMaxHeight?: number;
}

interface UseWallPhaseOptions {
  reduce: boolean;
  /** Rend au mur l'affiche visée par le vol en cours. */
  onSettleFocus: () => void;
}

/**
 * La machine de phases du Wall.
 *
 * Elle possède les transitions, le minuteur qui fait apparaître la plaque et
 * la durée de vie de l'affiche pressée. `WallExperience` ne garde que la
 * géométrie du cadrage et le rendu.
 */
export function useWallPhase({ reduce, onSettleFocus }: UseWallPhaseOptions) {
  const [phase, setPhase] = useState<WallPhase>("idle");
  const [active, setActive] = useState<ActivePlaqueState | null>(null);
  /** Œuvre visée pendant le vol de la caméra, avant que la plaque se pose. */
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const revealTimerRef = useRef<number | null>(null);
  const settleRef = useRef(onSettleFocus);

  useEffect(() => {
    settleRef.current = onSettleFocus;
  }, [onSettleFocus]);

  const cancelReveal = useCallback(() => {
    if (revealTimerRef.current !== null) {
      window.clearTimeout(revealTimerRef.current);
      revealTimerRef.current = null;
    }
  }, []);

  const close = useCallback(() => {
    cancelReveal();
    settleRef.current();
    setActive(null);
    setFocusKey(null);
    setPhase((previous) => nextWallPhase(previous, "CLOSE"));
  }, [cancelReveal]);

  const beginPan = useCallback(() => {
    cancelReveal();
    settleRef.current();
    setActive(null);
    setFocusKey(null);
    setPhase((previous) => nextWallPhase(previous, "PAN_START"));
  }, [cancelReveal]);

  const endPan = useCallback(() => {
    setPhase((previous) => nextWallPhase(previous, "PAN_END"));
  }, []);

  const focus = useCallback(
    (next: ActivePlaqueState, duration: number) => {
      cancelReveal();
      settleRef.current();
      setActive(null);
      setFocusKey(next.key);
      setPhase((previous) => nextWallPhase(previous, "FOCUS_START"));

      revealTimerRef.current = window.setTimeout(() => {
        revealTimerRef.current = null;
        settleRef.current();
        setFocusKey(null);
        setActive(next);
        setPhase((previous) =>
          nextWallPhase(previous, phaseForPlaque(next.mode) === "sheet" ? "FOCUS_SETTLE_SHEET" : "FOCUS_SETTLE_ANCHOR")
        );
      }, plaqueRevealDelay(duration, reduce));
    },
    [cancelReveal, reduce]
  );

  useEffect(() => cancelReveal, [cancelReveal]);

  return {
    phase,
    active,
    focusKey,
    tiltAllowed: phase === "idle",
    focus,
    close,
    beginPan,
    endPan,
  };
}
