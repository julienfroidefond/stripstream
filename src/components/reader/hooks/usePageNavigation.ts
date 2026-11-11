/* eslint-disable no-console */
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { NormalizedBook } from "@/lib/providers/types";
import { useAnonymous } from "@/contexts/AnonymousContext";
import { useReadProgressSession } from "./useReadProgressSession";

interface UsePageNavigationProps {
  book: NormalizedBook;
  pages: number[];
  isDoublePage: boolean;
  shouldShowDoublePage: (page: number) => boolean;
  onClose?: (currentPage: number) => void;
  nextBook?: NormalizedBook | null;
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
  const { isAnonymous } = useAnonymous();

  const [currentPage, setCurrentPage] = useState(() => {
    const saved = isAnonymous ? 0 : (book.readProgress?.page ?? 0);
    const initial = saved < 1 ? 1 : saved;
    console.debug(`[reader/nav] init bookId=${book.id} savedPage=${saved} startPage=${initial} total=${pages.length}`);
    return initial;
  });
  const [showEndMessage, setShowEndMessage] = useState(false);
  // Incrémenté à chaque tentative de reculer depuis la première page : la vue
  // y répond par un rebond, pour signaler le début du livre.
  const [startBump, setStartBump] = useState(0);
  // La navigation ne connaît que le curseur d'affichage. La session de
  // progression possède le debounce, la complétion et le flush de démontage.
  const readProgress = useReadProgressSession({
    book,
    totalPages: pages.length,
    initialPage: currentPage,
  });

  const navigateToPage = useCallback(
    (page: number) => {
      if (page >= 1 && page <= pages.length) {
        console.debug(`[reader/nav] navigate ${currentPage} → ${page} bookId=${book.id}`);
        setCurrentPage(page);
        readProgress.track(page);
      } else {
        console.warn(`[reader/nav] navigate out of bounds page=${page} total=${pages.length}`);
      }
    },
    [currentPage, pages.length, book.id, readProgress]
  );

  const handlePreviousPage = useCallback(() => {
    if (currentPage === 1) {
      setStartBump((count) => count + 1);
      return;
    }
    const step = isDoublePage && shouldShowDoublePage(currentPage - 2) ? 2 : 1;
    navigateToPage(Math.max(1, currentPage - step));
  }, [currentPage, isDoublePage, navigateToPage, shouldShowDoublePage]);

  const handleNextPage = useCallback(() => {
    if (currentPage === pages.length) {
      if (nextBook) {
        console.debug(`[reader/nav] end of book → next bookId=${nextBook.id}`);
        router.replace(`/books/${nextBook.id}`);
        return;
      }
      console.debug(`[reader/nav] end of book, no next → end message`);
      setShowEndMessage(true);
      return;
    }
    const step = isDoublePage && shouldShowDoublePage(currentPage) ? 2 : 1;
    navigateToPage(Math.min(pages.length, currentPage + step));
  }, [
    currentPage,
    pages.length,
    isDoublePage,
    shouldShowDoublePage,
    navigateToPage,
    nextBook,
    router,
  ]);

  return {
    currentPage,
    setCurrentPage,
    showEndMessage,
    setShowEndMessage,
    startBump,
    navigateToPage,
    handlePreviousPage,
    handleNextPage,
  };
}
