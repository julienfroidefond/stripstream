"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
  type PanInfo,
} from "framer-motion";
import { cn } from "@/lib/utils";
import {
  CAROUSEL_TRANSITION,
  EASE_OUT,
  carouselSlide,
  spotlightBackdrop,
  spotlightContent,
  spotlightShell,
} from "@/lib/motion";
import { VIEWPORT_MARGIN } from "@/components/motion";
import { ProjectionBackdrop } from "@/components/ui/projection-backdrop";

const SWIPE_THRESHOLD = 60;

/**
 * Indique aux diapositives que le carrousel est entré dans la fenêtre. Elles
 * retiennent leur propre cascade tant que le bloc n'est pas révélé, pour que
 * l'animation se voie au défilement et pas hors écran au chargement.
 */
const SpotlightRevealContext = createContext(true);

export function useSpotlightReveal() {
  return useContext(SpotlightRevealContext);
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
  const reduce = useReducedMotion();
  const sectionRef = useRef<HTMLElement | null>(null);
  const inView = useInView(sectionRef, {
    once: true,
    amount: 0.28,
    margin: VIEWPORT_MARGIN,
  });
  const total = slides.length;
  const [nav, setNav] = useState({ index: 0, direction: 0 });
  const previousTotal = useRef(total);

  useEffect(() => {
    if (total > previousTotal.current) {
      setNav({ index: previousTotal.current, direction: 1 });
    } else if (nav.index >= total) {
      setNav({ index: Math.max(0, total - 1), direction: -1 });
    }
    previousTotal.current = total;
  }, [nav.index, total]);

  if (total === 0) return null;

  const safeIndex = ((nav.index % total) + total) % total;
  const slide = slides[safeIndex];
  const hasMany = total > 1;
  const revealed = Boolean(reduce) || inView;

  const goTo = (target: number, direction: number) => {
    setNav({ index: ((target % total) + total) % total, direction });
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (!hasMany) return;
    if (info.offset.x < -SWIPE_THRESHOLD) goTo(safeIndex + 1, 1);
    else if (info.offset.x > SWIPE_THRESHOLD) goTo(safeIndex - 1, -1);
  };

  return (
    <SpotlightRevealContext.Provider value={revealed}>
      <motion.section
        ref={sectionRef}
        className={cn("grain relative overflow-hidden rounded-2xl", className)}
        aria-roledescription="carousel"
        aria-label={ariaLabel}
        variants={reduce ? undefined : spotlightShell}
        initial={reduce ? false : "hidden"}
        animate={reduce ? undefined : revealed ? "visible" : "hidden"}
      >
        <motion.div
          className="absolute inset-0 bg-surface-1"
          variants={reduce ? undefined : spotlightBackdrop}
        >
          <AnimatePresence initial={false}>
            {slide.backdropSrc ? (
              <motion.div
                key={`backdrop-${slide.key}`}
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.7, ease: EASE_OUT }}
              >
                <ProjectionBackdrop src={slide.backdropSrc} fadeIn={false} />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>

        <motion.div
          className="relative overflow-hidden px-5 py-5 sm:px-7 sm:py-7"
          variants={reduce ? undefined : spotlightContent}
        >
          <AnimatePresence mode="popLayout" custom={nav.direction} initial={false}>
            <motion.div
              key={slide.key}
              custom={nav.direction}
              variants={reduce ? undefined : carouselSlide}
              initial={reduce ? false : "enter"}
              animate={reduce ? undefined : "center"}
              exit={reduce ? undefined : "exit"}
              transition={reduce ? { duration: 0 } : CAROUSEL_TRANSITION}
              drag={hasMany ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={handleDragEnd}
              className={hasMany ? "cursor-grab active:cursor-grabbing" : undefined}
            >
              {slide.content}
            </motion.div>
          </AnimatePresence>

          {(hasMany || footer) && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              {hasMany && (
                <div role="tablist" className="flex items-center justify-center gap-2">
                  {slides.map((item, index) => (
                    <button
                      key={item.key}
                      type="button"
                      role="tab"
                      aria-selected={index === safeIndex}
                      aria-label={`${index + 1} / ${total}`}
                      onClick={() => goTo(index, index > safeIndex ? 1 : -1)}
                      className={cn(
                        "h-1.5 rounded-full transition-[width,background-color] duration-300 ease-out",
                        index === safeIndex
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
        </motion.div>
      </motion.section>
    </SpotlightRevealContext.Provider>
  );
}
