import type { NavigationBarProps } from "../types";
import { cn } from "@/lib/utils";
import { Thumbnail } from "./Thumbnail";
import { useThumbnails } from "../hooks/useThumbnails";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export const NavigationBar = ({
  currentPage,
  pages,
  onPageChange,
  showControls,
  showThumbnails,
  book,
}: NavigationBarProps) => {
  const [isTooSmall, setIsTooSmall] = useState(false);
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

  // Scroll à l'ouverture des vignettes et au changement de page
  useEffect(() => {
    if (showThumbnails && !isTooSmall) {
      requestAnimationFrame(() => {
        const thumbnail = document.getElementById(`thumbnail-${currentPage}`);
        if (thumbnail) {
          thumbnail.scrollIntoView({
            behavior: showThumbnails ? "instant" : "smooth",
            block: "nearest",
            inline: "center",
          });
        }
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

  return (
    <div
      className={cn(
        "absolute bottom-0 left-0 right-0 z-30 border-t border-border/60 bg-background/60 backdrop-blur-xl transition-all duration-300 ease-in-out",
        showThumbnails ? "h-52 opacity-100" : "h-0 opacity-0"
      )}
    >
      {showThumbnails && (
        <>
          <div
            id="thumbnails-container"
            className="flex h-full snap-x snap-mandatory items-center gap-2 overflow-x-auto px-4 scroll-smooth"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            ref={thumbnailsContainerRef}
          >
            <div className="w-[calc(50vw-18rem)] flex-shrink-0" />
            {thumbnails}
            <div className="w-[calc(50vw-18rem)] flex-shrink-0" />
          </div>

            {showControls && (
            <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-full rounded-full border border-border/60 bg-background/60 px-4 py-2 text-sm shadow-[0_8px_24px_-16px_rgba(0,0,0,0.75)] backdrop-blur-xl">
              Page {currentPage} / {pages.length}
            </div>
          )}
        </>
      )}
    </div>
  );
};
