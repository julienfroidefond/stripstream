/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import PhotoSwipe from "photoswipe";
import "photoswipe/style.css";
import type { BookReaderProps } from "./types";
import { useOrientation } from "./hooks/useOrientation";
import { useFullscreen } from "./hooks/useFullscreen";
import { useReadingDirection } from "./hooks/useReadingDirection";
import { useTranslate } from "@/hooks/useTranslate";
import { ControlButtons } from "./components/ControlButtons";
import { NavigationBar } from "./components/NavigationBar";
import { ClientOfflineBookService } from "@/lib/services/client-offlinebook.service";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export function PhotoswipeReader({ book, pages, onClose, nextBook }: BookReaderProps) {
  const router = useRouter();
  const { t } = useTranslate();
  const readerRef = useRef<HTMLDivElement>(null);
  const pswpRef = useRef<PhotoSwipe | null>(null);
  const [currentPage, setCurrentPage] = useState(() => {
    const saved = ClientOfflineBookService.getCurrentPage(book);
    return saved < 1 ? 1 : saved;
  });
  const [isDoublePage, setIsDoublePage] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [showEndMessage, setShowEndMessage] = useState(false);
  const [loadedImages, setLoadedImages] = useState<Record<number, { width: number; height: number }>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [secondPageLoading, setSecondPageLoading] = useState(true);
  const [imageBlobUrls, setImageBlobUrls] = useState<Record<number, string>>({});
  const isLandscape = useOrientation();
  const { direction, toggleDirection, isRTL } = useReadingDirection();
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const isPinchingRef = useRef(false);
  const currentPageRef = useRef(currentPage);
  const lastClickTimeRef = useRef<number>(0);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Garder currentPage à jour dans la ref pour le cleanup
  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  // Activer le zoom dans le reader en enlevant la classe no-pinch-zoom
  useEffect(() => {
    document.body.classList.remove('no-pinch-zoom');

    return () => {
      document.body.classList.add('no-pinch-zoom');
    };
  }, []);

  // Auto double page en paysage
  useEffect(() => {
    setIsDoublePage(isLandscape);
  }, [isLandscape]);

  // Reset loading quand le mode double page change
  useEffect(() => {
    setIsLoading(true);
    setSecondPageLoading(true);
  }, [isDoublePage]);

  const shouldShowDoublePage = useCallback(
    (pageNumber: number) => {
      const isMobile = window.innerHeight < 700;
      if (isMobile) return false;
      if (!isDoublePage) return false;
      if (pageNumber === 1) return false;
      return pageNumber < pages.length;
    },
    [isDoublePage, pages.length]
  );

  // Sync progress
  const syncReadProgress = useCallback(
    async (page: number) => {
      try {
        ClientOfflineBookService.setCurrentPage(book, page);
        const completed = page === pages.length;
        await fetch(`/api/komga/books/${book.id}/read-progress`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ page, completed }),
        });
      } catch (error) {
        console.error("Sync error:", error);
      }
    },
    [book, pages.length]
  );

  const debouncedSync = useCallback(
    (page: number) => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      syncTimeoutRef.current = setTimeout(() => syncReadProgress(page), 500);
    },
    [syncReadProgress]
  );

  const navigateToPage = useCallback(
    (page: number) => {
      if (page >= 1 && page <= pages.length) {
        setCurrentPage(page);
        setIsLoading(true);
        setSecondPageLoading(true);
        // Mettre à jour le localStorage immédiatement
        ClientOfflineBookService.setCurrentPage(book, page);
        // Débouncer seulement l'API Komga
        debouncedSync(page);
      }
    },
    [pages.length, debouncedSync, book]
  );

  const handlePreviousPage = useCallback(() => {
    if (currentPage === 1) return;
    const step = isDoublePage && shouldShowDoublePage(currentPage - 2) ? 2 : 1;
    navigateToPage(Math.max(1, currentPage - step));
  }, [currentPage, isDoublePage, navigateToPage, shouldShowDoublePage]);

  const handleNextPage = useCallback(() => {
    if (currentPage === pages.length) {
      if (nextBook) {
        router.push(`/books/${nextBook.id}`);
        return;
      }
      setShowEndMessage(true);
      return;
    }
    const step = isDoublePage && shouldShowDoublePage(currentPage) ? 2 : 1;
    navigateToPage(Math.min(pages.length, currentPage + step));
  }, [currentPage, pages.length, isDoublePage, shouldShowDoublePage, navigateToPage, nextBook, router]);

  // Touch handlers for swipe navigation
  const handleTouchStart = useCallback((e: TouchEvent) => {
    // Ne pas gérer si Photoswipe est ouvert
    if (pswpRef.current) return;
    
    // Détecter si c'est un pinch (2+ doigts)
    if (e.touches.length > 1) {
      isPinchingRef.current = true;
      touchStartXRef.current = null;
      touchStartYRef.current = null;
      return;
    }
    
    isPinchingRef.current = false;
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    // Ignorer si c'était un pinch
    if (isPinchingRef.current) {
      isPinchingRef.current = false;
      touchStartXRef.current = null;
      touchStartYRef.current = null;
      return;
    }
    
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    if (pswpRef.current) return; // Ne pas gérer si Photoswipe est ouvert

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartXRef.current;
    const deltaY = touchEndY - touchStartYRef.current;

    // Si le déplacement vertical est plus important, on ignore (scroll)
    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      touchStartXRef.current = null;
      touchStartYRef.current = null;
      return;
    }

    // Seuil de 100px pour changer de page
    if (Math.abs(deltaX) > 100) {
      if (deltaX > 0) {
        // Swipe vers la droite
        if (isRTL) {
          handleNextPage();
        } else {
          handlePreviousPage();
        }
      } else {
        // Swipe vers la gauche
        if (isRTL) {
          handlePreviousPage();
        } else {
          handleNextPage();
        }
      }
    }

    touchStartXRef.current = null;
    touchStartYRef.current = null;
  }, [handleNextPage, handlePreviousPage, isRTL]);

  // Keyboard & Touch events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (isRTL) {
          handleNextPage();
        } else {
          handlePreviousPage();
        }
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (isRTL) {
          handlePreviousPage();
        } else {
          handleNextPage();
        }
      } else if (e.key === "Escape" && onClose) {
        e.preventDefault();
        onClose(currentPage);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchend", handleTouchEnd);
    
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleNextPage, handlePreviousPage, handleTouchStart, handleTouchEnd, onClose, isRTL, currentPage]);

  // Cleanup - Sync final sans debounce
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      // Sync immédiatement au cleanup avec la VRAIE valeur actuelle
      syncReadProgress(currentPageRef.current);
    };
  }, [syncReadProgress]);

  const getPageUrl = useCallback((pageNum: number) => `/api/komga/books/${book.id}/pages/${pageNum}`, [book.id]);

  // Load image dimensions
  const loadImageDimensions = useCallback((pageNum: number) => {
    if (loadedImages[pageNum]) return;
    
    const img = new Image();
    img.onload = () => {
      setLoadedImages(prev => ({
        ...prev,
        [pageNum]: { width: img.naturalWidth, height: img.naturalHeight }
      }));
    };
    img.src = getPageUrl(pageNum);
  }, [loadedImages, getPageUrl]);

  // Preload current and next pages dimensions
  useEffect(() => {
    loadImageDimensions(currentPage);
    if (isDoublePage && shouldShowDoublePage(currentPage)) {
      loadImageDimensions(currentPage + 1);
    }
    // Preload next
    if (currentPage < pages.length) {
      loadImageDimensions(currentPage + 1);
      if (isDoublePage && currentPage + 1 < pages.length) {
        loadImageDimensions(currentPage + 2);
      }
    }
  }, [currentPage, isDoublePage, shouldShowDoublePage, loadImageDimensions, pages.length]);

  // Handle zoom via button
  const handleZoom = useCallback(() => {
    const dims = loadedImages[currentPage];
    if (!dims) return;

    const dataSource = [{
      src: getPageUrl(currentPage),
      width: dims.width,
      height: dims.height,
      alt: `Page ${currentPage}`
    }];

    // Close any existing instance
    if (pswpRef.current) {
      pswpRef.current.close();
    }

    // Create and open PhotoSwipe
    const pswp = new PhotoSwipe({
      dataSource,
      index: 0,
      bgOpacity: 0.9,
      showHideAnimationType: 'fade',
      initialZoomLevel: 0.25,
      secondaryZoomLevel: 0.5, // Niveau de zoom au double-clic
      maxZoomLevel: 4,
      clickToCloseNonZoomable: true, // Ferme au clic simple
      tapAction: 'zoom', // Ferme au tap
      wheelToZoom: true,
      pinchToClose: false, // Pinch pour fermer
      closeOnVerticalDrag: true, // Swipe vertical pour fermer
      escKey: true, // ESC ferme le zoom
      arrowKeys: false, // On gère les flèches nous-mêmes
    });

    pswpRef.current = pswp;
    pswp.init();

    // Clean up on close
    pswp.on('close', () => {
      pswpRef.current = null;
    });
  }, [loadedImages, currentPage, getPageUrl]);

  // Cleanup PhotoSwipe on unmount
  useEffect(() => {
    return () => {
      if (pswpRef.current) {
        pswpRef.current.close();
      }
      // Révoquer toutes les blob URLs
      Object.values(imageBlobUrls).forEach(url => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [imageBlobUrls]);

  // Force reload handler
  const handleForceReload = useCallback(async () => {
    setIsLoading(true);
    setSecondPageLoading(true);
    
    // Révoquer les anciennes URLs blob
    if (imageBlobUrls[currentPage]) {
      URL.revokeObjectURL(imageBlobUrls[currentPage]);
    }
    if (imageBlobUrls[currentPage + 1]) {
      URL.revokeObjectURL(imageBlobUrls[currentPage + 1]);
    }
    
    try {
      // Fetch page 1 avec cache: reload
      const response1 = await fetch(getPageUrl(currentPage), {
        cache: 'reload',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response1.ok) {
        throw new Error(`HTTP ${response1.status}`);
      }
      
      const blob1 = await response1.blob();
      const blobUrl1 = URL.createObjectURL(blob1);
      
      const newUrls: Record<number, string> = {
        ...imageBlobUrls,
        [currentPage]: blobUrl1
      };
      
      // Fetch page 2 si double page
      if (isDoublePage && shouldShowDoublePage(currentPage)) {
        const response2 = await fetch(getPageUrl(currentPage + 1), {
          cache: 'reload',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        if (!response2.ok) {
          throw new Error(`HTTP ${response2.status}`);
        }
        
        const blob2 = await response2.blob();
        const blobUrl2 = URL.createObjectURL(blob2);
        newUrls[currentPage + 1] = blobUrl2;
      }
      
      setImageBlobUrls(newUrls);
    } catch (error) {
      console.error('Error reloading images:', error);
      setIsLoading(false);
      setSecondPageLoading(false);
    }
  }, [currentPage, imageBlobUrls, isDoublePage, shouldShowDoublePage, getPageUrl]);

  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    // Vérifier si c'est un double-clic sur une image
    const target = e.target as HTMLElement;
    const now = Date.now();
    const timeSinceLastClick = now - lastClickTimeRef.current;
    
    if (target.tagName === 'IMG' && timeSinceLastClick < 300) {
      // Double-clic sur une image
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }
      e.stopPropagation();
      handleZoom();
      lastClickTimeRef.current = 0;
    } else if (target.tagName === 'IMG') {
      // Premier clic sur une image - attendre pour voir si c'est un double-clic
      lastClickTimeRef.current = now;
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
      clickTimeoutRef.current = setTimeout(() => {
        setShowControls(prev => !prev);
        clickTimeoutRef.current = null;
      }, 300);
    } else {
      // Clic ailleurs - toggle les contrôles immédiatement
      setShowControls(!showControls);
      lastClickTimeRef.current = 0;
    }
  }, [showControls, handleZoom]);

  return (
    <div
      ref={readerRef}
      className="reader-zoom-enabled fixed inset-0 bg-background/95 backdrop-blur-sm z-50 overflow-hidden"
      onClick={handleContainerClick}
    >
      <div className="relative h-full flex flex-col items-center justify-center">
        {showEndMessage && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50">
            <div className="bg-background/80 backdrop-blur-md border rounded-lg shadow-lg p-6 max-w-md text-center">
              <h3 className="text-lg font-semibold mb-2">{t("reader.endOfSeries")}</h3>
              <p className="text-muted-foreground mb-4">{t("reader.endOfSeriesMessage")}</p>
              <button
                onClick={() => onClose?.(currentPage)}
                className="px-4 py-2 bg-primary/90 backdrop-blur-md text-primary-foreground rounded-md hover:bg-primary/80 transition-colors"
              >
                {t("reader.backToSeries")}
              </button>
            </div>
          </div>
        )}

        <ControlButtons
          showControls={showControls}
          onToggleControls={() => setShowControls(!showControls)}
          onPreviousPage={handlePreviousPage}
          onNextPage={handleNextPage}
          onPageChange={navigateToPage}
          onClose={onClose}
          currentPage={currentPage}
          totalPages={pages.length}
          isDoublePage={isDoublePage}
          onToggleDoublePage={() => setIsDoublePage(!isDoublePage)}
          isFullscreen={isFullscreen}
          onToggleFullscreen={() => toggleFullscreen(readerRef.current)}
          direction={direction}
          onToggleDirection={toggleDirection}
          showThumbnails={showThumbnails}
          onToggleThumbnails={() => setShowThumbnails(!showThumbnails)}
          onZoom={handleZoom}
          onForceReload={handleForceReload}
        />

        {/* Reader content */}
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
              <img
                key={`page-${currentPage}-${imageBlobUrls[currentPage] || ''}`}
                src={imageBlobUrls[currentPage] || getPageUrl(currentPage)}
                alt={`Page ${currentPage}`}
                className={cn(
                  "max-h-full max-w-full object-contain transition-opacity cursor-pointer",
                  isLoading ? "opacity-0" : "opacity-100"
                )}
                loading="eager"
                onLoad={() => setIsLoading(false)}
                onError={() => setIsLoading(false)}
                ref={(img) => {
                  // Si l'image est déjà en cache, onLoad ne sera pas appelé
                  if (img?.complete && img?.naturalHeight !== 0) {
                    setIsLoading(false);
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
                <img
                  key={`page-${currentPage + 1}-${imageBlobUrls[currentPage + 1] || ''}`}
                  src={imageBlobUrls[currentPage + 1] || getPageUrl(currentPage + 1)}
                  alt={`Page ${currentPage + 1}`}
                  className={cn(
                    "max-h-full max-w-full object-contain transition-opacity cursor-pointer",
                    secondPageLoading ? "opacity-0" : "opacity-100"
                  )}
                  loading="eager"
                  onLoad={() => setSecondPageLoading(false)}
                  onError={() => setSecondPageLoading(false)}
                  ref={(img) => {
                    // Si l'image est déjà en cache, onLoad ne sera pas appelé
                    if (img?.complete && img?.naturalHeight !== 0) {
                      setSecondPageLoading(false);
                    }
                  }}
                />
              </div>
            )}
          </div>
        </div>

        <NavigationBar
          currentPage={currentPage}
          pages={pages}
          onPageChange={navigateToPage}
          showControls={showControls}
          showThumbnails={showThumbnails}
          book={book}
        />
      </div>
    </div>
  );
}

