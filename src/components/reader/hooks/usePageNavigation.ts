/* eslint-disable no-console */
import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { NormalizedBook } from "@/lib/providers/types";
import { updateReadProgress } from "@/app/actions/read-progress";
import { useAnonymous } from "@/contexts/AnonymousContext";

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
  const isAnonymousRef = useRef(isAnonymous);

  const [currentPage, setCurrentPage] = useState(() => {
    const saved = isAnonymous ? 0 : (book.readProgress?.page ?? 0);
    const initial = saved < 1 ? 1 : saved;
    console.debug(`[reader/nav] init bookId=${book.id} savedPage=${saved} startPage=${initial} total=${pages.length}`);
    return initial;
  });
  const [showEndMessage, setShowEndMessage] = useState(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTrackablePageRef = useRef<number | null>(isAnonymous ? null : currentPage);
  // Refs miroir de book/pages.length pour le sync au démontage uniquement.
  // Ne PAS mettre ces valeurs dans les deps du cleanup effect : le sync appelle
  // une server action qui revalide le path, ce qui crée une boucle infinie.
  const bookRef = useRef(book);
  const pagesLengthRef = useRef(pages.length);

  useEffect(() => {
    isAnonymousRef.current = isAnonymous;

    // Une synchronisation déjà programmée avant l'activation du mode anonyme
    // ne doit jamais repartir plus tard (notamment après avoir quitté ce mode).
    if (isAnonymous) {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }
      lastTrackablePageRef.current = null;
    }
  }, [isAnonymous]);

  useEffect(() => {
    bookRef.current = book;
    pagesLengthRef.current = pages.length;
  }, [book, pages.length]);

  // Sync progress — book et totalPages passés en argument pour
  // éviter qu'un debounce/cleanup tardif n'écrive sur un autre livre.
  const syncReadProgress = useCallback(
    async (targetBook: NormalizedBook, totalPages: number, page: number) => {
      console.debug(`[reader/nav] sync bookId=${targetBook.id} page=${page}/${totalPages} anonymous=${isAnonymousRef.current}`);
      if (isAnonymousRef.current) return;
      try {
        const completed = page === totalPages;
        await updateReadProgress(targetBook.id, page, completed, targetBook.seriesId);
      } catch (error) {
        console.error(`[reader/nav] sync error bookId=${targetBook.id} page=${page}`, error);
      }
    },
    []
  );

  const debouncedSync = useCallback(
    (page: number) => {
      // Snapshot au moment du scheduling, pas de l'exécution
      const bookSnapshot = book;
      const totalSnapshot = pages.length;
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      syncTimeoutRef.current = setTimeout(
        () => syncReadProgress(bookSnapshot, totalSnapshot, page),
        500
      );
    },
    [syncReadProgress, book, pages.length]
  );

  const navigateToPage = useCallback(
    (page: number) => {
      if (page >= 1 && page <= pages.length) {
        console.debug(`[reader/nav] navigate ${currentPage} → ${page} bookId=${book.id}`);
        setCurrentPage(page);
        if (!isAnonymousRef.current) {
          lastTrackablePageRef.current = page;
          debouncedSync(page);
        }
      } else {
        console.warn(`[reader/nav] navigate out of bounds page=${page} total=${pages.length}`);
      }
    },
    [currentPage, pages.length, debouncedSync, book]
  );

  const handlePreviousPage = useCallback(() => {
    if (currentPage === 1) return;
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

  // Cleanup — Sync final UNIQUEMENT au démontage du composant.
  // syncReadProgress a des deps vides donc sa ref est stable → l'effet ne ré-exécute
  // pas pendant le cycle de vie. Les refs fournissent les dernières valeurs au moment
  // de l'unmount, sans introduire de boucle de revalidation.
  useEffect(() => {
    return () => {
      const lastTrackablePage = lastTrackablePageRef.current;
      console.debug(`[reader/nav] unmount final sync bookId=${bookRef.current.id} page=${lastTrackablePage ?? "none"}/${pagesLengthRef.current}`);
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }
      if (lastTrackablePage !== null) {
        syncReadProgress(bookRef.current, pagesLengthRef.current, lastTrackablePage);
      }
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
