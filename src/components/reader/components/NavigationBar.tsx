import type { NavigationBarProps } from "../types";
import { Thumbnail } from "./Thumbnail";
import { useThumbnails } from "../hooks/useThumbnails";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { EASE_PROJECTION } from "@/lib/motion";

export const NavigationBar = ({
  currentPage,
  pages,
  onPageChange,
  showControls,
  showThumbnails,
  book,
}: NavigationBarProps) => {
  const [isTooSmall, setIsTooSmall] = useState(false);
  const reduce = useReducedMotion();
  const { loadedThumbnails, handleThumbnailLoad, getThumbnailUrl, visibleThumbnails } =
    useThumbnails({
      book,
      currentPage,
    });

  const thumbnailsContainerRef = useRef<HTMLDivElement>(null);

  // Vérification de la hauteur de la fenêtre
  useEffect(() => {
    const checkHeight = () => {
      setIsTooSmall(window.innerHeight < 580);
    };

    checkHeight();
    window.addEventListener("resize", checkHeight);
    return () => window.removeEventListener("resize", checkHeight);
  }, []);

  // Centre la vignette courante, à l'ouverture et au changement de page. Le
  // défilement reste horizontal et borné au bandeau : un `scrollIntoView`
  // pourrait aussi faire défiler le lecteur pendant que le bandeau monte.
  useEffect(() => {
    if (showThumbnails && !isTooSmall) {
      requestAnimationFrame(() => {
        const container = thumbnailsContainerRef.current;
        const thumbnail = document.getElementById(`thumbnail-${currentPage}`);
        if (!container || !thumbnail) return;
        container.scrollTo({
          left: thumbnail.offsetLeft - container.clientWidth / 2 + thumbnail.offsetWidth / 2,
          behavior: "instant",
        });
      });
    }
  }, [showThumbnails, currentPage, isTooSmall]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => e.stopPropagation(), []);
  const handleTouchMove = useCallback((e: React.TouchEvent) => e.stopPropagation(), []);
  const handleTouchEnd = useCallback((e: React.TouchEvent) => e.stopPropagation(), []);

  const thumbnails = useMemo(
    () =>
      pages.map((_, index) => {
        const pageNumber = index + 1;
        const isVisible = visibleThumbnails.includes(pageNumber);
        return (
          <Thumbnail
            key={pageNumber}
            pageNumber={pageNumber}
            currentPage={currentPage}
            onPageChange={onPageChange}
            getThumbnailUrl={getThumbnailUrl}
            loadedThumbnails={loadedThumbnails}
            onThumbnailLoad={handleThumbnailLoad}
            isVisible={isVisible}
          />
        );
      }),
    [pages, currentPage, onPageChange, getThumbnailUrl, loadedThumbnails, handleThumbnailLoad, visibleThumbnails]
  );

  if (isTooSmall) {
    return null;
  }

  // Le bandeau monte du bas de l'écran et y redescend avec son contenu : un
  // déplacement (compositeur) plutôt qu'une hauteur animée (mise en page).
  return (
    <AnimatePresence>
      {showThumbnails && (
        <motion.div
          key="thumbnails"
          className="absolute bottom-0 left-0 right-0 z-30 h-52 border-t border-border bg-surface-1" // taste-skill-ignore: arête supérieure d'un panneau (overlay)
          initial={reduce ? { opacity: 0 } : { y: "100%", opacity: 0 }}
          animate={reduce ? { opacity: 1 } : { y: 0, opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { y: "100%", opacity: 0 }}
          transition={{ duration: 0.45, ease: EASE_PROJECTION }}
        >
          <div
            id="thumbnails-container"
            className="relative flex h-full snap-x snap-mandatory items-center gap-2 overflow-x-auto px-4 scroll-smooth"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            ref={thumbnailsContainerRef}
          >
            <div className="w-[calc(50vw-18rem)] shrink-0" />
            {thumbnails}
            <div className="w-[calc(50vw-18rem)] shrink-0" />
          </div>

          {showControls && (
            <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-full rounded-full bg-surface-2 px-4 py-2 text-sm tabular-nums">
              Page{" "}
              <span className="inline-block overflow-hidden align-bottom">
                <span key={currentPage} className="inline-block motion-safe:animate-count-in">
                  {currentPage}
                </span>
              </span>{" "}
              / {pages.length}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
