import { useState, useCallback, useEffect, useRef } from "react";
import { RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FitMode } from "../hooks/useFitMode";

interface PageDisplayProps {
  currentPage: number;
  pages: number[];
  isDoublePage: boolean;
  shouldShowDoublePage: (page: number) => boolean;
  imageBlobUrls: Record<number, string>;
  imageErrors: Record<number | string, boolean>;
  onRetryImage: (pageNum: number) => void;
  isRTL: boolean;
  fitMode: FitMode;
}

function ErrorPlaceholder({ onRetry }: { onRetry: () => void }) {
  return (
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
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRetry();
        }}
        className="flex items-center gap-2 rounded-full border border-border/60 bg-background/55 px-3 py-1.5 text-xs backdrop-blur-xl transition hover:bg-background/70"
      >
        <RotateCw className="h-3.5 w-3.5" />
        Réessayer
      </button>
    </div>
  );
}

function imageClassNameFor(fitMode: FitMode, isLoading: boolean) {
  return cn(
    "cursor-pointer transition-opacity",
    fitMode === "fit" && "max-h-full max-w-full object-contain",
    fitMode === "width" && "w-full h-auto max-w-full",
    fitMode === "height" && "h-[calc(100vh-2.5rem)] w-auto max-h-[calc(100vh-2.5rem)]",
    fitMode === "original" && "block",
    isLoading ? "opacity-0" : "opacity-100"
  );
}

export function PageDisplay({
  currentPage,
  pages: _pages,
  isDoublePage,
  shouldShowDoublePage,
  imageBlobUrls,
  imageErrors,
  onRetryImage,
  isRTL,
  fitMode,
}: PageDisplayProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [secondPageLoading, setSecondPageLoading] = useState(true);
  const [secondPageHasError, setSecondPageHasError] = useState(false);
  const imageBlobUrlsRef = useRef(imageBlobUrls);
  imageBlobUrlsRef.current = imageBlobUrls;

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

  // Reset loading when page changes, but skip if blob URL is already available
  useEffect(() => {
    setIsLoading(!imageBlobUrlsRef.current[currentPage]);
    setHasError(false);
    setSecondPageLoading(!imageBlobUrlsRef.current[currentPage + 1]);
    setSecondPageHasError(false);
  }, [currentPage, isDoublePage]);

  // Reset error state when blob URL becomes available
  useEffect(() => {
    if (imageBlobUrls[currentPage] && hasError) {
      setHasError(false);
      setIsLoading(true);
    }
  }, [imageBlobUrls[currentPage], currentPage, hasError]);

  useEffect(() => {
    if (imageBlobUrls[currentPage + 1] && secondPageHasError) {
      setSecondPageHasError(false);
      setSecondPageLoading(true);
    }
  }, [imageBlobUrls[currentPage + 1], currentPage, secondPageHasError]);

  const showSecondPage = isDoublePage && shouldShowDoublePage(currentPage);

  const outerOverflow =
    fitMode === "fit"
      ? "overflow-hidden"
      : fitMode === "width"
        ? "overflow-y-auto overflow-x-hidden"
        : fitMode === "height"
          ? "overflow-x-auto overflow-y-hidden"
          : "overflow-auto";

  const innerSizing = cn(
    "relative flex w-full px-2 sm:px-4",
    fitMode === "fit" && "h-[calc(100vh-2.5rem)] items-center justify-center",
    fitMode === "width" && "min-h-[calc(100vh-2.5rem)] items-start justify-center",
    fitMode === "height" && "h-[calc(100vh-2.5rem)] items-center min-w-full",
    fitMode === "original" && "min-h-[calc(100vh-2.5rem)] items-start"
  );

  // En modes non-"fit", contenir l'image dans un wrapper auto-sizé pour ne pas
  // forcer la mise en colonne 50/50 hostile au scroll natif.
  const pageWrapperClass = (isPage1: boolean) =>
    cn(
      "relative flex items-center",
      fitMode === "fit" ? "h-full" : "h-auto",
      showSecondPage
        ? fitMode === "fit"
          ? "w-1/2"
          : "shrink-0"
        : "w-full justify-center",
      showSecondPage && {
        [isPage1 ? "order-2 justify-start" : "order-1 justify-end"]: isRTL,
        [isPage1 ? "order-1 justify-end" : "order-2 justify-start"]: !isRTL,
      }
    );

  return (
    <div
      className={cn(
        "relative flex w-full flex-1 items-center justify-center",
        outerOverflow
      )}
    >
      <div className={innerSizing}>
        {/* Page 1 */}
        <div className={pageWrapperClass(true)}>
          {isLoading && !hasError && !imageErrors[currentPage] && (
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
          {hasError || imageErrors[currentPage] ? (
            <ErrorPlaceholder onRetry={() => onRetryImage(currentPage)} />
          ) : imageBlobUrls[currentPage] ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={`page-${currentPage}-${imageBlobUrls[currentPage]}`}
                src={imageBlobUrls[currentPage]}
                alt={`Page ${currentPage}`}
                className={imageClassNameFor(fitMode, isLoading)}
                loading="eager"
                onLoad={handleImageLoad}
                onError={handleImageError}
                ref={(img) => {
                  if (img?.complete && img?.naturalHeight !== 0) {
                    handleImageLoad();
                  }
                }}
              />
            </>
          ) : null}
        </div>

        {/* Page 2 (double page) */}
        {showSecondPage && (
          <div className={pageWrapperClass(false)}>
            {secondPageLoading && !secondPageHasError && !imageErrors[currentPage + 1] && (
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
            {secondPageHasError || imageErrors[currentPage + 1] ? (
              <ErrorPlaceholder onRetry={() => onRetryImage(currentPage + 1)} />
            ) : imageBlobUrls[currentPage + 1] ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  key={`page-${currentPage + 1}-${imageBlobUrls[currentPage + 1]}`}
                  src={imageBlobUrls[currentPage + 1]}
                  alt={`Page ${currentPage + 1}`}
                  className={imageClassNameFor(fitMode, secondPageLoading)}
                  loading="eager"
                  onLoad={handleSecondImageLoad}
                  onError={handleSecondImageError}
                  ref={(img) => {
                    if (img?.complete && img?.naturalHeight !== 0) {
                      handleSecondImageLoad();
                    }
                  }}
                />
              </>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
