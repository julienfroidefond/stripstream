"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { gsap, prefersReducedMotion, SplitText, useGsapEffect } from "@/lib/gsap";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { VIEWPORT_MARGIN } from "@/components/motion";
import { ProjectionBackdrop } from "@/components/ui/projection-backdrop";
import { SwipeTrack } from "@/components/ui/swipe-track";

/**
 * Vrai pour la diapositive affichée tant que l'entrée en scène du carrousel
 * n'a pas joué. Les changements de diapositive suivants passent par la piste
 * tactile `SwipeTrack` : le contenu ne rejoue pas sa cascade.
 */
const SpotlightStagedContext = createContext(false);

/**
 * Marqueurs de l'entrée en scène, à étaler sur les éléments d'une diapositive :
 * `cover` arrive du fond en tournoyant, `title` voit ses mots basculer en 3D,
 * `item` remonte en cascade. Les états de départ sont en CSS.
 */
export function useSpotlightStaging() {
  const staged = useContext(SpotlightStagedContext);
  const reduce = usePrefersReducedMotion();
  const on = staged && !reduce;
  return {
    cover: on ? { "data-spot-fly": "" } : {},
    title: on ? { "data-spot-title": "" } : {},
    item: on ? { "data-spot-item": "" } : {},
  };
}

export interface SpotlightSlide {
  key: string;
  /** Couverture qui éclaire la scène derrière la diapositive. */
  backdropSrc?: string | null;
  content: ReactNode;
}

interface SpotlightCarouselProps {
  slides: SpotlightSlide[];
  ariaLabel: string;
  /** Contrôles supplémentaires sous les pastilles (« Voir plus »…). */
  footer?: ReactNode;
  className?: string;
}

/**
 * Carrousel « une œuvre à la fois » partagé par les rangées de l'accueil.
 *
 * La coque gère le fond d'affiche, le glissement, le balayage tactile et les
 * pastilles ; chaque rangée ne fournit que le contenu d'une diapositive. Quand
 * une rangée charge des éléments supplémentaires, le carrousel se pose sur le
 * premier nouvel élément.
 */
export function SpotlightCarousel({
  slides,
  ariaLabel,
  footer,
  className,
}: SpotlightCarouselProps) {
  const reduce = usePrefersReducedMotion();
  const sectionRef = useRef<HTMLElement | null>(null);
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const backdropLayerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);
  const total = slides.length;
  const [index, setIndex] = useState(0);
  const [backdropFrom, setBackdropFrom] = useState<SpotlightSlide | null>(null);
  const [staged, setStaged] = useState(true);
  const previousTotal = useRef(total);
  const firstBackdrop = useRef(true);
  const introDone = useRef(false);
  const introTimeline = useRef<gsap.core.Timeline | null>(null);
  const introSplits = useRef<Array<{ revert: () => void }>>([]);
  const backdropTimer = useRef<number | null>(null);

  useEffect(() => {
    if (reduce) return;
    const element = sectionRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setInView(true);
        observer.disconnect();
      },
      { rootMargin: VIEWPORT_MARGIN, threshold: 0.28 }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [reduce]);

  const safeIndex = total > 0 ? ((index % total) + total) % total : 0;
  const slide = slides[safeIndex];
  const hasMany = total > 1;
  const revealed = Boolean(reduce) || inView;
  const currentSlideRef = useRef<SpotlightSlide | undefined>(slide);

  useEffect(() => {
    currentSlideRef.current = slide;
  }, [slide]);

  /**
   * Coupe l'entrée en scène et remet les éléments dans leur état final. Le
   * premier appui du doigt appelle cette fonction : le geste n'attend pas la
   * fin de la timeline, et la diapositive ne se remet pas à bouger sous lui.
   */
  const settleIntro = useCallback(() => {
    if (introDone.current) return;
    introDone.current = true;
    introTimeline.current?.kill();
    introTimeline.current = null;

    const splits = introSplits.current;
    introSplits.current = [];
    splits.forEach((split) => split.revert());

    const section = sectionRef.current;
    const backdrop = backdropRef.current;
    const content = contentRef.current;
    if (!section || !backdrop || !content) {
      setStaged(false);
      return;
    }

    const stagedElements = Array.from(
      content.querySelectorAll<HTMLElement>(
        "[data-spot-fly], [data-spot-title], [data-spot-item]"
      )
    );
    section.removeAttribute("data-spotlight-shell");
    backdrop.removeAttribute("data-spotlight-backdrop");
    content.removeAttribute("data-spotlight-content");
    stagedElements.forEach((element) => {
      element.removeAttribute("data-spot-fly");
      element.removeAttribute("data-spot-title");
      element.removeAttribute("data-spot-item");
    });
    gsap.set([section, backdrop, content, ...stagedElements], {
      clearProps: "opacity,transform,transformOrigin",
    });
    setStaged(false);
  }, []);

  const showBackdropFrom = useCallback((from: SpotlightSlide | null) => {
    if (!from) return;
    setBackdropFrom(from);
    if (backdropTimer.current) window.clearTimeout(backdropTimer.current);
    backdropTimer.current = window.setTimeout(() => {
      backdropTimer.current = null;
      setBackdropFrom(null);
    }, 750);
  }, []);

  useEffect(
    () => () => {
      if (backdropTimer.current) window.clearTimeout(backdropTimer.current);
    },
    []
  );

  const goTo = (target: number) => {
    if (total === 0) return;
    const next = ((target % total) + total) % total;
    if (next === safeIndex) return;
    settleIntro();
    setStaged(false);
    if (reduce) {
      setBackdropFrom(null);
      setIndex(next);
      return;
    }
    showBackdropFrom(slide);
    setIndex(next);
  };

  useEffect(() => {
    if (total > previousTotal.current) {
      const from = currentSlideRef.current;
      settleIntro();
      setStaged(false);
      if (!reduce && from) showBackdropFrom(from);
      setIndex(previousTotal.current);
    } else if (total > 0 && index >= total) {
      const from = currentSlideRef.current;
      settleIntro();
      setStaged(false);
      if (!reduce && from) showBackdropFrom(from);
      setIndex(Math.max(0, total - 1));
    }
    previousTotal.current = total;
  }, [index, reduce, settleIntro, showBackdropFrom, total]);

  useGsapEffect(
    () => {
      if (introDone.current) return;
      const section = sectionRef.current;
      const backdrop = backdropRef.current;
      const content = contentRef.current;
      if (!section || !backdrop || !content) return;

      if (reduce || prefersReducedMotion()) {
        settleIntro();
        return;
      }

      if (!revealed) return;

      const fliers = Array.from(
        content.querySelectorAll<HTMLElement>("[data-spot-fly]")
      );
      const titles = Array.from(
        content.querySelectorAll<HTMLElement>("[data-spot-title]")
      );
      const items = Array.from(
        content.querySelectorAll<HTMLElement>("[data-spot-item]")
      );

      // Même entrée que le hero : la scène se redresse vers le spectateur, la
      // cover arrive du fond, les mots du titre basculent en 3D.
      const splits = titles.map((title) =>
        SplitText.create(title, { type: "words" })
      );
      introSplits.current = splits;
      const words = splits.flatMap((split) => split.words);

      const timeline = gsap.timeline({
        defaults: { ease: "projection" },
        onComplete: settleIntro,
      });
      introTimeline.current = timeline;

      timeline
        .fromTo(
          section,
          {
            opacity: 0,
            y: 70,
            rotateX: 20,
            scale: 0.92,
            transformPerspective: 1400,
            transformOrigin: "50% 100%",
          },
          { opacity: 1, y: 0, rotateX: 0, scale: 1, duration: 0.7, ease: "focus" },
          0
        )
        .to(backdrop, { opacity: 1, scale: 1, duration: 1.1 }, 0)
        .to(content, { opacity: 1, y: 0, duration: 0.5 }, 0.05);

      if (fliers.length > 0) {
        timeline.fromTo(
          fliers,
          {
            opacity: 0,
            x: -140,
            z: -600,
            rotateY: -75,
            rotateX: 18,
            rotateZ: -7,
            transformPerspective: 900,
          },
          {
            opacity: 1,
            x: 0,
            z: 0,
            rotateY: 0,
            rotateX: 0,
            rotateZ: 0,
            duration: 0.8,
            ease: "back.out(1.5)",
          },
          0.1
        );
      }

      if (words.length > 0) {
        timeline.fromTo(
          words,
          {
            opacity: 0,
            yPercent: 70,
            z: -160,
            rotateX: -95,
            transformPerspective: 600,
            transformOrigin: "50% 100%",
          },
          {
            opacity: 1,
            yPercent: 0,
            z: 0,
            rotateX: 0,
            duration: 0.6,
            ease: "back.out(2)",
            stagger: 0.05,
          },
          0.3
        );
      }

      if (items.length > 0) {
        timeline.fromTo(
          items,
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: 0.45, stagger: 0.05 },
          0.4
        );
      }

      return () => {
        timeline.kill();
        if (introTimeline.current === timeline) introTimeline.current = null;
        if (introSplits.current === splits) {
          introSplits.current = [];
          splits.forEach((split) => split.revert());
        }
      };
    },
    { dependencies: [reduce, revealed, settleIntro] }
  );

  useGsapEffect(
    () => {
      const layer = backdropLayerRef.current;
      const first = firstBackdrop.current;
      firstBackdrop.current = false;
      if (!layer || first) return;
      if (reduce || prefersReducedMotion()) {
        gsap.set(layer, { opacity: 1 });
        return;
      }
      const tween = gsap.fromTo(layer, { opacity: 0 }, { opacity: 1, duration: 0.7, ease: "out" });
      return () => tween.kill();
    },
    { dependencies: [slide?.key, reduce] }
  );

  if (total === 0 || !slide) return null;

  const previousSlide = hasMany
    ? slides[(safeIndex - 1 + total) % total]
    : undefined;
  const nextSlide = hasMany ? slides[(safeIndex + 1) % total] : undefined;

  const renderAdjacent = (adjacent: SpotlightSlide | undefined) =>
    adjacent ? (
      <SpotlightStagedContext.Provider value={false}>
        {adjacent.content}
      </SpotlightStagedContext.Provider>
    ) : null;

  const currentContent = (
    <SpotlightStagedContext.Provider value={staged}>
      {slide.content}
    </SpotlightStagedContext.Provider>
  );

  return (
    <section
      ref={sectionRef}
      data-spotlight-shell
      className={cn("grain relative overflow-hidden rounded-2xl", className)}
      aria-roledescription="carousel"
      aria-label={ariaLabel}
    >
      <div ref={backdropRef} data-spotlight-backdrop className="absolute inset-0 bg-surface-1">
        {backdropFrom?.backdropSrc ? (
          <div className="absolute inset-0" aria-hidden>
            <ProjectionBackdrop src={backdropFrom.backdropSrc} fadeIn={false} />
          </div>
        ) : null}
        {slide.backdropSrc ? (
          <div ref={backdropLayerRef} key={`backdrop-${slide.key}`} className="absolute inset-0">
            <ProjectionBackdrop src={slide.backdropSrc} fadeIn={false} />
          </div>
        ) : null}
      </div>

      <div
        ref={contentRef}
        data-spotlight-content
        className="relative overflow-hidden px-5 py-5 sm:px-7 sm:py-7"
      >
        <SwipeTrack
          activeKey={slide.key}
          previous={renderAdjacent(previousSlide)}
          next={renderAdjacent(nextSlide)}
          reduce={reduce}
          swipeEnabled={hasMany}
          onSwipe={(direction) => goTo(safeIndex + direction)}
          onInteractionStart={settleIntro}
        >
          {currentContent}
        </SwipeTrack>

        {(hasMany || footer) && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            {hasMany && (
              <div role="tablist" className="flex items-center justify-center gap-2">
                {slides.map((item, position) => (
                  <button
                    key={item.key}
                    type="button"
                    role="tab"
                    aria-selected={position === safeIndex}
                    aria-label={`${position + 1} / ${total}`}
                    onClick={() => goTo(position)}
                    className={cn(
                      "h-1.5 rounded-full transition-[width,background-color] duration-300 ease-out",
                      position === safeIndex
                        ? "w-8 bg-primary"
                        : "w-2 bg-foreground/25 hover:bg-foreground/45"
                    )}
                  />
                ))}
              </div>
            )}
            {footer}
          </div>
        )}
      </div>
    </section>
  );
}
