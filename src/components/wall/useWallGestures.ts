"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

import { isWallUiTarget } from "@/lib/wall-gesture";
import {
  createWallPointerState,
  isWallClickGuarded,
  stepWallPointer,
  type WallPointerEffect,
  type WallPointerEvent,
} from "@/lib/wall-pointer-machine";

import type { WallCameraController } from "./useWallCamera";

/**
 * Les gestes n'utilisent qu'une tranche de la caméra, et uniquement des
 * intentions : ils ne voient ni les valeurs de mouvement, ni le cadrage, ni
 * l'overview.
 */
export type WallGestureCamera = Pick<
  WallCameraController,
  | "grab"
  | "panBy"
  | "beginPinch"
  | "pinchTo"
  | "release"
  | "wheel"
  | "cancelView"
>;

interface UseWallGesturesOptions {
  stageRef: RefObject<HTMLDivElement | null>;
  camera: WallGestureCamera;
  /** Le premier doigt accepté ouvre la phase de déplacement. */
  onPanStart?: () => void;
  /** Le dernier doigt relâché referme la phase de déplacement. */
  onPanEnd?: () => void;
}

export interface WallGestures {
  dragging: boolean;
  /** Le clic courant suit un glissement ou un pinch : il doit être avalé. */
  isClickGuarded: () => boolean;
  /** Activation clavier explicite : les clics suivants passent. */
  releaseClickGuard: () => void;
}

/**
 * Les gestes du Wall — adaptateur.
 *
 * Toutes les décisions (idle/pan/pinch, pointeurs ignorés, bouton fantôme,
 * élan, garde de clic) vivent dans `stepWallPointer`. Ce hook traduit les
 * événements DOM en événements de la machine, puis applique ses effets : à la
 * caméra (intentions), à React (`dragging`), aux écouteurs globaux et aux
 * rappels de phase.
 *
 * La caméra et les rappels vivent dans des refs : l'effet s'attache une seule
 * fois et lit toujours la version courante, sans réabonner les écouteurs (et
 * perdre un geste en cours) quand le zoom minimal change.
 */
export function useWallGestures({
  stageRef,
  camera,
  onPanStart,
  onPanEnd,
}: UseWallGesturesOptions): WallGestures {
  const [dragging, setDragging] = useState(false);
  const machineRef = useRef(createWallPointerState());

  const apiRef = useRef(camera);
  useEffect(() => {
    apiRef.current = camera;
  });

  const callbacksRef = useRef({ onPanStart, onPanEnd });
  useEffect(() => {
    callbacksRef.current = { onPanStart, onPanEnd };
  });

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const apply = (effect: WallPointerEffect) => {
      const api = apiRef.current;
      switch (effect.type) {
        case "attach":
          window.addEventListener("pointermove", handlePointerMove, {
            passive: true,
          });
          window.addEventListener("pointerup", handlePointerUp);
          window.addEventListener("pointercancel", handlePointerUp);
          window.addEventListener("blur", handleBlur);
          return;
        case "detach":
          detachWindow();
          return;
        case "grab":
          api.grab();
          return;
        case "panStart":
          callbacksRef.current.onPanStart?.();
          return;
        case "panEnd":
          callbacksRef.current.onPanEnd?.();
          return;
        case "panBy":
          api.panBy(effect.dx, effect.dy);
          return;
        case "dragStart":
          setDragging(true);
          api.cancelView();
          return;
        case "dragEnd":
          setDragging(false);
          return;
        case "pinchStart":
          api.beginPinch(effect.midpoint);
          return;
        case "pinchTo":
          api.pinchTo(effect.midpoint, effect.ratio);
          return;
        case "release":
          api.release(effect.velocityX, effect.velocityY);
          return;
      }
    };

    const dispatch = (event: WallPointerEvent) => {
      const { state, effects } = stepWallPointer(
        machineRef.current,
        event,
        performance.now()
      );
      machineRef.current = state;
      effects.forEach(apply);
    };

    function handlePointerDown(event: PointerEvent) {
      dispatch({
        type: "down",
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        pointerType: event.pointerType,
        button: event.button,
        onUi: isWallUiTarget(event.target),
      });
    }

    function handlePointerMove(event: PointerEvent) {
      dispatch({
        type: "move",
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        pointerType: event.pointerType,
        buttons: event.buttons,
      });
    }

    function handlePointerUp(event: PointerEvent) {
      dispatch({
        type: "up",
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        pointerType: event.pointerType,
        button: event.button,
        cancel: event.type !== "pointerup",
      });
    }

    function handleBlur() {
      dispatch({ type: "blur" });
    }

    function detachWindow() {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
      window.removeEventListener("blur", handleBlur);
    }

    stage.addEventListener("pointerdown", handlePointerDown, { passive: true });
    return () => {
      stage.removeEventListener("pointerdown", handlePointerDown);
      detachWindow();
      // La séquence en cours meurt avec ses écouteurs ; la garde de clic,
      // elle, survit (un clic synthétique peut encore arriver).
      machineRef.current = createWallPointerState(machineRef.current.guardUntil);
    };
  }, [stageRef]);

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      if (!stageRef.current) return;
      if (isWallUiTarget(event.target)) return;

      event.preventDefault();
      apiRef.current.wheel({
        deltaX: event.deltaX,
        deltaY: event.deltaY,
        deltaMode: event.deltaMode,
        zoom: event.ctrlKey || event.metaKey,
        clientX: event.clientX,
        clientY: event.clientY,
      });
    },
    [stageRef]
  );

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    stage.addEventListener("wheel", handleWheel, { passive: false });
    return () => stage.removeEventListener("wheel", handleWheel);
  }, [handleWheel, stageRef]);

  /**
   * iOS garde parfois le pinch-zoom natif malgré `touch-action: none`,
   * particulièrement en PWA standalone. Un `touchmove` non passif à deux
   * doigts et les gestes WebKit coupent ce zoom avant qu'il ne déplace le
   * viewport sous le mur. Le défilement à un doigt des panneaux reste intact :
   * leurs gestes sont ignorés en amont par `isWallUiTarget`.
   * Safari macOS expose aussi `maxTouchPoints` (1 sur un Mac à trackpad) : ses
   * gestes de trackpad sont donc interceptés de la même façon, ce qui est
   * voulu — `preventDefault` y bloque le zoom natif de page et le zoom du mur
   * continue de passer par le handler `wheel` natif.
   */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const touchCapable = navigator.maxTouchPoints > 0;

    const stopGestureZoom = (event: Event) => {
      if (event.cancelable) event.preventDefault();
    };
    const stopMultiTouchZoom = (event: TouchEvent) => {
      if (event.touches.length < 2) return;
      if (event.cancelable) event.preventDefault();
    };

    if (touchCapable) {
      stage.addEventListener("gesturestart", stopGestureZoom, {
        passive: false,
      });
      stage.addEventListener("gesturechange", stopGestureZoom, {
        passive: false,
      });
    }
    stage.addEventListener("touchmove", stopMultiTouchZoom, { passive: false });
    return () => {
      stage.removeEventListener("gesturestart", stopGestureZoom);
      stage.removeEventListener("gesturechange", stopGestureZoom);
      stage.removeEventListener("touchmove", stopMultiTouchZoom);
    };
  }, [stageRef]);

  const isClickGuarded = useCallback(
    () => isWallClickGuarded(machineRef.current, performance.now()),
    []
  );

  const releaseClickGuard = useCallback(() => {
    machineRef.current = stepWallPointer(
      machineRef.current,
      { type: "activate" },
      performance.now()
    ).state;
  }, []);

  return { dragging, isClickGuarded, releaseClickGuard };
}
