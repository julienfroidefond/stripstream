"use client";

import { BookReaderProps } from "./types";
import { useOrientation } from "./hooks/useOrientation";
import { usePageNavigation } from "./hooks/usePageNavigation";
import { usePageCache } from "./hooks/usePageCache";
import { useState, useEffect, useCallback } from "react";
import { NavigationBar } from "./components/NavigationBar";
import { ControlButtons } from "./components/ControlButtons";
import { ImageLoader } from "@/components/ui/image-loader";
import { cn } from "@/lib/utils";

export function BookReader({ book, pages, onClose }: BookReaderProps) {
  const [isDoublePage, setIsDoublePage] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const isLandscape = useOrientation();

  const {
    currentPage,
    setCurrentPage,
    isLoading,
    setIsLoading,
    secondPageLoading,
    setSecondPageLoading,
    imageError,
    setImageError,
    handlePreviousPage,
    handleNextPage,
    shouldShowDoublePage,
    syncReadProgress,
  } = usePageNavigation({
    book,
    pages,
    isDoublePage,
  });

  const { preloadPage, getPageUrl, cleanCache } = usePageCache({
    book,
    pages,
  });

  // État pour stocker les URLs des images
  const [currentPageUrl, setCurrentPageUrl] = useState<string>("");
  const [nextPageUrl, setNextPageUrl] = useState<string>("");

  // Effet pour charger les URLs des images
  useEffect(() => {
    let isMounted = true;

    const loadPageUrls = async () => {
      try {
        const url = await getPageUrl(currentPage);
        if (isMounted) {
          setCurrentPageUrl(url);
          setIsLoading(false);
        }

        if (isDoublePage && shouldShowDoublePage(currentPage)) {
          const nextUrl = await getPageUrl(currentPage + 1);
          if (isMounted) {
            setNextPageUrl(nextUrl);
            setSecondPageLoading(false);
          }
        }
      } catch (error) {
        console.error("Erreur lors du chargement des URLs:", error);
        setImageError(true);
      }
    };

    setIsLoading(true);
    setSecondPageLoading(true);
    loadPageUrls();

    return () => {
      isMounted = false;
    };
  }, [currentPage, isDoublePage, shouldShowDoublePage, getPageUrl]);

  // Effet pour précharger la page courante et les pages adjacentes
  useEffect(() => {
    let isMounted = true;

    const preloadCurrentPages = async () => {
      if (!isMounted) return;

      await preloadPage(currentPage);

      if (!isMounted) return;

      if (isDoublePage && shouldShowDoublePage(currentPage)) {
        await preloadPage(currentPage + 1);
      }

      if (!isMounted) return;

      const pagesToPreload = [];

      for (let i = 1; i <= 4 && currentPage + i <= pages.length; i++) {
        pagesToPreload.push(currentPage + i);
      }

      for (let i = 1; i <= 2 && currentPage - i >= 1; i++) {
        pagesToPreload.push(currentPage - i);
      }

      for (const page of pagesToPreload) {
        if (!isMounted) break;
        await preloadPage(page);
      }
    };

    preloadCurrentPages();
    cleanCache(currentPage);

    return () => {
      isMounted = false;
    };
  }, [currentPage, isDoublePage, shouldShowDoublePage, preloadPage, cleanCache, pages.length]);

  // Effet pour gérer le mode double page automatiquement en paysage
  useEffect(() => {
    setIsDoublePage(isLandscape);
  }, [isLandscape]);

  const handleThumbnailLoad = useCallback(
    (pageNumber: number) => {
      if (pageNumber === currentPage) {
        setIsLoading(false);
      } else if (pageNumber === currentPage + 1) {
        setSecondPageLoading(false);
      }
    },
    [currentPage]
  );

  const handlePageChange = useCallback(
    (page: number) => {
      setCurrentPage(page);
      setIsLoading(true);
      setImageError(false);
      syncReadProgress(page);
    },
    [setCurrentPage, setIsLoading, setImageError, syncReadProgress]
  );

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50">
      <div
        className="relative h-full flex flex-col items-center justify-center"
        onClick={() => setShowControls(!showControls)}
      >
        {/* Contenu principal */}
        <div className="relative h-full w-full flex items-center justify-center">
          <ControlButtons
            showControls={showControls}
            onToggleControls={() => setShowControls(!showControls)}
            onPreviousPage={handlePreviousPage}
            onNextPage={handleNextPage}
            onClose={onClose}
            currentPage={currentPage}
            totalPages={pages.length}
          />

          {/* Pages */}
          <div className="relative flex-1 flex items-center justify-center overflow-hidden p-1">
            <div className="relative w-full h-[calc(100vh-2rem)] flex items-center justify-center">
              {/* Page courante */}
              <div className="relative h-full w-full flex items-center justify-center">
                <ImageLoader isLoading={isLoading} />
                {currentPageUrl && (
                  <img
                    src={currentPageUrl}
                    alt={`Page ${currentPage}`}
                    className={cn(
                      "max-h-full w-auto object-contain transition-opacity duration-300",
                      isLoading ? "opacity-0" : "opacity-100"
                    )}
                    onLoad={() => handleThumbnailLoad(currentPage)}
                  />
                )}
              </div>

              {/* Deuxième page en mode double page */}
              {isDoublePage && shouldShowDoublePage(currentPage) && (
                <div className="relative h-full w-full flex items-center justify-center">
                  <ImageLoader isLoading={secondPageLoading} />
                  {nextPageUrl && (
                    <img
                      src={nextPageUrl}
                      alt={`Page ${currentPage + 1}`}
                      className={cn(
                        "max-h-full w-auto object-contain transition-opacity duration-300",
                        secondPageLoading ? "opacity-0" : "opacity-100"
                      )}
                      onLoad={() => handleThumbnailLoad(currentPage + 1)}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <NavigationBar
          currentPage={currentPage}
          pages={pages}
          onPageChange={handlePageChange}
          showControls={showControls}
          book={book}
        />
      </div>
    </div>
  );
}
