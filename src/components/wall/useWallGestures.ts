"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

import {
  WALL_TAP_SLOP,
  isWallUiTarget,
  pinchWallCamera,
  pushWallVelocitySample,
  startWallPinch,
  wallDistance,
  wallMidpoint,
  wallReleaseVelocity,
  type WallPinchStart,
  type WallPoint,
  type WallVelocitySample,
} from "@/lib/wall-gesture";
import {
  armWallClickGuard,
  beginWallPinch,
  beginWallPress,
  releaseWallTouch,
  type WallClickGuardState,
} from "@/lib/wall-pinch";

import type { WallCameraController } from "./useWallCamera";

const DRAG_CLICK_GUARD = 420;
const WHEEL_ZOOM = 0.0022;

/**
 * Les gestes n'utilisent qu'une tranche de la caméra. Le contrat explicite
 * évite de leur donner accès au cadrage, à l'overview ou à l'inertie qu'ils
 * ne pilotent pas.
 */
export type WallGestureCamera = Pick<
  WallCameraController,
  | "x"
  | "y"
  | "scale"
  | "clampZoom"
  | "cancelView"
  | "markPanning"
  | "startMomentum"
  | "stopMomentum"
  | "zoomAt"
  | "beginInteraction"
>;

interface UseWallGesturesOptions {
  stageRef: RefObject<HTMLDivElement | null>;
  clickGuard: WallClickGuardState;
  camera: WallGestureCamera;
  /** Le premier doigt accepté ouvre la phase de déplacement. */
  onPanStart?: () => void;
  /** Le dernier doigt relâché referme la phase de déplacement. */
  onPanEnd?: () => void;
}

/**
 * Les gestes du Wall.
 *
 * Un seul système d'événements pointeur pilote le glissement et le pinch :
 * `@use-gesture` faisait tourner deux moteurs concurrents (drag limité au
 * premier doigt, pinch séparé), ce qui provoquait des sauts au passage d'un
 * doigt à deux et ignorait les gestes commencés dans un interstice. Ici, la
 * caméra suit les doigts 1:1 dès le premier pixel, le pinch ancre le point
 * saisi sous le milieu des doigts, et le relâchement emporte l'élan.
 *
 * Les méthodes de la caméra vivent dans `apiRef` : l'effet s'attache une seule
 * fois et lit toujours la version courante, sans réabonner les écouteurs (et
 * perdre un geste en cours) quand le zoom minimal change. La composition ne
 * garde que le branchement de la garde de clic.
 */
export function useWallGestures({
  stageRef,
  clickGuard,
  camera,
  onPanStart,
  onPanEnd,
}: UseWallGesturesOptions): { dragging: boolean } {
  const [dragging, setDragging] = useState(false);
  const { x, y, scale } = camera;

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

    const api = () => apiRef.current;
    const pointers = new Map<number, WallPoint>();
    const ignored = new Set<number>();
    const samples: WallVelocitySample[] = [];
    let mode: "idle" | "pan" | "pinch" = "idle";
    let panId: number | null = null;
    let panStart: WallPoint = { x: 0, y: 0 };
    let panLast: WallPoint = { x: 0, y: 0 };
    let moved = false;
    let pinched = false;
    let pinchIds: [number, number] | null = null;
    let pinchStart: WallPinchStart | null = null;
    let pinchSpan = 1;
    let detach: (() => void) | null = null;
    let gestureActive = false;

    const stagePoint = (point: WallPoint): WallPoint => {
      const rect = stage.getBoundingClientRect();
      return { x: point.x - rect.left, y: point.y - rect.top };
    };

    const resetSequence = () => {
      mode = "idle";
      panId = null;
      pinchIds = null;
      pinchStart = null;
      moved = false;
      pinched = false;
      samples.length = 0;
    };

    const beginPan = (id: number) => {
      const point = pointers.get(id);
      if (!point) return;
      mode = "pan";
      panId = id;
      panStart = point;
      panLast = point;
      // Un doigt resté après un pinch ne doit jamais produire un tap.
      moved = pinched;
      samples.length = 0;
    };

    const beginPinch = () => {
      const ids = [...pointers.keys()].slice(0, 2);
      const first = pointers.get(ids[0]);
      const second = pointers.get(ids[1]);
      if (!first || !second) return;

      mode = "pinch";
      panId = null;
      pinchIds = [ids[0], ids[1]];
      pinchSpan = Math.max(1, wallDistance(first, second));
      pinchStart = startWallPinch(
        { x: x.get(), y: y.get(), scale: scale.get() },
        stagePoint(wallMidpoint(first, second))
      );
      pinched = true;
      moved = true;
      samples.length = 0;
      beginWallPinch(clickGuard, performance.now());
      setDragging(true);
      api().cancelView();
      api().markPanning();
    };

    /** Recale le geste après l'arrivée ou le départ d'un doigt, sans saut. */
    const syncPointers = () => {
      if (pointers.size === 0) {
        mode = "idle";
        panId = null;
        pinchIds = null;
        pinchStart = null;
        return;
      }

      if (pointers.size === 1) {
        const [id] = pointers.keys();
        if (mode !== "pan" || panId !== id) beginPan(id);
        return;
      }

      const ids = [...pointers.keys()].slice(0, 2);
      if (
        mode !== "pinch" ||
        !pinchIds ||
        pinchIds[0] !== ids[0] ||
        pinchIds[1] !== ids[1]
      ) {
        beginPinch();
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;

      if (pointers.size === 0 && ignored.size === 0) {
        beginWallPress(clickGuard);
        resetSequence();
        attach();
      }

      // Un geste ne démarre jamais sur un contrôle du mur : le panneau garde
      // son défilement natif et ses boutons restent de simples boutons.
      if (isWallUiTarget(event.target)) {
        ignored.add(event.pointerId);
        return;
      }
      if (ignored.size > 0) return;

      if (pointers.size === 0) {
        api().beginInteraction();
        gestureActive = true;
        callbacksRef.current.onPanStart?.();
      }

      pointers.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });
      syncPointers();
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!pointers.has(event.pointerId)) return;

      // Souris relâchée hors de la fenêtre : aucun `pointerup` ne nous est
      // parvenu. Le premier mouvement au retour doit terminer le geste au lieu
      // de faire glisser le mur avec un bouton fantôme.
      if (event.pointerType === "mouse" && event.buttons === 0) {
        handlePointerUp(event, false);
        return;
      }

      const next = { x: event.clientX, y: event.clientY };
      pointers.set(event.pointerId, next);

      if (mode === "pan" && panId === event.pointerId) {
        const dx = next.x - panLast.x;
        const dy = next.y - panLast.y;
        panLast = next;
        if (dx === 0 && dy === 0) return;

        // 1:1 dès le premier pixel : pas de seuil qui ferait sauter le mur.
        x.set(x.get() + dx);
        y.set(y.get() + dy);
        api().markPanning();

        if (!moved) {
          if (wallDistance(next, panStart) <= WALL_TAP_SLOP) return;
          moved = true;
          setDragging(true);
          api().cancelView();
        }

        pushWallVelocitySample(samples, {
          x: next.x,
          y: next.y,
          t: performance.now(),
        });
        return;
      }

      if (mode === "pinch" && pinchIds && pinchStart) {
        const first = pointers.get(pinchIds[0]);
        const second = pointers.get(pinchIds[1]);
        if (!first || !second) return;

        const nextCamera = pinchWallCamera(
          pinchStart,
          stagePoint(wallMidpoint(first, second)),
          wallDistance(first, second) / pinchSpan,
          api().clampZoom
        );
        x.set(nextCamera.x);
        y.set(nextCamera.y);
        scale.set(nextCamera.scale);
        api().markPanning();
      }
    };

    function handlePointerUp(event: PointerEvent, recordRelease = true) {
      if (
        event.type === "pointerup" &&
        event.pointerType === "mouse" &&
        event.button !== 0
      ) {
        return;
      }
      if (ignored.delete(event.pointerId)) {
        if (ignored.size === 0 && pointers.size === 0) detach?.();
        return;
      }
      if (!pointers.delete(event.pointerId)) return;

      // Le point de relâchement précise la vitesse quand le dernier
      // `pointermove` date de quelques images.
      if (recordRelease && mode === "pan" && panId === event.pointerId && moved) {
        pushWallVelocitySample(samples, {
          x: event.clientX,
          y: event.clientY,
          t: performance.now(),
        });
      }

      const wasMode = mode;
      syncPointers();

      if (pointers.size > 0) return;

      if (wasMode === "pan" && moved) {
        armWallClickGuard(clickGuard, performance.now(), DRAG_CLICK_GUARD);
        const velocity = wallReleaseVelocity(samples, performance.now());
        if (velocity) api().startMomentum(velocity[0], velocity[1]);
      }
      if (pinched) {
        releaseWallTouch(clickGuard, performance.now(), 0);
      }

      if (gestureActive) {
        gestureActive = false;
        callbacksRef.current.onPanEnd?.();
      }
      setDragging(false);
      resetSequence();
      detach?.();
    }

    const handleBlur = () => {
      pointers.clear();
      ignored.clear();
      if (gestureActive) {
        gestureActive = false;
        callbacksRef.current.onPanEnd?.();
      }
      setDragging(false);
      resetSequence();
      detach?.();
    };

    function attach() {
      if (detach) return;
      window.addEventListener("pointermove", handlePointerMove, {
        passive: true,
      });
      window.addEventListener("pointerup", handlePointerUp);
      window.addEventListener("pointercancel", handlePointerUp);
      window.addEventListener("blur", handleBlur);
      detach = () => {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        window.removeEventListener("pointercancel", handlePointerUp);
        window.removeEventListener("blur", handleBlur);
        detach = null;
      };
    }

    stage.addEventListener("pointerdown", handlePointerDown, { passive: true });
    return () => {
      stage.removeEventListener("pointerdown", handlePointerDown);
      detach?.();
    };
  }, [clickGuard, scale, stageRef, x, y]);

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      const stage = stageRef.current;
      if (!stage) return;
      if (isWallUiTarget(event.target)) return;

      const api = apiRef.current;
      event.preventDefault();
      api.stopMomentum();
      scale.stop();
      x.stop();
      y.stop();
      api.markPanning();

      if (event.ctrlKey || event.metaKey) {
        const factor = Math.exp(-event.deltaY * WHEEL_ZOOM);
        api.zoomAt(scale.get() * factor, event.clientX, event.clientY);
        return;
      }

      api.cancelView();

      const multiplier = event.deltaMode === 1 ? 18 : 1;
      x.set(x.get() - event.deltaX * multiplier);
      y.set(y.get() - event.deltaY * multiplier);
    },
    [scale, stageRef, x, y]
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

  return { dragging };
}
