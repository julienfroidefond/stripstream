"use client";

import {
  useEffect,
  useRef,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { gsap, prefersReducedMotion, useGsapEffect } from "@/lib/gsap";

const SWIPE_THRESHOLD = 60;
const SWIPE_RESISTANCE = 0.55;
const PERSPECTIVE = 1100;

interface DirectionalSlideProps {
  /** Clé de la diapositive visible. */
  activeKey: string;
  /** Clé de la diapositive sortante, pendant la transition uniquement. */
  previousKey?: string | null;
  /** Contenu de la diapositive sortante. */
  previous?: ReactNode;
  children: ReactNode;
  /** +1 : la nouvelle diapositive vient de la droite ; -1 : de la gauche. */
  direction?: number;
  /** Position du doigt au moment du relâchement, pour reprendre l'élan. */
  dragOffset?: number;
  reduce?: boolean;
  swipeEnabled?: boolean;
  onSwipe?: (direction: 1 | -1, offset: number) => void;
  onSettled?: () => void;
  className?: string;
}

/**
 * Scène de carrousel directionnelle en GSAP.
 *
 * Le changement de diapositive joue en profondeur : la sortante est jetée vers
 * le spectateur, l'entrante remonte du fond.
 * La diapositive entrante reste dans le flux (c'est elle qui donne sa hauteur
 * au bloc), la sortante passe en absolu et s'efface derrière. Le geste suit le
 * doigt en `pointer events` natifs : pas de plugin de drag, et le clic reste
 * intact tant que le doigt n'a pas bougé.
 */
export function DirectionalSlide({
  activeKey,
  previousKey,
  previous,
  children,
  direction = 1,
  dragOffset = 0,
  reduce = false,
  swipeEnabled = false,
  onSwipe,
  onSettled,
  className,
}: DirectionalSlideProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const enterRef = useRef<HTMLDivElement>(null);
  const exitRef = useRef<HTMLDivElement>(null);
  const onSwipeRef = useRef(onSwipe);
  const onSettledRef = useRef(onSettled);
  const suppressClick = useRef(false);
  const drag = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    offset: number;
    active: boolean;
    horizontal: boolean;
  } | null>(null);

  useEffect(() => {
    onSwipeRef.current = onSwipe;
    onSettledRef.current = onSettled;
  }, [onSwipe, onSettled]);

  useGsapEffect(
    () => {
      const enter = enterRef.current;
      if (!enter) return;
      const exit = exitRef.current;

      if (reduce || prefersReducedMotion()) {
        gsap.set(enter, { clearProps: "opacity,transform" });
        if (exit) gsap.set(exit, { clearProps: "opacity,transform" });
        onSettledRef.current?.();
        return;
      }

      if (!exit) {
        gsap.set(enter, { clearProps: "opacity,transform" });
        return;
      }

      // Le paquet de cartes : la sortante est jetée vers le spectateur et
      // s'efface très vite ; l'entrante ne remonte du fond qu'une fois la
      // place presque libre, pour que les deux ne se superposent pas.
      const dir: 1 | -1 = direction < 0 ? -1 : 1;
      gsap.set(enter, {
        x: dir * 60,
        z: -360,
        rotateY: dir * -24,
        opacity: 0,
        transformPerspective: PERSPECTIVE,
        zIndex: 2,
      });
      gsap.set(exit, {
        x: dragOffset * SWIPE_RESISTANCE,
        z: 0,
        rotateY: 0,
        opacity: 1,
        transformPerspective: PERSPECTIVE,
        zIndex: 1,
      });

      const timeline = gsap.timeline({
        onComplete: () => {
          gsap.set(enter, { clearProps: "opacity,transform,zIndex" });
          onSettledRef.current?.();
        },
      });

      timeline
        .to(
          exit,
          {
            x: -dir * 160,
            z: 220,
            rotateY: dir * 30,
            opacity: 0,
            duration: 0.24,
            ease: "power2.in",
          },
          0
        )
        .to(
          enter,
          {
            x: 0,
            z: 0,
            rotateY: 0,
            opacity: 1,
            duration: 0.42,
            ease: "back.out(1.6)",
          },
          0.18
        );

      return () => timeline.kill();
    },
    {
      dependencies: [
        activeKey,
        previousKey,
        direction,
        dragOffset,
        reduce,
      ],
    }
  );

  const resetDrag = () => {
    drag.current = null;
    const enter = enterRef.current;
    if (!enter) return;
    gsap.to(enter, {
      x: 0,
      rotateY: 0,
      duration: 0.4,
      ease: "projection",
      overwrite: "auto",
    });
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!swipeEnabled || reduce || previousKey || drag.current) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    drag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offset: 0,
      active: true,
      horizontal: false,
    };
    suppressClick.current = false;
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current?.active) return;

    const deltaX = event.clientX - current.startX;
    const deltaY = event.clientY - current.startY;

    if (!current.horizontal) {
      if (Math.abs(deltaX) < 6 && Math.abs(deltaY) < 6) return;
      // Geste vertical : on rend la main au défilement de la page.
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        current.active = false;
        return;
      }
      current.horizontal = true;
      // On ne capture le pointeur qu'une fois le geste horizontal confirmé :
      // un simple clic sur la cover ou le CTA garde sa cible d'origine.
      rootRef.current?.setPointerCapture(event.pointerId);
    }

    current.offset = deltaX;
    suppressClick.current = Math.abs(deltaX) > 6;
    gsap.set(enterRef.current, {
      x: deltaX * SWIPE_RESISTANCE,
      rotateY: deltaX * 0.05,
      transformPerspective: PERSPECTIVE,
    });
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    drag.current = null;
    if (!current?.active || !current.horizontal) return;
    if (rootRef.current?.hasPointerCapture(event.pointerId)) {
      rootRef.current.releasePointerCapture(event.pointerId);
    }

    if (Math.abs(current.offset) > SWIPE_THRESHOLD) {
      onSwipeRef.current?.(current.offset < 0 ? 1 : -1, current.offset);
    } else {
      resetDrag();
    }

    // Le clic synthétique arrive juste après `pointerup` : on le laisse passer
    // puis on réarme, sinon un simple tap serait avalé.
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
        "relative",
        swipeEnabled && "cursor-grab select-none active:cursor-grabbing",
        className
      )}
      style={swipeEnabled ? { touchAction: "pan-y" } : undefined}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={resetDrag}
      onPointerLeave={() => {
        if (drag.current && !drag.current.horizontal) drag.current = null;
      }}
      onLostPointerCapture={(event) => {
        // Sur tactile, le navigateur capture implicitement le pointeur sur la
        // cible touchée : `setPointerCapture` sur la scène la lui retire, et le
        // `lostpointercapture` de cet enfant remonte jusqu'ici. Ce n'est pas
        // une perte du geste, seulement le transfert de la capture.
        if (event.target !== event.currentTarget) return;
        if (drag.current?.horizontal) resetDrag();
      }}
      onClickCapture={handleClickCapture}
    >
      {previous ? (
        <div
          ref={exitRef}
          aria-hidden
          inert={true}
          className="pointer-events-none absolute inset-0"
        >
          {previous}
        </div>
      ) : null}
      <div ref={enterRef} className="relative">
        {children}
      </div>
    </div>
  );
}
