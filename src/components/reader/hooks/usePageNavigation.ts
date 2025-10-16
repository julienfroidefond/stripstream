import { useState, useCallback, useEffect, useRef } from "react";
import type { KomgaBook } from "@/types/komga";
import { ClientOfflineBookService } from "@/lib/services/client-offlinebook.service";
import { useRouter } from "next/navigation";

interface UsePageNavigationProps {
  book: KomgaBook;
  pages: number[];
  isDoublePage: boolean;
  onClose?: (currentPage: number) => void;
  direction: "ltr" | "rtl";
  nextBook?: KomgaBook | null;
}

export const usePageNavigation = ({
  book,
  pages,
  isDoublePage,
  onClose,
  direction,
  nextBook,
}: UsePageNavigationProps) => {
  const router = useRouter();
  const cPage = ClientOfflineBookService.getCurrentPage(book);
  const [currentPage, setCurrentPage] = useState(cPage < 1 ? 1 : cPage);
  const [isLoading, setIsLoading] = useState(true);
  const [secondPageLoading, setSecondPageLoading] = useState(true);
  const [showEndMessage, setShowEndMessage] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const currentPageRef = useRef(currentPage);
  const isRTL = direction === "rtl";

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
    if (currentPage === pages.length) {
      if (nextBook) {
        router.push(`/books/${nextBook.id}`);
        return;
      } else {
        setShowEndMessage(true);
        return;
      }
    }
    if (isDoublePage && shouldShowDoublePage(currentPage)) {
      navigateToPage(Math.min(pages.length, currentPage + 2));
    } else {
      navigateToPage(Math.min(pages.length, currentPage + 1));
    }
  }, [
    currentPage,
    isDoublePage,
    navigateToPage,
    pages.length,
    shouldShowDoublePage,
    nextBook,
    router,
  ]);

  const handleTouchStart = useCallback(
    (event: TouchEvent) => {
      // Ne gérer que les gestes à un seul doigt
      if (event.touches.length === 1) {
        touchStartXRef.current = event.touches[0].clientX;
        touchStartYRef.current = event.touches[0].clientY;
        currentPageRef.current = currentPage;
      } else {
        // Reset les références pour les gestes multi-touch (pinch)
        touchStartXRef.current = null;
        touchStartYRef.current = null;
      }
    },
    [currentPage]
  );

  const handleTouchEnd = useCallback(
    (event: TouchEvent) => {
      // Ne traiter que les gestes à un seul doigt
      if (event.touches.length > 1) return;
      
      if (touchStartXRef.current === null || touchStartYRef.current === null) return;

      const touchEndX = event.changedTouches[0].clientX;
      const touchEndY = event.changedTouches[0].clientY;
      const deltaX = touchEndX - touchStartXRef.current;
      const deltaY = touchEndY - touchStartYRef.current;

      // Si le déplacement vertical est plus important que le déplacement horizontal,
      // on ne fait rien (pour éviter de confondre avec un scroll)
      if (Math.abs(deltaY) > Math.abs(deltaX)) return;

      // Augmenter le seuil pour éviter les changements de page accidentels
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
    },
    [handleNextPage, handlePreviousPage, isRTL]
  );


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

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [
    handleNextPage,
    handlePreviousPage,
    handleTouchStart,
    handleTouchEnd,
    onClose,
    isRTL,
    currentPage,
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

  const handleDoubleClick = useCallback((transformRef?: any) => {
    if (transformRef?.current) {
      try {
        // Utiliser setTransform au lieu de zoomIn pour éviter les NaN
        const transform = transformRef.current;
        const currentScale = transform.instance?.state?.scale || 1;
        
        if (currentScale <= 1.1) {
          // Zoom à 2x
          transform.setTransform(0, 0, 2);
        } else {
          // Reset à 1x
          transform.setTransform(0, 0, 1);
        }
      } catch (error) {
        console.error("Error in handleDoubleClick:", error);
      }
    }
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
    handleDoubleClick,
    showEndMessage,
  };
};
