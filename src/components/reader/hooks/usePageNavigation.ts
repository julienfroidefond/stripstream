import { useState, useCallback, useEffect } from "react";
import { KomgaBook } from "@/types/komga";

interface UsePageNavigationProps {
  book: KomgaBook;
  pages: number[];
  isDoublePage: boolean;
}

export const usePageNavigation = ({ book, pages, isDoublePage }: UsePageNavigationProps) => {
  const [currentPage, setCurrentPage] = useState(book.readProgress?.page || 1);
  const [isLoading, setIsLoading] = useState(true);
  const [secondPageLoading, setSecondPageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

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

  const shouldShowDoublePage = useCallback(
    (pageNumber: number) => {
      if (!isDoublePage) return false;
      if (pageNumber === 1) return false;
      return pageNumber < pages.length;
    },
    [isDoublePage, pages.length]
  );

  const handlePreviousPage = useCallback(() => {
    if (currentPage > 1) {
      const newPage = isDoublePage && currentPage > 2 ? currentPage - 2 : currentPage - 1;
      setCurrentPage(newPage);
      setIsLoading(true);
      setSecondPageLoading(true);
      setImageError(false);

      const timer = setTimeout(() => {
        syncReadProgress(newPage);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentPage, isDoublePage, syncReadProgress]);

  const handleNextPage = useCallback(() => {
    if (currentPage < pages.length) {
      const newPage = isDoublePage ? Math.min(currentPage + 2, pages.length) : currentPage + 1;
      setCurrentPage(newPage);
      setIsLoading(true);
      setSecondPageLoading(true);
      setImageError(false);

      const timer = setTimeout(() => {
        syncReadProgress(newPage);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentPage, pages.length, isDoublePage, syncReadProgress]);

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
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlePreviousPage, handleNextPage]);

  return {
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
  };
};
