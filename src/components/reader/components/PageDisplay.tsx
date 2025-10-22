import { useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useReadingDirection } from "../hooks/useReadingDirection";

interface PageDisplayProps {
  currentPage: number;
  pages: number[];
  isDoublePage: boolean;
  shouldShowDoublePage: (page: number) => boolean;
  imageBlobUrls: Record<number, string>;
  getPageUrl: (pageNum: number) => string;
}

export function PageDisplay({
  currentPage,
  pages: _pages,
  isDoublePage,
  shouldShowDoublePage,
  imageBlobUrls,
  getPageUrl,
}: PageDisplayProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [secondPageLoading, setSecondPageLoading] = useState(true);
  const { isRTL } = useReadingDirection();

  const handleImageLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleSecondImageLoad = useCallback(() => {
    setSecondPageLoading(false);
  }, []);

  // Reset loading when page changes
  useEffect(() => {
    setIsLoading(true);
    setSecondPageLoading(true);
  }, [currentPage, isDoublePage]);

  return (
    <div className="relative flex-1 flex items-center justify-center overflow-hidden w-full">
      <div className="relative w-full h-[calc(100vh-2rem)] flex items-center justify-center gap-1">
        {/* Page 1 */}
        <div
          className={cn(
            "relative h-full flex items-center",
            isDoublePage && shouldShowDoublePage(currentPage)
              ? "w-1/2"
              : "w-full justify-center",
            isDoublePage && shouldShowDoublePage(currentPage) && {
              "order-2 justify-start": isRTL,
              "order-1 justify-end": !isRTL,
            }
          )}
        >
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-10 opacity-0 animate-fade-in">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20"></div>
                <div className="absolute inset-0 animate-spin rounded-full h-16 w-16 border-4 border-transparent border-t-primary" style={{ animationDuration: '0.8s' }}></div>
              </div>
            </div>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={`page-${currentPage}-${imageBlobUrls[currentPage] || ''}`}
            src={imageBlobUrls[currentPage] || getPageUrl(currentPage)}
            alt={`Page ${currentPage}`}
            className={cn(
              "max-h-full max-w-full object-contain transition-opacity cursor-pointer",
              isLoading ? "opacity-0" : "opacity-100"
            )}
            loading="eager"
            onLoad={handleImageLoad}
            onError={handleImageLoad}
            ref={(img) => {
              // Si l'image est déjà en cache, onLoad ne sera pas appelé
              if (img?.complete && img?.naturalHeight !== 0) {
                handleImageLoad();
              }
            }}
          />
        </div>

        {/* Page 2 (double page) */}
        {isDoublePage && shouldShowDoublePage(currentPage) && (
          <div
            className={cn(
              "relative h-full w-1/2 flex items-center",
              {
                "order-1 justify-end": isRTL,
                "order-2 justify-start": !isRTL,
              }
            )}
          >
            {secondPageLoading && (
              <div className="absolute inset-0 flex items-center justify-center z-10 opacity-0 animate-fade-in">
                <div className="relative">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20"></div>
                  <div className="absolute inset-0 animate-spin rounded-full h-16 w-16 border-4 border-transparent border-t-primary" style={{ animationDuration: '0.8s' }}></div>
                </div>
              </div>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={`page-${currentPage + 1}-${imageBlobUrls[currentPage + 1] || ''}`}
              src={imageBlobUrls[currentPage + 1] || getPageUrl(currentPage + 1)}
              alt={`Page ${currentPage + 1}`}
              className={cn(
                "max-h-full max-w-full object-contain transition-opacity cursor-pointer",
                secondPageLoading ? "opacity-0" : "opacity-100"
              )}
              loading="eager"
              onLoad={handleSecondImageLoad}
              onError={handleSecondImageLoad}
              ref={(img) => {
                // Si l'image est déjà en cache, onLoad ne sera pas appelé
                if (img?.complete && img?.naturalHeight !== 0) {
                  handleSecondImageLoad();
                }
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
