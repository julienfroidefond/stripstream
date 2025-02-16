import { NavigationBarProps } from "../types";
import { cn } from "@/lib/utils";
import { Thumbnail } from "./Thumbnail";
import { useThumbnails } from "../hooks/useThumbnails";
import { useEffect } from "react";

export const NavigationBar = ({
  currentPage,
  pages,
  onPageChange,
  showControls,
  book,
}: NavigationBarProps) => {
  const {
    loadedThumbnails,
    handleThumbnailLoad,
    getThumbnailUrl,
    visibleThumbnails,
    scrollToActiveThumbnail,
  } = useThumbnails({
    book,
    currentPage,
  });

  useEffect(() => {
    if (showControls) {
      scrollToActiveThumbnail();
    }
  }, [showControls, currentPage, scrollToActiveThumbnail]);

  return (
    <div
      className={cn(
        "absolute bottom-0 left-0 right-0 bg-background/50 backdrop-blur-sm border-t border-border/40 transition-all duration-300 ease-in-out z-30",
        showControls ? "h-64 opacity-100" : "h-0 opacity-0"
      )}
    >
      {showControls && (
        <>
          <div
            id="thumbnails-container"
            className="h-full overflow-x-auto flex items-center gap-2 px-4 scroll-smooth snap-x snap-mandatory"
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
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

          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full px-4 py-2 rounded-full bg-background/50 text-sm">
            Page {currentPage} / {pages.length}
          </div>
        </>
      )}
    </div>
  );
};
