import { useState, useCallback, useEffect, useRef } from "react";
import type { KomgaBook } from "@/types/komga";
import { ClientOfflineBookService } from "@/lib/services/client-offlinebook.service";

interface UsePageNavigationProps {
  book: KomgaBook;
  pages: number[];
  isDoublePage: boolean;
  onClose?: (currentPage: number) => void;
  direction: "ltr" | "rtl";
}

export const usePageNavigation = ({
  book,
  pages,
  isDoublePage,
  onClose,
  direction,
}: UsePageNavigationProps) => {
  const cPage = ClientOfflineBookService.getCurrentPage(book);
  const [currentPage, setCurrentPage] = useState(cPage < 1 ? 1 : cPage);
  const [isLoading, setIsLoading] = useState(true);
  const [secondPageLoading, setSecondPageLoading] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const lastPanPositionRef = useRef({ x: 0, y: 0 });
  const currentPageRef = useRef(currentPage);
  const isRTL = direction === "rtl";
  const initialDistanceRef = useRef<number | null>(null);
  const DEFAULT_ZOOM_LEVEL = 2;

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  const syncReadProgress = useCallback(
    async (page: number) => {
      try {
        ClientOfflineBookService.setCurrentPage(book, page);
        const completed = page === pages.length;
        await fetch(`/api/komga/books/${book.id}/read-progress`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ page, completed }),
        });
      } catch (error) {
        if (error instanceof Error) {
          console.error(
            `Erreur de synchronisation de la progression pour le livre ${book.id} à la page ${page}:`,
            error.message
          );
        }
      }
    },
    [book, pages.length]
  );

  const debouncedSyncReadProgress = useCallback(
    (page: number) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        syncReadProgress(page);
        timeoutRef.current = null;
      }, 2000);
    },
    [syncReadProgress]
  );

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

  const navigateToPage = useCallback(
    (page: number) => {
      // if (page >= 1 && page <= pages.length) {
      setCurrentPage(page);
      setIsLoading(true);
      setSecondPageLoading(true);
      debouncedSyncReadProgress(page);
      // }
    },
    [debouncedSyncReadProgress]
  );

  const handlePreviousPage = useCallback(() => {
    if (currentPage === 1) return;
    if (isDoublePage && shouldShowDoublePage(currentPage - 2)) {
      navigateToPage(Math.max(1, currentPage - 2));
    } else {
      navigateToPage(Math.max(1, currentPage - 1));
    }
  }, [currentPage, isDoublePage, navigateToPage, shouldShowDoublePage]);

  const handleNextPage = useCallback(() => {
    if (currentPage === pages.length) return;
    if (isDoublePage && shouldShowDoublePage(currentPage)) {
      navigateToPage(Math.min(pages.length, currentPage + 2));
    } else {
      navigateToPage(Math.min(pages.length, currentPage + 1));
    }
  }, [currentPage, isDoublePage, navigateToPage, pages.length, shouldShowDoublePage]);

  const calculateDistance = (touch1: Touch, touch2: Touch) => {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchMove = useCallback(
    (event: TouchEvent) => {
      if (event.touches.length === 2) {
        const distance = calculateDistance(event.touches[0], event.touches[1]);
        if (initialDistanceRef.current !== null) {
          const scale = distance / initialDistanceRef.current;
          const zoomFactor = 0.3;
          setZoomLevel((prevZoomLevel) =>
            Math.min(3, Math.max(1, prevZoomLevel + (scale - 1) * zoomFactor))
          );
        }
      } else if (event.touches.length === 1 && zoomLevel > 1) {
        // Gestion du pan uniquement quand on est zoomé
        if (touchStartXRef.current !== null && touchStartYRef.current !== null) {
          const deltaX = event.touches[0].clientX - touchStartXRef.current;
          const deltaY = event.touches[0].clientY - touchStartYRef.current;

          setPanPosition({
            x: lastPanPositionRef.current.x + deltaX,
            y: lastPanPositionRef.current.y + deltaY,
          });
        }
        event.preventDefault(); // Empêcher le scroll de la page
      }
    },
    [zoomLevel]
  );

  const handleTouchStart = useCallback(
    (event: TouchEvent) => {
      if (event.touches.length === 2) {
        initialDistanceRef.current = calculateDistance(event.touches[0], event.touches[1]);
      } else {
        touchStartXRef.current = event.touches[0].clientX;
        touchStartYRef.current = event.touches[0].clientY;
        lastPanPositionRef.current = panPosition;
        currentPageRef.current = currentPage;
      }
    },
    [currentPage, panPosition]
  );

  const handleTouchEnd = useCallback(
    (event: TouchEvent) => {
      if (event.touches.length < 2) {
        initialDistanceRef.current = null;
      }
      if (touchStartXRef.current === null || touchStartYRef.current === null) return;

      const touchEndX = event.changedTouches[0].clientX;
      const touchEndY = event.changedTouches[0].clientY;
      const deltaX = touchEndX - touchStartXRef.current;
      const deltaY = touchEndY - touchStartYRef.current;

      // Si on est zoomé, on met à jour la position finale du pan
      if (zoomLevel > 1) {
        lastPanPositionRef.current = {
          x: lastPanPositionRef.current.x + deltaX,
          y: lastPanPositionRef.current.y + deltaY,
        };
        return;
      }

      // Si le déplacement vertical est plus important que le déplacement horizontal,
      // on ne fait rien (pour éviter de confondre avec un scroll)
      if (Math.abs(deltaY) > Math.abs(deltaX)) return;

      // On vérifie si le déplacement est suffisant pour changer de page
      if (Math.abs(deltaX) > 50) {
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
    },
    [handleNextPage, handlePreviousPage, isRTL, zoomLevel]
  );

  // Reset du pan quand on change de page ou dezoom
  useEffect(() => {
    if (zoomLevel === 1) {
      setPanPosition({ x: 0, y: 0 });
      lastPanPositionRef.current = { x: 0, y: 0 };
    }
  }, [zoomLevel, currentPage]);

  useEffect(() => {
    setIsLoading(true);
    setSecondPageLoading(true);
  }, [isDoublePage]);

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
    window.addEventListener("touchmove", handleTouchMove);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, [
    handleNextPage,
    handlePreviousPage,
    handleTouchStart,
    handleTouchEnd,
    onClose,
    isRTL,
    handleTouchMove,
  ]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        syncReadProgress(currentPageRef.current);
        ClientOfflineBookService.removeCurrentPage(book);
      }
    };
  }, [syncReadProgress, book]);

  const handleDoubleClick = useCallback(() => {
    setZoomLevel((prevZoom) => {
      if (prevZoom === 1) {
        return DEFAULT_ZOOM_LEVEL;
      }
      return 1;
    });
  }, []);

  return {
    currentPage,
    navigateToPage,
    isLoading,
    setIsLoading,
    secondPageLoading,
    setSecondPageLoading,
    handlePreviousPage,
    handleNextPage,
    shouldShowDoublePage,
    zoomLevel,
    panPosition,
    handleDoubleClick,
  };
};
