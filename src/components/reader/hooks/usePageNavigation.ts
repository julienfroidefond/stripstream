/* eslint-disable no-console */
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { NormalizedBook } from "@/lib/providers/types";
import {
  planPageJump,
  planPageMove,
  progressPageFor,
  resolveInitialPage,
  type PageMove,
  spreadStartFor,
} from "@/lib/reader/page-navigation";
import { useAnonymous } from "@/contexts/AnonymousContext";
import { useReadProgressSession } from "./useReadProgressSession";

interface UsePageNavigationProps {
  book: NormalizedBook;
  pages: number[];
  isDoublePage: boolean;
  shouldShowDoublePage: (page: number) => boolean;
  nextBook?: NormalizedBook | null;
}

export function usePageNavigation({
  book,
  pages,
  isDoublePage,
  shouldShowDoublePage,
  nextBook,
}: UsePageNavigationProps) {
  const router = useRouter();
  const { isAnonymous } = useAnonymous();

  const [cursorPage, setCurrentPage] = useState(() => {
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
    initialPage: cursorPage,
  });

  const totalPages = pages.length;

  // En double page, l'écran s'aligne sur une paire (couverture seule, puis
  // 2-3, 4-5…). Une page d'ouverture impaire (reprise sur la page 7) ou un
  // passage en double page au milieu du livre afficherait sinon 7-8, décalé
  // d'une page jusqu'au premier retour arrière. La page affichée est donc
  // dérivée du curseur ; la progression enregistrée ne change pas.
  const currentPage = spreadStartFor(cursorPage, { isDoublePage, shouldShowDoublePage });

  const applyPageMove = useCallback(
    (move: PageMove, fromPage: number) => {
      const spread = { isDoublePage, shouldShowDoublePage };
      switch (move.kind) {
        case "page":
          console.debug(`[reader/nav] navigate ${fromPage} → ${move.page} bookId=${book.id}`);
          setCurrentPage(move.page);
          // A spread that shows the last page records the book as finished.
          readProgress.track(progressPageFor(move.page, totalPages, spread));
          break;
        case "start-bump":
          setStartBump((count) => count + 1);
          break;
        case "next-book":
          console.debug(`[reader/nav] end of book → next bookId=${move.bookId}`);
          // The final spread may have been reached without a tracked move
          // (opened on it, double page switched on): complete the book first.
          if (totalPages > 0) readProgress.track(totalPages);
          router.replace(`/books/${move.bookId}`);
          break;
        case "end":
          console.debug(`[reader/nav] end of book, no next → end message`);
          if (totalPages > 0) readProgress.track(totalPages);
          setShowEndMessage(true);
          break;
      }
    },
    [book.id, isDoublePage, readProgress, router, shouldShowDoublePage, totalPages]
  );

  const navigateToPage = useCallback(
    (page: number) => {
      const jump = planPageJump(page, pages.length, { isDoublePage, shouldShowDoublePage });
      if (jump.kind === "out-of-bounds") {
        console.warn(
          `[reader/nav] navigate out of bounds page=${jump.page} total=${pages.length}`
        );
        return;
      }
      applyPageMove(jump, currentPage);
    },
    [applyPageMove, currentPage, isDoublePage, pages.length, shouldShowDoublePage]
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
