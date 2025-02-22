/* eslint-disable @next/next/no-img-element */
"use client";

import { BookReaderProps } from "./types";
import { useOrientation } from "./hooks/useOrientation";
import { usePageNavigation } from "./hooks/usePageNavigation";
import { usePageCache } from "./hooks/usePageCache";
import { useState, useEffect, useCallback, useRef } from "react";
import { NavigationBar } from "./components/NavigationBar";
import { ControlButtons } from "./components/ControlButtons";
import { ImageLoader } from "@/components/ui/image-loader";
import { cn } from "@/lib/utils";
import { useReadingDirection } from "./hooks/useReadingDirection";

export function BookReader({ book, pages, onClose }: BookReaderProps) {
  const [isDoublePage, setIsDoublePage] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const readerRef = useRef<HTMLDivElement>(null);
  const isLandscape = useOrientation();
  const { direction, toggleDirection, isRTL } = useReadingDirection();

  const {
    currentPage,
    navigateToPage,
    isLoading,
    setIsLoading,
    secondPageLoading,
    setSecondPageLoading,
    handlePreviousPage,
    handleNextPage,
    shouldShowDoublePage,
  } = usePageNavigation({
    book,
    pages,
    isDoublePage,
    onClose,
    direction,
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
        if (error instanceof Error) {
          console.error(
            `Erreur de chargement des URLs pour la page ${currentPage}:`,
            error.message
          );
        }
        // On s'assure que le chargement est terminé même en cas d'erreur
        if (isMounted) {
          setIsLoading(false);
          setSecondPageLoading(false);
        }
      }
    };

    setIsLoading(true);
    setSecondPageLoading(true);
    loadPageUrls();

    return () => {
      isMounted = false;
    };
  }, [
    currentPage,
    isDoublePage,
    shouldShowDoublePage,
    getPageUrl,
    setIsLoading,
    setSecondPageLoading,
  ]);

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
  }, [
    currentPage,
    isDoublePage,
    shouldShowDoublePage,
    preloadPage,
    cleanCache,
    pages.length,
    isRTL,
  ]);

  // Effet pour gérer le mode double page automatiquement en paysage
  useEffect(() => {
    setIsDoublePage(isLandscape);
  }, [isLandscape]);

  // Effet pour gérer le fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(console.error);
      }
    };
  }, []);

  const handleThumbnailLoad = useCallback(
    (pageNumber: number) => {
      if (pageNumber === currentPage) {
        setIsLoading(false);
      } else if (pageNumber === currentPage + 1) {
        setSecondPageLoading(false);
      }
    },
    [currentPage, setIsLoading, setSecondPageLoading]
  );

  return (
    <div
      ref={readerRef}
      className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 overflow-hidden touch-none"
    >
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
            isDoublePage={isDoublePage}
            onToggleDoublePage={() => setIsDoublePage(!isDoublePage)}
            isFullscreen={isFullscreen}
            onToggleFullscreen={async () => {
              try {
                if (isFullscreen) {
                  await document.exitFullscreen();
                } else if (readerRef.current) {
                  await readerRef.current.requestFullscreen();
                }
              } catch (error) {
                console.error("Erreur lors du changement de mode plein écran:", error);
              }
            }}
            direction={direction}
            onToggleDirection={toggleDirection}
          />

          {/* Pages */}
          <div className="relative flex-1 flex items-center justify-center overflow-hidden p-1">
            <div className="relative w-full h-[calc(100vh-2rem)] flex items-center justify-center gap-0">
              {/* 
                Note: Nous utilisons intentionnellement des balises <img> natives au lieu de next/image pour :
                1. Avoir un contrôle précis sur le chargement et le préchargement des pages
                2. Gérer efficacement le mode double page et les transitions
                3. Les images sont déjà optimisées côté serveur
                4. La performance est critique pour une lecture fluide
              */}
              {/* Page courante */}
              <div
                className={cn(
                  "relative h-full flex items-center",
                  isDoublePage ? "w-1/2 justify-end" : "w-full justify-center"
                )}
              >
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
                <div className={cn("relative h-full w-1/2 flex items-center", "justify-start")}>
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

          {/* Barre de navigation */}
          <NavigationBar
            currentPage={currentPage}
            pages={pages}
            onPageChange={navigateToPage}
            showControls={showControls}
            book={book}
          />
        </div>
      </div>
    </div>
  );
}
