import { useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";

interface PageDisplayProps {
  currentPage: number;
  pages: number[];
  isDoublePage: boolean;
  shouldShowDoublePage: (page: number) => boolean;
  imageBlobUrls: Record<number, string>;
  getPageUrl: (pageNum: number) => string;
  isRTL: boolean;
  isPageLoading?: (pageNum: number) => boolean;
}

export function PageDisplay({
  currentPage,
  pages: _pages,
  isDoublePage,
  shouldShowDoublePage,
  imageBlobUrls,
  getPageUrl,
  isRTL,
  isPageLoading,
}: PageDisplayProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [secondPageLoading, setSecondPageLoading] = useState(true);
  const [secondPageHasError, setSecondPageHasError] = useState(false);

  const handleImageLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleImageError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
  }, []);

  const handleSecondImageLoad = useCallback(() => {
    setSecondPageLoading(false);
  }, []);

  const handleSecondImageError = useCallback(() => {
    setSecondPageLoading(false);
    setSecondPageHasError(true);
  }, []);

  // Reset loading when page changes
  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
    setSecondPageLoading(true);
    setSecondPageHasError(false);
  }, [currentPage, isDoublePage]);

  return (
    <div className="relative flex w-full flex-1 items-center justify-center overflow-hidden">
      <div className="relative flex h-[calc(100vh-2.5rem)] w-full items-center justify-center px-2 sm:px-4">
        {/* Page 1 */}
        <div
          className={cn(
            "relative h-full flex items-center",
            isDoublePage && shouldShowDoublePage(currentPage) ? "w-1/2" : "w-full justify-center",
            isDoublePage &&
              shouldShowDoublePage(currentPage) && {
                "order-2 justify-start": isRTL,
                "order-1 justify-end": !isRTL,
              }
          )}
        >
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-10 opacity-0 animate-fade-in">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20"></div>
                <div
                  className="absolute inset-0 animate-spin rounded-full h-16 w-16 border-4 border-transparent border-t-primary"
                  style={{ animationDuration: "0.8s" }}
                ></div>
              </div>
            </div>
          )}
          {hasError ? (
            <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="opacity-40"
              >
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
              <span className="text-sm opacity-60">Image non disponible</span>
            </div>
          ) : (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={`page-${currentPage}-${imageBlobUrls[currentPage] || ""}`}
                src={
                  imageBlobUrls[currentPage] ||
                  (isPageLoading && isPageLoading(currentPage) ? undefined : getPageUrl(currentPage))
                }
                alt={`Page ${currentPage}`}
                className={cn(
                  "max-h-full max-w-full cursor-pointer object-contain transition-opacity",
                  isLoading ? "opacity-0" : "opacity-100"
                )}
                loading="eager"
                onLoad={handleImageLoad}
                onError={handleImageError}
                ref={(img) => {
                  // Si l'image est déjà en cache, onLoad ne sera pas appelé
                  if (img?.complete && img?.naturalHeight !== 0) {
                    handleImageLoad();
                  }
                }}
              />
            </>
          )}
        </div>

        {/* Page 2 (double page) */}
        {isDoublePage && shouldShowDoublePage(currentPage) && (
          <div
            className={cn("relative h-full w-1/2 flex items-center", {
              "order-1 justify-end": isRTL,
              "order-2 justify-start": !isRTL,
            })}
          >
            {secondPageLoading && (
              <div className="absolute inset-0 flex items-center justify-center z-10 opacity-0 animate-fade-in">
                <div className="relative">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20"></div>
                  <div
                    className="absolute inset-0 animate-spin rounded-full h-16 w-16 border-4 border-transparent border-t-primary"
                    style={{ animationDuration: "0.8s" }}
                  ></div>
                </div>
              </div>
            )}
            {secondPageHasError ? (
              <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="opacity-40"
                >
                  <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                  <circle cx="9" cy="9" r="2" />
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                </svg>
                <span className="text-sm opacity-60">Image non disponible</span>
              </div>
            ) : (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  key={`page-${currentPage + 1}-${imageBlobUrls[currentPage + 1] || ""}`}
                  src={
                    imageBlobUrls[currentPage + 1] ||
                    (isPageLoading && isPageLoading(currentPage + 1)
                      ? undefined
                      : getPageUrl(currentPage + 1))
                  }
                  alt={`Page ${currentPage + 1}`}
                  className={cn(
                    "max-h-full max-w-full cursor-pointer object-contain transition-opacity",
                    secondPageLoading ? "opacity-0" : "opacity-100"
                  )}
                  loading="eager"
                  onLoad={handleSecondImageLoad}
                  onError={handleSecondImageError}
                  ref={(img) => {
                    // Si l'image est déjà en cache, onLoad ne sera pas appelé
                    if (img?.complete && img?.naturalHeight !== 0) {
                      handleSecondImageLoad();
                    }
                  }}
                />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
