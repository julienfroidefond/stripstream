"use client";

import { IntentLink } from "@/components/common/IntentLink";
import { useCallback, useEffect, useRef } from "react";
import type { FocusEvent, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { gsap, prefersReducedMotion, useGsapEffect } from "@/lib/motion/gsap";
import { cn } from "@/lib/utils";

interface BookCoverSceneProps {
  /** Lien de la couverture. Omis quand le livre est déjà dans un élément cliquable. */
  href?: string;
  ariaLabel?: string;
  /** Contenu de la couverture (image, dégradés, titre…). */
  cover: ReactNode;
  /** Pastilles affichées au-dessus de la couverture (état, note…). */
  badge?: ReactNode;
  /** Actions positionnées au-dessus du livre (favori, reprise…), hors du lien. */
  overlay?: ReactNode;
  /** Ouvre le livre depuis l'extérieur (survol d'une ligne, focus…). */
  active?: boolean;
  /** Ombre réduite pour une scène contenue dans une carte. */
  contained?: boolean;
  highlighted?: boolean;
  className?: string;
  linkClassName?: string;
}

const BOOK_DURATION = 0.7;
const BOOK_EASE = "projection";
// Valeurs reprises telles quelles du CodePen de référence : l'ombre de la
// couverture reste portée par la couverture elle-même, y compris ouverte.
const CLOSED_SHADOW =
  "0 10px 20px rgba(0, 0, 0, 0.15), 0 30px 45px rgba(0, 0, 0, 0.12), 0 60px 80px rgba(0, 0, 0, 0.1)";
const OPEN_SHADOW =
  "10px 10px 20px rgba(0, 0, 0, 0.25), 20px 20px 40px rgba(0, 0, 0, 0.2), 40px 40px 60px rgba(0, 0, 0, 0.15)";
// Variante pour les lignes de liste : l'ombre reste dans le padding de la
// carte, sans être coupée par son `overflow-hidden`.
const CLOSED_SHADOW_CONTAINED =
  "0 2px 6px rgba(0, 0, 0, 0.12), 0 6px 12px rgba(0, 0, 0, 0.08)";
const OPEN_SHADOW_CONTAINED =
  "4px 4px 8px rgba(0, 0, 0, 0.18), 8px 8px 14px rgba(0, 0, 0, 0.1)";
const BOOK_RADIUS = "rounded-[2px_6px_6px_2px]";

/**
 * Couverture de série qui s'ouvre comme un livre : au survol à la souris, à
 * l'appui sur tactile et au focus clavier (`:focus-visible`). La timeline GSAP
 * est mise en pause au repos ; les overlays gardent leur logique
 * `pointer-fine` / `pointer-coarse`, indépendante de ce mouvement décoratif.
 *
 * Le bloc de pages et le dos gardent des angles droits : seule la couverture
 * est arrondie, pour éviter l'effet « cartes empilées » au coin des pages.
 */
function useBookOpenEffect(externallyActive: boolean, contained: boolean) {
  const coverRef = useRef<HTMLSpanElement>(null);
  const gutterRef = useRef<HTMLSpanElement>(null);
  const lightRef = useRef<HTMLSpanElement>(null);
  const firstPageRef = useRef<HTMLSpanElement>(null);
  const secondPageRef = useRef<HTMLSpanElement>(null);
  const timelineRef = useRef<ReturnType<typeof gsap.timeline> | null>(null);
  const activeRef = useRef({
    hover: false,
    focus: false,
    press: false,
    external: externallyActive,
  });

  const sync = useCallback(() => {
    const timeline = timelineRef.current;
    if (!timeline) return;
    const { hover, focus, press, external } = activeRef.current;
    if (hover || focus || press || external) timeline.play();
    else timeline.reverse();
  }, []);

  useEffect(() => {
    activeRef.current.external = externallyActive;
    sync();
  }, [externallyActive, sync]);

  useGsapEffect(
    () => {
      if (prefersReducedMotion()) return;

      const cover = coverRef.current;
      const gutter = gutterRef.current;
      const light = lightRef.current;
      const firstPage = firstPageRef.current;
      const secondPage = secondPageRef.current;
      if (!cover || !gutter || !light || !firstPage || !secondPage) return;

      const timeline = gsap.timeline({
        paused: true,
        defaults: { duration: BOOK_DURATION, ease: BOOK_EASE },
      });

      timeline
        .to(
          cover,
          {
            rotateY: -12,
            x: -6,
            scaleX: 0.96,
            boxShadow: contained ? OPEN_SHADOW_CONTAINED : OPEN_SHADOW,
          },
          0
        )
        .to(gutter, { x: -6 }, 0)
        .to(light, { opacity: 0.2 }, 0)
        .to(firstPage, { x: 4, ease: "power1.inOut" }, 0)
        .to(secondPage, { x: 2, ease: "power1.inOut" }, 0);

      timelineRef.current = timeline;
      sync();

      return () => {
        timeline.kill();
        timelineRef.current = null;
      };
    },
    { dependencies: [contained, sync] }
  );

  const handlePointerEnter = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType !== "mouse") return;
    activeRef.current.hover = true;
    sync();
  };

  const handlePointerLeave = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType !== "mouse") return;
    activeRef.current.hover = false;
    sync();
  };

  const handleFocus = (event: FocusEvent<HTMLElement>) => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !target.matches(":focus-visible")) {
      return;
    }
    activeRef.current.focus = true;
    sync();
  };

  const handleBlur = (event: FocusEvent<HTMLElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    activeRef.current.focus = false;
    sync();
  };

  // Un clic souris ne doit pas laisser le livre ouvert si le focus clavier
  // était encore dessus : on le relâche dès le pointerdown.
  const handlePointerDownCapture = () => {
    if (!activeRef.current.focus) return;
    activeRef.current.focus = false;
    sync();
  };

  const handlePressStart = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType === "mouse") return;
    activeRef.current.press = true;
    sync();
  };

  const handlePressEnd = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType === "mouse") return;
    activeRef.current.press = false;
    sync();
  };

  const handlePressCancel = () => {
    if (!activeRef.current.press) return;
    activeRef.current.press = false;
    sync();
  };

  return {
    coverRef,
    gutterRef,
    lightRef,
    firstPageRef,
    secondPageRef,
    handlers: {
      onPointerEnter: handlePointerEnter,
      onPointerLeave: handlePointerLeave,
      onFocus: handleFocus,
      onBlur: handleBlur,
      onPointerDownCapture: handlePointerDownCapture,
    },
    pressHandlers: {
      onPointerDown: handlePressStart,
      onPointerUp: handlePressEnd,
      onPointerCancel: handlePressCancel,
      onPointerLeave: handlePressEnd,
    },
  };
}

export function BookCoverScene({
  href,
  ariaLabel,
  cover,
  badge,
  overlay,
  active = false,
  contained = false,
  highlighted = false,
  className,
  linkClassName,
}: BookCoverSceneProps) {
  const {
    coverRef,
    gutterRef,
    lightRef,
    firstPageRef,
    secondPageRef,
    handlers,
    pressHandlers,
  } = useBookOpenEffect(active, contained);

  const sceneClassName = cn(
    "relative block aspect-2/3",
    BOOK_RADIUS,
    highlighted && "ring-2 ring-primary ring-offset-2 ring-offset-background",
    linkClassName
  );

  const scene = (
    <>
      {/* Tant que la vignette n'est pas décodée, le livre entier est masqué
          (voir `globals.css`) : on ne montre pas un dos et une face noirs qui
          se transforment ensuite en couverture. Le squelette tient la place. */}
      <span
        aria-hidden
        className={cn(
          "cover-scene-skeleton skeleton-reveal pointer-events-none absolute inset-0 bg-surface-2",
          BOOK_RADIUS
        )}
      />

      <div className="cover-scene-book absolute inset-0">
        {/* Dos du livre, légèrement plus petit que la couverture. Il garde des
            angles droits comme le bloc de pages, pour ne pas empiler les
            arrondis derrière la tranche. */}
        <span
          aria-hidden
          className="pointer-events-none absolute left-[2%] top-[2%] z-0 h-[96%] w-[96%] bg-[#111] shadow-[2px_2px_5px_rgba(0,0,0,0.4)]"
        />

        {/* Tranches de pages : elles dépassent à droite au survol. Le papier
            garde des angles droits, comme un vrai bloc de pages. */}
        <span
          aria-hidden
          className="pointer-events-none absolute left-[5%] top-[3%] z-[1] h-[94%] w-[90%]"
        >
          <span
            ref={firstPageRef}
            className="absolute inset-y-0 right-0 w-[98%] border border-black/20 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.15)]"
          />
          <span
            ref={secondPageRef}
            className="absolute inset-y-0 right-0 w-[98%] border border-black/20 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.15)]"
          />
          <span className="absolute inset-y-0 right-0 w-[98%] border border-black/20 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.15)]" />
        </span>

        {/* Couverture : elle pivote autour de sa tranche gauche. */}
        <span
          ref={coverRef}
          className={cn(
            "absolute inset-0 z-10 block origin-left overflow-hidden bg-surface-2 will-change-transform",
            BOOK_RADIUS
          )}
          style={{
            boxShadow: contained ? CLOSED_SHADOW_CONTAINED : CLOSED_SHADOW,
            transform: "perspective(2000px) rotateY(0deg) translateX(0px) scaleX(1)",
          }}
        >
          {cover}

          <span
            ref={gutterRef}
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-4 z-20 w-5 border-l-2 border-black/10 bg-gradient-to-r from-white/20 to-transparent"
          />
          <span
            ref={lightRef}
            aria-hidden
            className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-r from-transparent to-white/50 opacity-10 mix-blend-overlay"
          />

          {badge}
        </span>
      </div>
    </>
  );

  return (
    <div className={cn("cover-scene group/card relative", className)} {...handlers}>
      {href ? (
        <IntentLink
          href={href}
          aria-label={ariaLabel}
          className={sceneClassName}
          {...pressHandlers}
        >
          {scene}
        </IntentLink>
      ) : (
        <div className={sceneClassName} {...pressHandlers}>
          {scene}
        </div>
      )}

      {overlay}
    </div>
  );
}
