import { useState, useCallback, useEffect, useRef } from "react";
import { KomgaBook } from "@/types/komga";

interface UsePageNavigationProps {
  book: KomgaBook;
  pages: number[];
  isDoublePage: boolean;
  onClose?: () => void;
}

export const usePageNavigation = ({
  book,
  pages,
  isDoublePage,
  onClose = () => {},
}: UsePageNavigationProps) => {
  const [currentPage, setCurrentPage] = useState(book.readProgress?.page || 1);
  const [isLoading, setIsLoading] = useState(true);
  const [secondPageLoading, setSecondPageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const currentPageRef = useRef(currentPage);

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  const syncReadProgress = useCallback(
    async (page: number) => {
      try {
        const completed = page === pages.length;
        await fetch(`/api/komga/books/${book.id}/read-progress`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ page, completed }),
        });
      } catch (error) {
        console.error("Erreur lors de la synchronisation de la progression:", error);
      }
    },
    [book.id, pages.length]
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
      if (!isDoublePage) return false;
      if (pageNumber === 1) return false;
      return pageNumber < pages.length;
    },
    [isDoublePage, pages.length]
  );

  const navigateToPage = useCallback(
    (page: number) => {
      setCurrentPage(page);
      setIsLoading(true);
      setSecondPageLoading(true);
      setImageError(false);
      debouncedSyncReadProgress(page);
    },
    [debouncedSyncReadProgress]
  );

  const handlePreviousPage = useCallback(() => {
    if (currentPage > 1) {
      const newPage = isDoublePage && currentPage > 2 ? currentPage - 2 : currentPage - 1;
      navigateToPage(newPage);
    }
  }, [currentPage, isDoublePage, navigateToPage]);

  const handleNextPage = useCallback(() => {
    if (currentPage < pages.length) {
      const newPage = isDoublePage ? Math.min(currentPage + 2, pages.length) : currentPage + 1;
      navigateToPage(newPage);
    }
  }, [currentPage, pages.length, isDoublePage, navigateToPage]);

  const handleTouchStart = useCallback((event: TouchEvent) => {
    touchStartXRef.current = event.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(
    (event: TouchEvent) => {
      if (touchStartXRef.current === null) return;

      const touchEndX = event.changedTouches[0].clientX;
      const deltaX = touchEndX - touchStartXRef.current;
      const minSwipeDistance = 50;

      if (Math.abs(deltaX) > minSwipeDistance) {
        if (deltaX > 0) {
          handlePreviousPage();
        } else {
          handleNextPage();
        }
      }

      touchStartXRef.current = null;
    },
    [handlePreviousPage, handleNextPage]
  );

  useEffect(() => {
    setIsLoading(true);
    setSecondPageLoading(true);
  }, [isDoublePage]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        handlePreviousPage();
      } else if (event.key === "ArrowRight") {
        handleNextPage();
      } else if (event.key === "Escape" && onClose) {
        onClose();
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
  }, [handlePreviousPage, handleNextPage, handleTouchStart, handleTouchEnd, onClose]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        syncReadProgress(currentPageRef.current);
      }
    };
  }, [syncReadProgress]);

  return {
    currentPage,
    navigateToPage,
    isLoading,
    setIsLoading,
    secondPageLoading,
    setSecondPageLoading,
    imageError,
    setImageError,
    handlePreviousPage,
    handleNextPage,
    shouldShowDoublePage,
    syncReadProgress: debouncedSyncReadProgress,
  };
};
