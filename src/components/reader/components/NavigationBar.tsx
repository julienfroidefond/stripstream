import type { NavigationBarProps } from "../types";
import { cn } from "@/lib/utils";
import { Thumbnail } from "./Thumbnail";
import { useThumbnails } from "../hooks/useThumbnails";
import { useEffect, useRef, useState } from "react";

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

  if (isTooSmall) {
    return null;
  }

  return (
    <div
      className={cn(
        "absolute bottom-0 left-0 right-0 bg-background/50 backdrop-blur-sm border-t border-border/40 transition-all duration-300 ease-in-out z-30",
        showThumbnails ? "h-52 opacity-100" : "h-0 opacity-0"
      )}
    >
      {showThumbnails && (
        <>
          <div
            id="thumbnails-container"
            className="h-full overflow-x-auto flex items-center gap-2 px-4 scroll-smooth snap-x snap-mandatory"
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            ref={thumbnailsContainerRef}
          >
            <div className="w-[calc(50vw-18rem)] flex-shrink-0" />
            {pages.map((_, index) => {
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
            })}
            <div className="w-[calc(50vw-18rem)] flex-shrink-0" />
          </div>

          {showControls && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full px-4 py-2 rounded-full bg-background/50 text-sm">
              Page {currentPage} / {pages.length}
            </div>
          )}
        </>
      )}
    </div>
  );
};
