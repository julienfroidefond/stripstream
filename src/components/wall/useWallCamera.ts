"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";

import {
  useCameraStyle,
  useMotionNumber,
  useMotionNumberEvent,
} from "@/lib/motion-value";
import {
  fitWallCamera,
  initialWallCamera,
  resizeWallCamera,
  shouldSyncWallCamera,
  wallCameraCenteredOn,
  wallZoomCamera,
  type WallCameraState,
  type WallViewport,
} from "@/lib/wall-camera";
import { WALL_PATCH_HEIGHT, WALL_PATCH_WIDTH } from "@/lib/wall-layout";
import {
  MAX_WALL_ZOOM,
  MIN_WALL_ZOOM,
  clampWallZoom,
} from "@/lib/wall-pinch";
import {
  capMomentum,
  decayMomentum,
  isMomentumDying,
} from "@/lib/wall-momentum";

const PAN_IDLE = 150;

interface UseWallCameraOptions {
  stageRef: RefObject<HTMLDivElement | null>;
  layout: { width: number; height: number };
  reduce: boolean;
  selectionKey: string;
  /** Une frame a réellement déplacé la caméra : le survol n'est plus valide. */
  onCameraMoved: () => void;
  /** Le geste/zoom commence : la plaque et la vue d'ensemble se referment. */
  onInteractionStart: () => void;
  /** Nouveau filtre après l'initialisation : la composition réarme son entrée. */
  onSelectionChange: () => void;
}

export interface WallCameraController {
  x: ReturnType<typeof useMotionNumber>;
  y: ReturnType<typeof useMotionNumber>;
  scale: ReturnType<typeof useMotionNumber>;
  camera: WallCameraState;
  viewport: WallViewport;
  canvasRef: RefObject<HTMLDivElement | null>;
  overview: boolean;
  setOverview: (value: boolean) => void;
  panning: boolean;
  animateView: (
    scale: number,
    x: number,
    y: number,
    duration?: number,
    ease?: string
  ) => void;
  stopMomentum: () => void;
  startMomentum: (velocityX: number, velocityY: number) => void;
  markPanning: () => void;
  zoomAt: (scale: number, clientX: number, clientY: number) => void;
  zoomBy: (factor: number) => void;
  clampZoom: (scale: number) => number;
  resetToInitial: (duration?: number) => void;
  fitView: () => void;
  cancelView: () => void;
  beginInteraction: () => void;
}

/**
 * La caméra du Wall.
 *
 * Elle possède ses MotionNumbers, le canvas, le cadrage initial, le recadrage
 * après resize et l'inertie. Les gestes, eux, ne font qu'appeler cette API :
 * ils ne connaissent ni les seuils de rafraîchissement React ni les refs qui
 * stabilisent les effets.
 */
export function useWallCamera({
  stageRef,
  layout,
  reduce,
  selectionKey,
  onCameraMoved,
  onInteractionStart,
  onSelectionChange,
}: UseWallCameraOptions): WallCameraController {
  const x = useMotionNumber(0);
  const y = useMotionNumber(0);
  const scale = useMotionNumber(1);
  const canvasOpacity = useMotionNumber(0);
  const canvasRef = useRef<HTMLDivElement>(null);
  useCameraStyle(canvasRef, { x, y, scale, opacity: canvasOpacity });

  const [viewport, setViewport] = useState<WallViewport>({
    width: 0,
    height: 0,
  });
  /**
   * Zoom minimal : le mur est un motif répété, on peut donc reculer bien plus
   * loin qu'une seule plaque. Le plancher évite simplement de rendre des
   * centaines de vignettes illisibles ; les copies voisines sont virtualisées.
   */
  const minScale = useMemo(() => {
    if (!viewport.width || !viewport.height) return MIN_WALL_ZOOM;
    return Math.min(
      MAX_WALL_ZOOM,
      Math.max(
        MIN_WALL_ZOOM,
        (viewport.width / layout.width) * 0.5,
        (viewport.height / layout.height) * 0.5
      )
    );
  }, [layout.height, layout.width, viewport.height, viewport.width]);

  const [camera, setCamera] = useState<WallCameraState>({
    x: 0,
    y: 0,
    scale: 1,
  });
  const [overview, setOverviewState] = useState(false);
  const [panning, setPanning] = useState(false);
  const setOverview = useCallback((value: boolean) => {
    setOverviewState(value);
  }, []);

  const cameraRef = useRef<WallCameraState>({ x: 0, y: 0, scale: 1 });
  const cameraRafRef = useRef<number | null>(null);
  const momentumRafRef = useRef<number | null>(null);
  const panIdleTimerRef = useRef<number | null>(null);
  const initializedRef = useRef(false);
  const lastSelectionRef = useRef(selectionKey);

  const callbacksRef = useRef({
    onCameraMoved,
    onInteractionStart,
    onSelectionChange,
  });
  useEffect(() => {
    callbacksRef.current = {
      onCameraMoved,
      onInteractionStart,
      onSelectionChange,
    };
  });

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const update = () => {
      setViewport({
        width: Math.round(stage.clientWidth),
        height: Math.round(stage.clientHeight),
      });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [stageRef]);

  const syncCamera = useCallback(
    (force = false) => {
      const next = { x: x.get(), y: y.get(), scale: scale.get() };
      if (!shouldSyncWallCamera(cameraRef.current, next, force)) return;

      cameraRef.current = next;
      setCamera(next);
      // La caméra a bougé : la tuile sous le curseur n'est plus celle qu'on
      // regardait, on rallume la salle.
      callbacksRef.current.onCameraMoved();
    },
    [scale, x, y]
  );

  const scheduleCameraSync = useCallback(() => {
    if (cameraRafRef.current !== null) return;
    cameraRafRef.current = window.requestAnimationFrame(() => {
      cameraRafRef.current = null;
      syncCamera(false);
    });
  }, [syncCamera]);

  useMotionNumberEvent(x, scheduleCameraSync);
  useMotionNumberEvent(y, scheduleCameraSync);
  useMotionNumberEvent(scale, scheduleCameraSync);

  /** Toute animation programmée reprend la main : l'inertie s'efface. */
  const stopMomentum = useCallback(() => {
    if (momentumRafRef.current !== null) {
      window.cancelAnimationFrame(momentumRafRef.current);
      momentumRafRef.current = null;
    }
  }, []);

  /**
   * Pendant un geste, les tuiles passent sous le curseur : le survol serait
   * un stroboscope. On coupe l'effet de focus jusqu'à ce que la main s'arrête.
   */
  const markPanning = useCallback(() => {
    setPanning(true);
    if (panIdleTimerRef.current !== null) {
      window.clearTimeout(panIdleTimerRef.current);
    }
    panIdleTimerRef.current = window.setTimeout(() => {
      panIdleTimerRef.current = null;
      setPanning(false);
    }, PAN_IDLE);
  }, []);

  const clampZoom = useCallback(
    (value: number) => clampWallZoom(value, minScale),
    [minScale]
  );

  const cancelView = useCallback(() => {
    callbacksRef.current.onInteractionStart();
    setOverviewState(false);
  }, []);

  const animateView = useCallback(
    (
      nextScale: number,
      nextX: number,
      nextY: number,
      duration = 0.8,
      ease = "projection"
    ) => {
      stopMomentum();
      const tween = { duration: reduce ? 0 : duration, ease };
      scale.animateTo(nextScale, tween);
      x.animateTo(nextX, tween);
      y.animateTo(nextY, tween);
    },
    [reduce, scale, stopMomentum, x, y]
  );

  /**
   * Inertie du mur : la vitesse signée du geste est freinée par une friction
   * exponentielle, image par image. Le mur ralentit progressivement, comme une
   * page qu'on a lancée, puis s'immobilise.
   */
  const startMomentum = useCallback(
    (velocityX: number, velocityY: number) => {
      stopMomentum();
      if (reduce) return;

      const [startX, startY] = capMomentum(velocityX, velocityY);
      if (isMomentumDying(startX, startY)) return;

      let vx = startX;
      let vy = startY;
      let last = performance.now();
      markPanning();

      const step = (now: number) => {
        // Un onglet en arrière-plan peut sauter plusieurs secondes : on borne
        // le pas pour éviter une téléportation du mur au retour.
        const elapsed = Math.min(64, Math.max(0, now - last));
        last = now;
        vx = decayMomentum(vx, elapsed);
        vy = decayMomentum(vy, elapsed);

        x.set(x.get() + vx * elapsed);
        y.set(y.get() + vy * elapsed);
        markPanning();

        if (isMomentumDying(vx, vy)) {
          momentumRafRef.current = null;
          return;
        }
        momentumRafRef.current = window.requestAnimationFrame(step);
      };

      momentumRafRef.current = window.requestAnimationFrame(step);
    },
    [markPanning, reduce, stopMomentum, x, y]
  );

  const beginInteraction = useCallback(() => {
    stopMomentum();
    scale.stop();
    x.stop();
    y.stop();
    cancelView();
  }, [cancelView, scale, stopMomentum, x, y]);

  const zoomAt = useCallback(
    (nextScaleValue: number, clientX: number, clientY: number) => {
      const stage = stageRef.current;
      if (!stage) return;

      const nextScale = clampZoom(nextScaleValue);
      const current = { x: x.get(), y: y.get(), scale: scale.get() };
      if (Math.abs(nextScale - current.scale) < 0.0005) return;

      stopMomentum();
      callbacksRef.current.onInteractionStart();
      const rect = stage.getBoundingClientRect();
      const next = wallZoomCamera(
        current,
        { x: clientX - rect.left, y: clientY - rect.top },
        nextScale
      );

      scale.set(next.scale);
      x.set(next.x);
      y.set(next.y);
      setOverviewState(false);
    },
    [clampZoom, scale, stageRef, stopMomentum, x, y]
  );

  const zoomBy = useCallback(
    (factor: number) => {
      const stage = stageRef.current;
      if (!stage) return;
      const rect = stage.getBoundingClientRect();
      scale.stop();
      x.stop();
      y.stop();
      zoomAt(
        scale.get() * factor,
        rect.left + rect.width / 2,
        rect.top + rect.height / 2
      );
    },
    [scale, stageRef, x, y, zoomAt]
  );

  const resetToInitial = useCallback(
    (duration = 0.9) => {
      if (!viewport.width || !viewport.height) return;
      callbacksRef.current.onInteractionStart();
      const next = initialWallCamera(viewport, minScale);
      animateView(next.scale, next.x, next.y, duration);
      setOverviewState(false);
    },
    [animateView, minScale, viewport]
  );

  const fitView = useCallback(() => {
    if (!viewport.width || !viewport.height) return;
    callbacksRef.current.onInteractionStart();
    const current = { x: x.get(), y: y.get(), scale: scale.get() };
    const next = fitWallCamera(current, viewport, minScale);
    animateView(next.scale, next.x, next.y, 1);
    setOverviewState(true);
  }, [animateView, minScale, scale, viewport, x, y]);

  // Première mise au point : le mur est déjà là, il se règle une fois.
  useEffect(() => {
    if (initializedRef.current || !viewport.width || !viewport.height) {
      return;
    }
    initializedRef.current = true;

    const next = initialWallCamera(viewport, minScale);
    if (reduce) {
      scale.set(next.scale);
      x.set(next.x);
      y.set(next.y);
      syncCamera(true);
      canvasOpacity.set(1);
    } else {
      // Travelling d'arrivée : la caméra part plus loin du mur et avance
      // jusqu'au cadrage, centre fixe. Comme le centre dépend linéairement de
      // l'échelle, interpoler x, y et l'échelle sur la même courbe le garde.
      const fromScale = next.scale * 0.72;
      const from = wallCameraCenteredOn(
        viewport,
        { x: WALL_PATCH_WIDTH / 2, y: WALL_PATCH_HEIGHT / 2 },
        fromScale
      );
      scale.set(from.scale);
      x.set(from.x);
      y.set(from.y);
      syncCamera(true);
      const dolly = { duration: 1.3, ease: "focus" };
      scale.animateTo(next.scale, dolly);
      x.animateTo(next.x, dolly);
      y.animateTo(next.y, dolly);
      canvasOpacity.animateTo(1, { duration: 0.7 });
    }
  }, [
    canvasOpacity,
    minScale,
    reduce,
    scale,
    syncCamera,
    viewport,
    x,
    y,
  ]);

  // Nouveau filtre : le mur se redessine et le regard repart du centre.
  useEffect(() => {
    if (!initializedRef.current) return;
    if (lastSelectionRef.current === selectionKey) return;
    lastSelectionRef.current = selectionKey;
    setOverviewState(false);
    callbacksRef.current.onSelectionChange();

    if (!viewport.width || !viewport.height) return;
    const next = initialWallCamera(viewport, minScale);
    animateView(next.scale, next.x, next.y, 0.8);
  }, [animateView, minScale, selectionKey, viewport]);

  // Un cadre qui change de taille garde le zoom légal.
  useEffect(() => {
    if (!initializedRef.current || !viewport.width || !viewport.height) {
      return;
    }
    const current = { x: x.get(), y: y.get(), scale: scale.get() };
    const nextScale = clampWallZoom(current.scale, minScale);

    if (Math.abs(nextScale - current.scale) > 0.001) {
      const next = resizeWallCamera(current, viewport, nextScale);
      scale.set(next.scale);
      x.set(next.x);
      y.set(next.y);
    }
    syncCamera(true);
  }, [minScale, scale, syncCamera, viewport, x, y]);

  useEffect(() => {
    return () => {
      if (panIdleTimerRef.current !== null) {
        window.clearTimeout(panIdleTimerRef.current);
      }
      if (cameraRafRef.current !== null) {
        window.cancelAnimationFrame(cameraRafRef.current);
      }
      if (momentumRafRef.current !== null) {
        window.cancelAnimationFrame(momentumRafRef.current);
      }
    };
  }, []);

  return {
    x,
    y,
    scale,
    camera,
    viewport,
    canvasRef,
    overview,
    setOverview,
    panning,
    animateView,
    stopMomentum,
    startMomentum,
    markPanning,
    zoomAt,
    zoomBy,
    clampZoom,
    resetToInitial,
    fitView,
    cancelView,
    beginInteraction,
  };
}
