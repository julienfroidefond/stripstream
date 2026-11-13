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
import {
  SETTLE_DURATION,
  beginDrag,
  moveDrag,
  ownsDrag,
  planPress,
  releaseDrag,
  shouldSuppressClick,
  snapDuration,
  type DragState,
} from "@/lib/carousel/gesture";

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

/**
 * Piste de carrousel tactile.
 *
 * Trois diapositives sont montées côte à côte : la précédente, l'active et la
 * suivante. Le doigt déplace directement la piste en `translate3d`, sans
 * résistance ni rotation 3D, puis un tween court termine le geste ou ramène la
 * piste au centre. Les voisines restent `inert` pour ne pas doubler les liens
 * et boutons dans l'ordre de tabulation.
 *
 * Le seuil, le verrouillage d'axe, l'inertie et la décision de relâchement
 * vivent dans `src/lib/carousel/gesture.ts` ; ce composant ne fait que relier
 * les événements pointeur à ces transitions et appliquer le tween GSAP.
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
  /** Le tween en cours termine un balayage dont `onSwipe` n'est pas parti. */
  const pendingSwipeRef = useRef(false);
  /** Le changement de clé vient d'un balayage validé par un nouvel appui. */
  const keepDragOnKeyChange = useRef(false);
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
    pendingSwipeRef.current = false;
    // Un appui qui a validé le balayage précédent garde son geste : la piste
    // est déjà recentrée sous le doigt.
    if (keepDragOnKeyChange.current) keepDragOnKeyChange.current = false;
    else dragRef.current = null;
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
    animateTo(-widthRef.current, SETTLE_DURATION);
  }, [animateTo]);

  const finishSwipe = useCallback(
    (direction: 1 | -1, offset: number, currentX: number) => {
      const width = widthRef.current;
      const targetX = -width + direction * -width;
      pendingSwipeRef.current = true;
      animateTo(targetX, snapDuration(Math.abs(targetX - currentX)), () => {
        pendingSwipeRef.current = false;
        onSwipeRef.current?.(direction, offset);
      });
    },
    [animateTo]
  );

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const track = trackRef.current;
    if (!track) return;

    const press = planPress({
      trackX: Number(gsap.getProperty(track, "x")),
      width: widthRef.current,
      pendingSwipe: pendingSwipeRef.current && tweenRef.current !== null,
    });
    const drag = beginDrag({
      enabled: swipeEnabled && !reduce,
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      baseX: press.baseX,
      time: performance.now(),
    });
    if (!drag) return;

    if (press.commitSwipe) {
      // Un second balayage pendant la fin du premier : on termine le tween
      // (son `onComplete` applique le changement) puis la piste repart du
      // centre, là où la nouvelle diapositive sera posée au rendu.
      keepDragOnKeyChange.current = true;
      tweenRef.current?.progress(1);
      xSetter.current?.(press.baseX);
    }
    // Un appui pendant le retour élastique reprend la piste là où elle est :
    // le doigt ne repart jamais d'une position fantôme.
    tweenRef.current?.kill();
    tweenRef.current = null;
    pendingSwipeRef.current = false;

    onInteractionStartRef.current?.();
    dragRef.current = drag;
    suppressClick.current = false;
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    // Un second doigt ne pilote pas le geste du premier.
    if (!ownsDrag(drag, event.pointerId)) return;

    const result = moveDrag(drag, {
      x: event.clientX,
      y: event.clientY,
      time: performance.now(),
    });
    dragRef.current = result.state;

    if (result.capture) {
      // Capture uniquement après confirmation du geste horizontal : un tap
      // sur la cover ou le CTA garde sa cible et son clic d'origine.
      rootRef.current?.setPointerCapture(event.pointerId);
    }

    suppressClick.current = shouldSuppressClick(result.offsetX);
    xSetter.current?.(result.state.baseX + result.offsetX);
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!ownsDrag(drag, event.pointerId)) return;
    dragRef.current = null;
    keepDragOnKeyChange.current = false;

    if (rootRef.current?.hasPointerCapture(event.pointerId)) {
      rootRef.current.releasePointerCapture(event.pointerId);
    }

    const release = releaseDrag(drag, {
      time: performance.now(),
      width: widthRef.current,
    });

    if (release.advance) {
      finishSwipe(release.direction, release.offset, drag.baseX + release.offset);
    } else {
      animateTo(-widthRef.current, SETTLE_DURATION);
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
        if (dragRef.current && dragRef.current.axis !== "horizontal") dragRef.current = null;
      }}
      onLostPointerCapture={(event) => {
        if (event.target !== event.currentTarget) return;
        if (dragRef.current?.axis === "horizontal") resetDrag();
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
