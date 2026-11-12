/* eslint-disable no-console */
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { NormalizedBook } from "@/lib/providers/types";
import {
  planPageJump,
  planPageMove,
  resolveInitialPage,
  type PageMove,
} from "@/lib/reader/page-navigation";
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
    const initial = resolveInitialPage(saved, pages.length, isAnonymous);
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

  const applyPageMove = useCallback(
    (move: PageMove, fromPage: number) => {
      switch (move.kind) {
        case "page":
          console.debug(`[reader/nav] navigate ${fromPage} → ${move.page} bookId=${book.id}`);
          setCurrentPage(move.page);
          readProgress.track(move.page);
          break;
        case "start-bump":
          setStartBump((count) => count + 1);
          break;
        case "next-book":
          console.debug(`[reader/nav] end of book → next bookId=${move.bookId}`);
          router.replace(`/books/${move.bookId}`);
          break;
        case "end":
          console.debug(`[reader/nav] end of book, no next → end message`);
          setShowEndMessage(true);
          break;
      }
    },
    [book.id, readProgress, router]
  );

  const navigateToPage = useCallback(
    (page: number) => {
      const jump = planPageJump(page, pages.length);
      if (jump.kind === "out-of-bounds") {
        console.warn(
          `[reader/nav] navigate out of bounds page=${jump.page} total=${pages.length}`
        );
        return;
      }
      applyPageMove(jump, currentPage);
    },
    [applyPageMove, currentPage, pages.length]
  );

  const handlePreviousPage = useCallback(() => {
    applyPageMove(
      planPageMove("previous", {
        currentPage,
        totalPages: pages.length,
        isDoublePage,
        shouldShowDoublePage,
      }),
      currentPage
    );
  }, [applyPageMove, currentPage, isDoublePage, pages.length, shouldShowDoublePage]);

  const handleNextPage = useCallback(() => {
    applyPageMove(
      planPageMove("next", {
        currentPage,
        totalPages: pages.length,
        isDoublePage,
        shouldShowDoublePage,
        nextBookId: nextBook?.id ?? null,
      }),
      currentPage
    );
  }, [
    applyPageMove,
    currentPage,
    isDoublePage,
    pages.length,
    shouldShowDoublePage,
    nextBook?.id,
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
