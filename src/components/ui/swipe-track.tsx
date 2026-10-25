"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { gsap } from "@/lib/gsap";

const SWIPE_THRESHOLD_RATIO = 0.12;
const SWIPE_THRESHOLD_MIN = 40;
const VELOCITY_THRESHOLD = 0.35;
/** Projection de l'élan du doigt en pixels, pour décider d'un changement. */
const VELOCITY_PROJECTION_MS = 120;

interface SwipeTrackProps {
  /** Clé de la diapositive centrale ; son changement recentre la piste. */
  activeKey: string;
  /** Diapositive précédente, affichée à gauche pendant le geste. */
  previous: ReactNode;
  /** Diapositive suivante, affichée à droite pendant le geste. */
  next: ReactNode;
  children: ReactNode;
  reduce?: boolean;
  swipeEnabled?: boolean;
  onSwipe?: (direction: 1 | -1, offset: number) => void;
  /** Appelé au premier appui, avant que le geste ne soit confirmé. */
  onInteractionStart?: () => void;
  className?: string;
}

interface DragState {
  pointerId: number;
  startX: number;
  startY: number;
  baseX: number;
  currentX: number;
  lastX: number;
  lastTime: number;
  velocity: number;
  active: boolean;
  horizontal: boolean;
}

/**
 * Piste de carrousel tactile.
 *
 * Trois diapositives sont montées côte à côte : la précédente, l'active et la
 * suivante. Le doigt déplace directement la piste en `translate3d`, sans
 * résistance ni rotation 3D, puis un tween court termine le geste ou ramène la
 * piste au centre. Les voisines restent `inert` pour ne pas doubler les liens
 * et boutons dans l'ordre de tabulation.
 */
export function SwipeTrack({
  activeKey,
  previous,
  next,
  children,
  reduce = false,
  swipeEnabled = false,
  onSwipe,
  onInteractionStart,
  className,
}: SwipeTrackProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const widthRef = useRef(0);
  const xSetter = useRef<((value: number) => void) | null>(null);
  const tweenRef = useRef<gsap.core.Tween | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const suppressClick = useRef(false);
  const onSwipeRef = useRef(onSwipe);
  const onInteractionStartRef = useRef(onInteractionStart);

  useEffect(() => {
    onSwipeRef.current = onSwipe;
    onInteractionStartRef.current = onInteractionStart;
  }, [onInteractionStart, onSwipe]);

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    xSetter.current = gsap.quickSetter(track, "x", "px") as (
      value: number
    ) => void;
    return () => {
      xSetter.current = null;
    };
  }, []);

  const centerTrack = useCallback(() => {
    const root = rootRef.current;
    const track = trackRef.current;
    if (!root || !track) return;
    const width = root.clientWidth;
    widthRef.current = width;
    gsap.set(track, { x: -width, force3D: true });
  }, []);

  useLayoutEffect(() => {
    // Un changement piloté par les pastilles peut arriver pendant le tween de
    // relâchement : on le coupe pour ne pas appliquer un second changement.
    tweenRef.current?.kill();
    tweenRef.current = null;
    dragRef.current = null;
    centerTrack();
  }, [activeKey, centerTrack]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new ResizeObserver(() => {
      if (dragRef.current || tweenRef.current) return;
      centerTrack();
    });
    observer.observe(root);
    return () => observer.disconnect();
  }, [centerTrack]);

  useEffect(
    () => () => {
      tweenRef.current?.kill();
      tweenRef.current = null;
    },
    []
  );

  const animateTo = useCallback(
    (x: number, duration: number, onComplete?: () => void) => {
      const track = trackRef.current;
      if (!track) return;
      tweenRef.current?.kill();
      tweenRef.current = gsap.to(track, {
        x,
        duration,
        ease: "out",
        overwrite: true,
        onComplete: () => {
          tweenRef.current = null;
          onComplete?.();
        },
      });
    },
    []
  );

  const resetDrag = useCallback(() => {
    dragRef.current = null;
    animateTo(-widthRef.current, 0.3);
  }, [animateTo]);

  const finishSwipe = useCallback(
    (direction: 1 | -1, offset: number, currentX: number) => {
      const width = widthRef.current;
      const targetX = -width + direction * -width;
      const distance = Math.abs(targetX - currentX);
      const duration = Math.min(0.42, Math.max(0.22, distance / 2200));
      animateTo(targetX, duration, () => {
        onSwipeRef.current?.(direction, offset);
      });
    },
    [animateTo]
  );

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!swipeEnabled || reduce || dragRef.current) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const track = trackRef.current;
    if (!track) return;

    // Un appui pendant le retour élastique reprend la piste là où elle est :
    // le doigt ne repart jamais d'une position fantôme.
    tweenRef.current?.kill();
    tweenRef.current = null;
    const baseX = Number(gsap.getProperty(track, "x")) || -widthRef.current;

    onInteractionStartRef.current?.();
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      baseX,
      currentX: baseX,
      lastX: event.clientX,
      lastTime: performance.now(),
      velocity: 0,
      active: true,
      horizontal: false,
    };
    suppressClick.current = false;
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag?.active) return;

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;

    if (!drag.horizontal) {
      if (Math.abs(deltaX) < 6 && Math.abs(deltaY) < 6) return;
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        drag.active = false;
        return;
      }
      drag.horizontal = true;
      // Capture uniquement après confirmation du geste horizontal : un tap
      // sur la cover ou le CTA garde sa cible et son clic d'origine.
      rootRef.current?.setPointerCapture(event.pointerId);
    }

    const now = performance.now();
    const elapsed = now - drag.lastTime;
    if (elapsed > 0) {
      const instant = (event.clientX - drag.lastX) / elapsed;
      drag.velocity = drag.velocity * 0.7 + instant * 0.3;
      drag.lastX = event.clientX;
      drag.lastTime = now;
    }

    drag.currentX = drag.baseX + deltaX;
    suppressClick.current = Math.abs(deltaX) > 6;
    xSetter.current?.(drag.currentX);
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag?.active || !drag.horizontal) return;

    if (rootRef.current?.hasPointerCapture(event.pointerId)) {
      rootRef.current.releasePointerCapture(event.pointerId);
    }

    const width = widthRef.current;
    const offset = drag.currentX - drag.baseX;
    // Un doigt qui marque une pause avant de relâcher ne doit pas conserver
    // l'élan de son dernier mouvement.
    const sinceLastMove = performance.now() - drag.lastTime;
    const velocity = sinceLastMove > 80 ? 0 : drag.velocity;
    const projected = offset + velocity * VELOCITY_PROJECTION_MS;
    const threshold = Math.max(SWIPE_THRESHOLD_MIN, width * SWIPE_THRESHOLD_RATIO);
    const shouldAdvance =
      Math.abs(projected) > threshold || Math.abs(velocity) > VELOCITY_THRESHOLD;

    if (shouldAdvance) {
      finishSwipe(projected < 0 ? 1 : -1, offset, drag.currentX);
    } else {
      animateTo(-width, 0.3);
    }

    window.setTimeout(() => {
      suppressClick.current = false;
    }, 0);
  };

  const handleClickCapture = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!suppressClick.current) return;
    event.preventDefault();
    event.stopPropagation();
    suppressClick.current = false;
  };

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative overflow-hidden",
        swipeEnabled && "cursor-grab select-none active:cursor-grabbing",
        className
      )}
      style={swipeEnabled ? { touchAction: "pan-y" } : undefined}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={(event) => {
        if (dragRef.current?.pointerId !== event.pointerId) return;
        resetDrag();
      }}
      onPointerLeave={() => {
        if (dragRef.current && !dragRef.current.horizontal) dragRef.current = null;
      }}
      onLostPointerCapture={(event) => {
        if (event.target !== event.currentTarget) return;
        if (dragRef.current?.horizontal) resetDrag();
      }}
      onDragStart={(event) => event.preventDefault()}
      onClickCapture={handleClickCapture}
    >
      <div
        ref={trackRef}
        className="flex w-[300%] will-change-transform"
        style={{ transform: "translate3d(-33.333333%, 0, 0)" }}
      >
        <div className="w-1/3 shrink-0" aria-hidden inert={true}>
          {previous}
        </div>
        <div className="w-1/3 shrink-0">{children}</div>
        <div className="w-1/3 shrink-0" aria-hidden inert={true}>
          {next}
        </div>
      </div>
    </div>
  );
}
