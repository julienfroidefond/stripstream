import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ClientOfflineBookService } from "@/lib/services/client-offlinebook.service";
import type { KomgaBook } from "@/types/komga";
import logger from "@/lib/logger";

interface UsePageNavigationProps {
  book: KomgaBook;
  pages: number[];
  isDoublePage: boolean;
  shouldShowDoublePage: (page: number) => boolean;
  onClose?: (currentPage: number) => void;
  nextBook?: KomgaBook | null;
}

export function usePageNavigation({
  book,
  pages,
  isDoublePage,
  shouldShowDoublePage,
  onClose: _onClose,
  nextBook,
}: UsePageNavigationProps) {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(() => {
    const saved = ClientOfflineBookService.getCurrentPage(book);
    return saved < 1 ? 1 : saved;
  });
  const [showEndMessage, setShowEndMessage] = useState(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentPageRef = useRef(currentPage);
  const bookRef = useRef(book);
  const pagesLengthRef = useRef(pages.length);

  // Garder les refs à jour
  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  useEffect(() => {
    bookRef.current = book;
    pagesLengthRef.current = pages.length;
  }, [book, pages.length]);

  // Sync progress
  const syncReadProgress = useCallback(
    async (page: number) => {
      try {
        ClientOfflineBookService.setCurrentPage(bookRef.current, page);
        const completed = page === pagesLengthRef.current;
        await fetch(`/api/komga/books/${bookRef.current.id}/read-progress`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ page, completed }),
        });
      } catch (error) {
        logger.error({ err: error }, "Sync error:");
      }
    },
    [] // Pas de dépendances car on utilise des refs
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

  return {
    currentPage,
    setCurrentPage,
    showEndMessage,
    setShowEndMessage,
    navigateToPage,
    handlePreviousPage,
    handleNextPage,
  };
}